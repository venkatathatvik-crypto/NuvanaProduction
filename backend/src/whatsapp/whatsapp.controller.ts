import { Controller, Post, Get, Body, Query, HttpCode, HttpStatus, Param } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { ConfigService } from '@nestjs/config';
import { Public } from '../auth/decorators/public.decorator';

@Public()
@Controller('whatsapp')
export class WhatsappController {
  constructor(
    private whatsappService: WhatsappService,
    private configService: ConfigService,
  ) {}

  /**
   * Endpoint to trigger a broadcast
   */
  @Post('broadcast')
  async broadcast(@Body() body: any) {
    console.log('--- WhatsApp Broadcast Request Received ---');
    console.log('Body:', JSON.stringify(body, null, 2));

    try {
      const result = await this.whatsappService.queueBroadcast({
        recipients: body.recipients || [],
        templateName: body.templateName,
        languageCode: body.languageCode,
        components: body.components,
        message: body.message,
        messageType: body.messageType,
        senderId: body.senderId,
        schoolId: body.schoolId,
      });
      console.log('Result:', JSON.stringify(result));
      return result;
    } catch (error) {
      console.error('Error in WhatsApp broadcast controller:', error);
      throw error;
    }
  }

  /**
   * Endpoint to send a plain text message
   */
  @Post('send-text')
  async sendText(@Body() body: {
    phoneNumber: string;
    message: string;
    senderId?: string;
    schoolId?: string;
  }) {
    console.log('--- WhatsApp Plain Text Request Received ---');
    console.log('Body:', JSON.stringify(body, null, 2));

    try {
      const result = await this.whatsappService.queueTextMessage({
        phoneNumber: body.phoneNumber,
        message: body.message,
        senderId: body.senderId,
        schoolId: body.schoolId,
      });
      console.log('Result:', JSON.stringify(result));
      return result;
    } catch (error) {
      console.error('Error in WhatsApp send-text controller:', error);
      throw error;
    }
  }
  @Get('recipients/class/:classId')
  async getClassRecipients(@Param('classId') classId: string) {
    return this.whatsappService.getClassRecipients(classId);
  }

  /**
   * Get eligible recipient for a specific student
   */
  @Get('recipients/student/:studentId')
  async getStudentRecipient(@Param('studentId') studentId: string) {
    return this.whatsappService.getStudentRecipient(studentId);
  }

  /**
   * Get history of messages
   */
  @Get('history')
  async getHistory(@Query('schoolId') schoolId: string, @Query('limit') limit?: string) {
    return this.whatsappService.getHistory(schoolId || 'test-school', limit ? parseInt(limit) : 50);
  }

  /**
   * Webhook Verification (for Meta)
   */
  @Get('webhook')
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ) {
    const verifyToken = this.configService.get<string>('WHATSAPP_VERIFY_TOKEN');

    if (mode === 'subscribe' && token === verifyToken) {
      return challenge;
    }
    return 'Verification failed';
  }

  /**
   * Webhook handling (status updates and messages)
   */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() body: any) {
    // Meta sends updates in this format: entry[].changes[].value.statuses[]
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (value?.statuses) {
      for (const statusUpdate of value.statuses) {
        await this.whatsappService.updateMessageStatus(
          statusUpdate.id,
          statusUpdate.status,
        );
      }
    }

    // Always return 200 to Meta
    return { success: true };
  }
}
