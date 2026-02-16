import { Controller, Post, Get, Body, Query, Param } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { ConfigService } from '@nestjs/config';
import { UseCase } from './whatsapp.types';

@Controller('whatsapp')
export class WhatsappController {
  constructor(
    private whatsappService: WhatsappService,
    private configService: ConfigService,
  ) {}

  /**
   * Unified endpoint to send a template-based message
   */
  @Post('send')
  async send(@Body() body: {
    useCase: UseCase;
    data: any;
    phoneNumber?: string;
    recipients?: { phoneNumber: string; recipientId?: string }[];
    senderId: string;
    schoolId: string;
  }) {
    console.log('--- WhatsApp Unified Send Request Received ---');
    console.log('Body:', JSON.stringify(body, null, 2));

    try {
      const result = await this.whatsappService.queueUnified({
        useCase: body.useCase,
        data: body.data,
        phoneNumber: body.phoneNumber,
        recipients: body.recipients,
        senderId: body.senderId,
        schoolId: body.schoolId,
      });
      console.log('Result:', JSON.stringify(result));
      return result;
    } catch (error) {
      console.error('Error in WhatsApp unified send controller:', error);
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

  @Get('history')
  async getHistory(@Query('schoolId') schoolId: string, @Query('limit') limit?: string) {
    return this.whatsappService.getHistory(schoolId || 'test-school', limit ? parseInt(limit) : 50);
  }
}
