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
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
        break;
    }
  }

  private async handleSendTemplate(job: Job<any>) {
    const { phoneNumber, templateName, languageCode, components, senderId, schoolId } = job.data;

    try {
      this.logger.log(`[Job ${job.id}] Sending WhatsApp template "${templateName}" to ${phoneNumber}`);
      
      const result = await this.whatsappService.sendTemplateMessage({
        phoneNumber,
        templateName,
        languageCode,
        components,
        senderId,
        schoolId,
      });

      this.logger.log(`[Job ${job.id}] Successfully sent template to ${phoneNumber}`);
      return result;
    } catch (error) {
      const attempt = job.attemptsMade + 1;
      this.logger.error(`[Job ${job.id}] Attempt ${attempt} failed for ${phoneNumber}: ${error.message}`);
      throw error;
    }
  }
}
