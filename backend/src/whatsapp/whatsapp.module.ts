import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { WhatsappService } from './whatsapp.service';
import { WhatsappProcessor } from './whatsapp.processor';
import { WhatsappController } from './whatsapp.controller';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'whatsapp-broadcast',
    }),
    BullBoardModule.forFeature({
      name: 'whatsapp-broadcast',
      adapter: BullMQAdapter,
    }),
  ],
  providers: [WhatsappService, WhatsappProcessor],
  controllers: [WhatsappController],
  exports: [WhatsappService],
})
export class WhatsappModule {}
