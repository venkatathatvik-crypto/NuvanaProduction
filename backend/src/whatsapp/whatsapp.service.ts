import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private client: Twilio;

  constructor(private configService: ConfigService) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');

    if (accountSid && authToken) {
      this.client = new Twilio(accountSid, authToken);
    } else {
      this.logger.warn('Twilio credentials not found. WhatsApp features will be disabled.');
    }
  }

  async sendWhatsapp(to: string, body: string) {
    if (!this.client) {
      this.logger.error('Twilio client not initialized');
      return;
    }

    const from = this.configService.get<string>('TWILIO_WHATSAPP_NUMBER') || 'whatsapp:+14155238886';
    
    // Ensure 'to' is in 'whatsapp:+...' format
    const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

    try {
      const message = await this.client.messages.create({
        body,
        from,
        to: formattedTo,
      });
      this.logger.log(`Message sent to ${formattedTo}: ${message.sid}`);
      return message;
    } catch (error) {
      this.logger.error(`Failed to send message to ${formattedTo}: ${error.message}`);
      throw error;
    }
  }
}
