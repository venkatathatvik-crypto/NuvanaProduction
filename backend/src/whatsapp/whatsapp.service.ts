import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';

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
    recipients: { phoneNumber: string; recipientId?: string }[];
    templateName: string;
    languageCode: string;
    components?: any[];
    senderId: string;
    schoolId: string;
  }) {
    this.logger.log(`Queueing broadcast for ${data.recipients.length} recipients`);
    const jobIds: string[] = [];

    for (const recipient of data.recipients) {
      const normalizedPhone = this.normalizePhoneNumber(recipient.phoneNumber);
      this.logger.debug(`Adding job for ${normalizedPhone}`);
      
      const job = await this.broadcastQueue.add(
        'send-template',
        {
          phoneNumber: normalizedPhone,
          templateName: data.templateName,
          languageCode: data.languageCode,
          components: data.components,
          recipientId: recipient.recipientId,
          senderId: data.senderId,
          schoolId: data.schoolId,
        },
        {
          jobId: `wa-${Date.now()}-${normalizedPhone}`,
          removeOnComplete: true,
          removeOnFail: false,
        },
      );
      jobIds.push(job.id!);
      
      // Small delay between adding jobs to prevent potential bursts
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    this.logger.log(`Successfully queued ${jobIds.length} jobs`);
    return { success: true, count: data.recipients.length, jobIds };
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
        status: 'SENT',
        metadata: { template: data.templateName, language: data.languageCode },
      },
    });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
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
        }),
      });

      const result = await response.json();
      this.logger.log(`WhatsApp template message sent successfully for ${data.phoneNumber}`);
      this.logger.log(`Response : ${JSON.stringify(result, null, 2)}`);
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to send WhatsApp message');
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
   * Queue a plain text message
   */
  async queueTextMessage(data: {
    phoneNumber: string;
    message: string;
    senderId?: string;
    schoolId?: string;
  }) {
    const normalizedPhone = this.normalizePhoneNumber(data.phoneNumber);
    this.logger.log(`Queueing plain text message for ${normalizedPhone}`);
    
    const job = await this.broadcastQueue.add(
      'send-text',
      {
        phoneNumber: normalizedPhone,
        message: data.message,
        senderId: data.senderId || 'test-sender',
        schoolId: data.schoolId || 'test-school',
      },
      {
        jobId: `wa-text-${Date.now()}-${normalizedPhone}`,
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    return { success: true, jobId: job.id };
  }

  /**
   * Send a plain text message via Meta API
   */
  async sendTextMessage(data: {
    phoneNumber: string;
    message: string;
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

    const messageLog = await this.prisma.whatsapp_messages.create({
      data: {
        phone_number: data.phoneNumber,
        message_text: data.message,
        sender_id: data.senderId,
        school_id: data.schoolId,
        direction: 'OUTGOING',
        status: 'SENT',
        metadata: { type: 'text' },
      },
    });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: data.phoneNumber,
          type: 'text',
          text: {
            preview_url: false,
            body: data.message,
          },
        }),
      });

      const result = await response.json();
      this.logger.log(`WhatsApp text message sent successfully for ${data.phoneNumber}`);
      this.logger.log(`Response : ${JSON.stringify(result, null, 2)}`);
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to send WhatsApp message');
      }

      await this.prisma.whatsapp_messages.update({
        where: { id: messageLog.id },
        data: {
          wa_message_id: result.messages?.[0]?.id,
          status: 'SENT',
        },
      });

      return result;
    } catch (error) {
      this.logger.error(`Error sending WhatsApp text message: ${error.message}`);
      
      await this.prisma.whatsapp_messages.update({
        where: { id: messageLog.id },
        data: {
          status: 'FAILED',
          metadata: { error: error.message, type: 'text' },
        },
      });
      
      throw error;
    }
  }

  /**
   * Update message status from Webhook
   */
  async updateMessageStatus(waMessageId: string, status: any) {
    // Map Meta status to our internal enum if needed
    // Meta statuses: sent, delivered, read, failed
    const statusMap: Record<string, any> = {
      'sent': 'SENT',
      'delivered': 'DELIVERED',
      'read': 'READ',
      'failed': 'FAILED',
    };

    const newStatus = statusMap[status] || 'SENT';

    return this.prisma.whatsapp_messages.updateMany({
      where: { wa_message_id: waMessageId },
      data: {
        status: newStatus,
        updated_at: new Date(),
      },
    });
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
