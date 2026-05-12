import { Module } from '@nestjs/common';
import { EngagementService } from './engagement.service';
import { EngagementGateway } from './engagement.gateway';
import { EngagementController } from './engagement.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [EngagementController],
  providers: [EngagementService, EngagementGateway],
  exports: [EngagementService],
})
export class EngagementModule {}
