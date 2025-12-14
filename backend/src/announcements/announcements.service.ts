import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
  AnnouncementResponseDto,
  StudentAnnouncementResponseDto,
} from './dto';

@Injectable()
export class AnnouncementsService {
  constructor(private prisma: PrismaService) {}

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
}
