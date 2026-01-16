import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { RagModule } from '../ai/rag/rag.module';

@Module({
  imports: [PrismaModule, RagModule],
  controllers: [HealthController],
})
export class HealthModule {}
