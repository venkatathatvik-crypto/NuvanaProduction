import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
  AnnouncementResponseDto,
  StudentAnnouncementResponseDto,
} from './dto';
import { MailService } from '../mail/mail.service';
import { Logger } from '@nestjs/common';

@Injectable()
export class AnnouncementsService {
  private readonly logger = new Logger(AnnouncementsService.name);

  constructor(
    private prisma: PrismaService,
    private mailService: MailService
  ) {}

  async createAnnouncement(
    dto: CreateAnnouncementDto,
    schoolId: string,
  ): Promise<AnnouncementResponseDto> {
    // Create the announcement
    const announcement = await this.prisma.announcements.create({
      data: {
        title: dto.title,
        message: dto.message,
        is_urgent: dto.isUrgent ?? false,
        teacher_id: dto.teacherId,
        school_id: schoolId,
      },
    });

    // Link announcement to classes
    if (dto.classIds && dto.classIds.length > 0) {
      await this.prisma.announcement_classes.createMany({
        data: dto.classIds.map((classId) => ({
          announcement_id: announcement.id,
          class_id: classId,
        })),
      });
    }

    // Send Bulk Email if it is marked as urgent
    if (dto.isUrgent) {
      this.dispatchUrgentAnnouncementEmails(announcement, dto.classIds, schoolId).catch(e => {
        this.logger.error(`Error dispatching announcement emails: ${e.message}`, e.stack);
      });
    }

    // Fetch the complete announcement with classes
    return this.getAnnouncementById(announcement.id, schoolId);
  }

  async getTeacherAnnouncements(
    teacherId: string,
    schoolId: string,
  ): Promise<AnnouncementResponseDto[]> {
    const announcements = await this.prisma.announcements.findMany({
      where: {
        teacher_id: teacherId,
        school_id: schoolId,
      },
      include: {
        announcement_classes: {
          include: {
            classes: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return announcements.map((announcement) => ({
      id: announcement.id,
      title: announcement.title,
      message: announcement.message,
      isUrgent: announcement.is_urgent ?? false,
      createdAt: announcement.created_at ?? new Date(),
      classes: announcement.announcement_classes.map((ac) => ({
        class_id: ac.class_id,
        class_name: ac.classes.name,
      })),
      views: 0,
    }));
  }

  async getStudentAnnouncements(
    classId: string,
    schoolId: string,
  ): Promise<StudentAnnouncementResponseDto[]> {
    const announcementClasses = await this.prisma.announcement_classes.findMany({
      where: {
        class_id: classId,
        announcements: {
          school_id: schoolId,
        },
      },
      include: {
        announcements: true,
        classes: true,
      },
      orderBy: {
        announcements: {
          created_at: 'desc',
        },
      },
    });

    return announcementClasses.map((ac) => ({
      id: ac.announcements.id,
      title: ac.announcements.title,
      message: ac.announcements.message,
      isUrgent: ac.announcements.is_urgent ?? false,
      createdAt: ac.announcements.created_at ?? new Date(),
      class_name: ac.classes.name,
    }));
  }

  async getAnnouncementById(
    id: string,
    schoolId: string,
  ): Promise<AnnouncementResponseDto> {
    const announcement = await this.prisma.announcements.findFirst({
      where: {
        id,
        school_id: schoolId,
      },
      include: {
        announcement_classes: {
          include: {
            classes: true,
          },
        },
      },
    });

    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }

    return {
      id: announcement.id,
      title: announcement.title,
      message: announcement.message,
      isUrgent: announcement.is_urgent ?? false,
      createdAt: announcement.created_at ?? new Date(),
      classes: announcement.announcement_classes.map((ac) => ({
        class_id: ac.class_id,
        class_name: ac.classes.name,
      })),
      views: 0,
    };
  }

  async updateAnnouncement(
    id: string,
    dto: UpdateAnnouncementDto,
    schoolId: string,
  ): Promise<AnnouncementResponseDto> {
    // Verify announcement exists and belongs to school
    await this.getAnnouncementById(id, schoolId);

    await this.prisma.announcements.update({
      where: { id },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.message && { message: dto.message }),
        ...(dto.isUrgent !== undefined && { is_urgent: dto.isUrgent }),
      },
    });

    return this.getAnnouncementById(id, schoolId);
  }

  async deleteAnnouncement(id: string, schoolId: string): Promise<void> {
    // Verify announcement exists and belongs to school
    await this.getAnnouncementById(id, schoolId);

    // Delete announcement (cascade will handle announcement_classes)
    await this.prisma.announcements.delete({
      where: { id },
    });
  }

  private async dispatchUrgentAnnouncementEmails(announcement: any, classIds: string[] | undefined, schoolId: string) {
    try {
      // Get the creator
      const creator = await this.prisma.profiles.findUnique({ where: { id: announcement.teacher_id } });
      const creatorName = creator ? creator.name : 'School Administration';

      const announcementDetails = {
        title: announcement.title,
        content: announcement.message,
        createdBy: creatorName,
      };

      let audience = [];

      if (classIds && classIds.length > 0) {
        // Fetch specific students
        audience = await this.prisma.profiles.findMany({
          where: {
            role_id: 4,
            school_id: schoolId,
            student_details: { class_id: { in: classIds } }
          },
          select: { email: true, name: true }
        });
      } else {
        // School-wide: fetch everyone (students & teachers)
        audience = await this.prisma.profiles.findMany({
          where: {
            school_id: schoolId,
            role_id: { in: [3, 4] } // Teachers & Students
          },
          select: { email: true, name: true }
        });
      }

      // Fan out emails asynchronously
      for (const user of audience) {
        if (user.email) {
          await this.mailService.sendAnnouncementEmail(user, announcementDetails);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to dispatch announcement emails`, error.stack);
    }
  }
}
