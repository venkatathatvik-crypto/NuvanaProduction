import { Controller, Post, Body, Logger, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Public } from '../auth/decorators/public.decorator';
import { BroadcastWhatsappDto } from './dto/broadcast.dto';
import { PrismaService } from '../prisma/prisma.service';

@Controller('whatsapp')
export class WhatsappController {
  private readonly logger = new Logger(WhatsappController.name);

  constructor(
    @InjectQueue('whatsapp-broadcast') private readonly whatsappQueue: Queue,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Post('broadcast')
  async broadcast(@Body() dto: BroadcastWhatsappDto) {
    const { message, classId, schoolId, to } = dto;

    // 1. Logic for individual testing (via Postman)
    if (to) {
      this.logger.log(`Enqueuing individual test message to ${to}`);
      await this.whatsappQueue.add('send-message', {
        to,
        message,
      });
      return { status: 'queued', type: 'individual', recipient: to };
    }

    // 2. Logic for class-based broadcasting
    if (!classId || !schoolId) {
      throw new BadRequestException('Either "to" number OR "classId" and "schoolId" must be provided');
    }

    this.logger.log(`Fetching students for class ${classId} in school ${schoolId}`);
    
    // Find all students in the class who have parent contact numbers
    const students = await this.prisma.profiles.findMany({
      where: {
        school_id: schoolId,
        role_id: 4, // Student role
        student_details: {
          class_id: classId,
        },
      },
      select: {
        id: true,
        name: true,
        student_details: {
          select: {
            parent_contact: true,
          },
        },
      },
    });

    const recipients = students
      .filter(s => s.student_details?.parent_contact)
      .map(s => s.student_details.parent_contact);

    if (recipients.length === 0) {
      return { status: 'skipped', message: 'No recipients found with valid contact numbers' };
    }

    this.logger.log(`Enqueuing broadcast for ${recipients.length} recipients`);

    // Add each recipient as a separate job in the queue
    const jobs = recipients.map(number => ({
      name: 'send-message',
      data: { to: number, message },
      opts: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    }));

    await this.whatsappQueue.addBulk(jobs);

    return { 
      status: 'queued', 
      type: 'broadcast', 
      totalRecipients: recipients.length,
      classId 
    };
  }
}
