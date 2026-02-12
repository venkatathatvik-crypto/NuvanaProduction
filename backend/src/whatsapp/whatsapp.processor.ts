import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { WhatsappService } from './whatsapp.service';

@Processor('whatsapp-broadcast', { concurrency: 5 })
export class WhatsappProcessor extends WorkerHost {
  private readonly logger = new Logger(WhatsappProcessor.name);

  constructor(private whatsappService: WhatsappService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing job ${job.id} of type ${job.name}`);

    switch (job.name) {
      case 'send-template':
        return this.handleSendTemplate(job);
      case 'send-text':
        return this.handleSendText(job);
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
        break;
    }
  }

  private async handleSendTemplate(job: Job<any>) {
    const { phoneNumber, templateName, languageCode, components, senderId, schoolId } = job.data;

    try {
      this.logger.log(`Sending WhatsApp broadcast to ${phoneNumber}`);
      
      const result = await this.whatsappService.sendTemplateMessage({
        phoneNumber,
        templateName,
        languageCode,
        components,
        senderId,
        schoolId,
      });

      this.logger.log(`Successfully processed job ${job.id} for ${phoneNumber}`);
      return result;
    } catch (error) {
      this.logger.error(`Job ${job.id} for ${phoneNumber} failed: ${error.message}`);
      throw error;
    }
  }

  private async handleSendText(job: Job<any>) {
    const { phoneNumber, message, senderId, schoolId } = job.data;

    try {
      this.logger.log(`Sending plain text WhatsApp message to ${phoneNumber}`);
      
      const result = await this.whatsappService.sendTextMessage({
        phoneNumber,
        message,
        senderId,
        schoolId,
      });

      this.logger.log(`Successfully processed text job ${job.id} for ${phoneNumber}`);
      return result;
    } catch (error) {
      this.logger.error(`Text job ${job.id} for ${phoneNumber} failed: ${error.message}`);
      throw error;
    }
  }
}
