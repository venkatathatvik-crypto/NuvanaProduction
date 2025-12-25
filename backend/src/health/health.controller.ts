import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Public()
  @Get()
  async check() {
    const dbHealthy = await this.prisma.healthCheck();
    
    return {
      status: dbHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealthy ? 'operational' : 'down',
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
