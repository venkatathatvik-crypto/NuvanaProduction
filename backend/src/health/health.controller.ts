import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { RagService } from '../ai/rag/rag.service';

@Controller('health')
export class HealthController {
  constructor(
    private prisma: PrismaService,
    private ragService: RagService,
  ) {}

  @Public()
  @Get()
  async check() {
    const dbHealthy = await this.prisma.healthCheck();
    const ragHealthy = await this.ragService.healthCheck();
    
    return {
      status: dbHealthy && ragHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealthy ? 'operational' : 'down',
        rag: ragHealthy ? 'operational' : 'down',
        api: 'operational',
      },
    };
  }

  @Public()
  @Get('ping')
  ping() {
    return { 
      message: 'pong', 
      timestamp: new Date().toISOString() 
    };
  }
}
