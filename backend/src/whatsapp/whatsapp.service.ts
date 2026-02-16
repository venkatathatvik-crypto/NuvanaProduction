import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { UseCase, TemplateDataMap } from './whatsapp.types';
import { WHATSAPP_REGISTRY } from './whatsapp.registry';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly baseUrl = 'https://graph.facebook.com/v21.0';

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    @InjectQueue('whatsapp-broadcast') private broadcastQueue: Queue,
  ) {}

  /**
   * Normalizes phone number to include country code
   */
  private normalizePhoneNumber(phone: any): string {
    if (!phone || typeof phone !== 'string') return '';
    
    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Remove leading zero if present
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }
    
    // If it's a 10 digit number, add 91 (India) prefix
    if (cleaned.length === 10) {
      return `91${cleaned}`;
    }
    
    return cleaned;
  }

  /**
   * Queue a broadcast to multiple recipients
   */
  async queueBroadcast(data: {
    recipients: { phoneNumber: string; recipientId?: string; data?: any }[];
    templateName: string;
    languageCode: string;
    components?: any[];
    useCase?: UseCase;
    baseData?: any;
    senderId: string;
    schoolId: string;
  }) {
    this.logger.log(`Queueing template broadcast for ${data.recipients.length} recipients`);
    const jobIds: string[] = [];

    const registryEntry = data.useCase ? WHATSAPP_REGISTRY[data.useCase] : null;

    for (const recipient of data.recipients) {
      const normalizedPhone = this.normalizePhoneNumber(recipient.phoneNumber);
      this.logger.debug(`Adding template job for ${normalizedPhone}`);
      
      // Build components: either pre-built or per-recipient
      let components = data.components;
      if (registryEntry && (data.baseData || recipient.data)) {
        const mergedData = { ...data.baseData, ...(recipient.data || {}) };
        components = registryEntry.build(mergedData);
      }

      const job = await this.broadcastQueue.add(
        'send-template',
        {
          phoneNumber: normalizedPhone,
          templateName: data.templateName,
          languageCode: data.languageCode,
          components,
          recipientId: recipient.recipientId,
          senderId: data.senderId,
          schoolId: data.schoolId,
        },
        {
          jobId: `wa-${uuidv4()}`,
          removeOnComplete: { count: 100 },
          removeOnFail: { count: 500 },
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
        },
      );
      jobIds.push(job.id!);
      
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    this.logger.log(`Successfully queued ${jobIds.length} jobs`);
    return { success: true, count: data.recipients.length, jobIds };
  }

  /**
   * Unified method to send a message (Individual or Broadcast) using a Template Use Case
   */
  async queueUnified<T extends UseCase>(data: {
    useCase: T;
    data: TemplateDataMap[T];
    phoneNumber?: string;
    recipients?: { phoneNumber: string; recipientId?: string; data?: any }[];
    senderId: string;
    schoolId: string;
  }) {
    // 1. Fetch template from DB
    const templateRow = await this.prisma.whatsapp_templates.findFirst({
      where: { template_name: data.useCase as string, is_active: true },
    });

    if (!templateRow) {
      throw new Error(`WhatsApp template mapping for template name "${data.useCase}" not found or inactive`);
    }

    // 2. Determine recipients
    const recipients = data.phoneNumber 
      ? [{ phoneNumber: data.phoneNumber, data: data.data }] 
      : (data.recipients || []);

    if (recipients.length === 0) {
      throw new Error('No recipients provided for WhatsApp message');
    }

    // 3. Queue jobs (Passing useCase and baseData for per-recipient building)
    return this.queueBroadcast({
      recipients,
      templateName: templateRow.template_name,
      languageCode: templateRow.language_code || 'en_US',
      useCase: data.useCase,
      baseData: data.data,
      senderId: data.senderId,
      schoolId: data.schoolId,
    });
  }

  /**
   * Send a template message via Meta API
   * (Mainly called by the Processor)
   */
  async sendTemplateMessage(data: {
    phoneNumber: string;
    templateName: string;
    languageCode: string;
    components?: any[];
    senderId?: string;
    schoolId?: string;
  }) {
    const accessToken = this.configService.get<string>('WHATSAPP_ACCESS_TOKEN');
    const phoneNumberId = this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID');

    if (!accessToken || !phoneNumberId) {
      throw new Error('WhatsApp configuration missing');
    }

    const url = `${this.baseUrl}/${phoneNumberId}/messages`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    // Create a log entry first
    const messageLog = await this.prisma.whatsapp_messages.create({
      data: {
        phone_number: data.phoneNumber,
        message_text: `Template: ${data.templateName}`,
        sender_id: data.senderId,
        school_id: data.schoolId,
        direction: 'OUTGOING',
        status: 'SENT', // We keep SENT as initial "queued for delivery" status
        metadata: { template: data.templateName, language: data.languageCode },
      },
    });

    const requestBody = {
      messaging_product: 'whatsapp',
      to: data.phoneNumber,
      type: 'template',
      template: {
        name: data.templateName,
        language: {
          code: data.languageCode,
        },
        components: data.components || [],
      },
    };

    this.logger.debug(`[Job ${messageLog.id}] Requesting Meta API: ${JSON.stringify(requestBody)}`);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify(requestBody),
      });

      let result;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        result = await response.json();
      } else {
        const text = await response.text();
        this.logger.error(`[Job ${messageLog.id}] Non-JSON response from Meta: ${text}`);
        throw new Error(`Invalid response from Meta API: ${text.substring(0, 100)}`);
      }

      this.logger.log(`[Job ${messageLog.id}] WhatsApp response (Status ${response.status}): ${JSON.stringify(result)}`);
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorMessage = result.error?.message || `Failed to send WhatsApp message (Status: ${response.status})`;
        throw new Error(errorMessage);
      }

      // Update log with Meta's message ID
      await this.prisma.whatsapp_messages.update({
        where: { id: messageLog.id },
        data: {
          wa_message_id: result.messages?.[0]?.id,
          status: 'SENT',
        },
      });

      return result;
    } catch (error) {
      this.logger.error(`Error sending WhatsApp message: ${error.message}`);
      
      await this.prisma.whatsapp_messages.update({
        where: { id: messageLog.id },
        data: {
          status: 'FAILED',
          metadata: { 
            ...(messageLog.metadata as any || {}), 
            error: error.message 
          },
        },
      });
      
      throw error;
    }
  }

  /**
   * Get all parent contacts for a class
   */
  async getClassRecipients(classId: string) {
    const students = await this.prisma.student_details.findMany({
      where: { class_id: classId },
      select: {
        profile_id: true,
        parent_contact: true,
        profiles: {
          select: {
            name: true,
          }
        }
      }
    });

    this.logger.log(`Found ${students.length} students in class ${classId}`);
    
    const recipients = students
      .filter(s => {
        if (!s.parent_contact) {
            this.logger.warn(`Student ${s.profiles?.name} (${s.profile_id}) is missing parent_contact`);
            return false;
        }
        return true;
      })
      .map(s => ({
        phoneNumber: this.normalizePhoneNumber(s.parent_contact),
        recipientId: s.profile_id,
        studentName: s.profiles?.name || 'Student',
      }));

    this.logger.log(`Returning ${recipients.length} valid recipients for class ${classId}`);
    return recipients;
  }

  /**
   * Get parent contact for a specific student
   */
  async getStudentRecipient(studentId: string) {
    const student = await this.prisma.student_details.findUnique({
      where: { profile_id: studentId },
      select: {
        profile_id: true,
        parent_contact: true,
        profiles: {
          select: {
            name: true,
          }
        }
      }
    });

    if (!student) {
        this.logger.warn(`Student with profile_id ${studentId} not found`);
        return null;
    }

    if (!student.parent_contact) {
        this.logger.warn(`Student ${student.profiles?.name} (${studentId}) is missing parent_contact`);
        return null;
    }

    const normalized = this.normalizePhoneNumber(student.parent_contact);
    this.logger.log(`Found recipient for student ${student.profiles?.name}: ${normalized}`);

    return {
      phoneNumber: normalized,
      recipientId: student.profile_id,
      studentName: student.profiles?.name || 'Student',
    };
  }

  /**
   * Get message history for a school/sender
   */
  async getHistory(schoolId: string, limit = 50) {
    return this.prisma.whatsapp_messages.findMany({
      where: { school_id: schoolId },
      orderBy: { created_at: 'desc' },
      take: limit,
      include: {
        profiles: {
          select: {
            name: true,
          }
        }
      }
    });
  }
}
