import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNotificationDto, CreateBatchNotificationDto } from './dto';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async createNotification(dto: CreateNotificationDto, schoolId: string) {
    // Verify recipient exists and belongs to school
    const recipient = await this.prisma.profiles.findFirst({
      where: {
        id: dto.recipient_id,
        school_id: schoolId,
      },
    });

    if (!recipient) {
      throw new NotFoundException('Recipient not found');
    }

    const notification = await this.prisma.notifications.create({
      data: {
        recipient_id: dto.recipient_id,
        school_id: schoolId,
        title: dto.title,
        message: dto.message,
        notification_type: dto.notification_type || null,
        source_id: dto.source_id || null,
        target_url: dto.target_url || null,
        is_urgent: dto.is_urgent || false,
        is_read: false,
      },
    });

    return {
      id: notification.id,
      recipient_id: notification.recipient_id,
      school_id: notification.school_id,
      title: notification.title,
      message: notification.message,
      notification_type: notification.notification_type,
      source_id: notification.source_id,
      target_url: notification.target_url,
      is_read: notification.is_read,
      is_urgent: notification.is_urgent,
      created_at: notification.created_at,
    };
  }

  async createBatchNotifications(dto: CreateBatchNotificationDto, schoolId: string) {
    if (dto.recipient_ids.length === 0) {
      return { count: 0 };
    }

    // Verify all recipients exist and belong to school
    const recipients = await this.prisma.profiles.findMany({
      where: {
        id: { in: dto.recipient_ids },
        school_id: schoolId,
      },
      select: { id: true },
    });

    const validRecipientIds = recipients.map((r) => r.id);
    const invalidIds = dto.recipient_ids.filter((id) => !validRecipientIds.includes(id));

    if (invalidIds.length > 0) {
      console.warn(`Invalid recipient IDs: ${invalidIds.join(', ')}`);
    }

    if (validRecipientIds.length === 0) {
      return { count: 0 };
    }

    const notifications = validRecipientIds.map((recipientId) => ({
      recipient_id: recipientId,
      school_id: schoolId,
      title: dto.title,
      message: dto.message,
      notification_type: dto.notification_type || null,
      source_id: dto.source_id || null,
      target_url: dto.target_url || null,
      is_urgent: dto.is_urgent || false,
      is_read: false,
    }));

    const result = await this.prisma.notifications.createMany({
      data: notifications,
    });

    return { count: result.count };
  }

  async getNotifications(recipientId: string, schoolId: string, limit: number = 20) {
    // Verify recipient belongs to school
    const recipient = await this.prisma.profiles.findFirst({
      where: {
        id: recipientId,
        school_id: schoolId,
      },
    });

    if (!recipient) {
      throw new NotFoundException('Recipient not found');
    }

    const notifications = await this.prisma.notifications.findMany({
      where: {
        recipient_id: recipientId,
        school_id: schoolId,
      },
      orderBy: {
        created_at: 'desc',
      },
      take: limit,
    });

    return notifications.map((n) => ({
      id: n.id,
      recipient_id: n.recipient_id,
      school_id: n.school_id,
      title: n.title,
      message: n.message,
      notification_type: n.notification_type,
      source_id: n.source_id,
      target_url: n.target_url,
      is_read: n.is_read,
      is_urgent: n.is_urgent,
      created_at: n.created_at,
    }));
  }

  async getUnreadCount(recipientId: string, schoolId: string) {
    // Verify recipient belongs to school
    const recipient = await this.prisma.profiles.findFirst({
      where: {
        id: recipientId,
        school_id: schoolId,
      },
    });

    if (!recipient) {
      throw new NotFoundException('Recipient not found');
    }

    const count = await this.prisma.notifications.count({
      where: {
        recipient_id: recipientId,
        school_id: schoolId,
        is_read: false,
      },
    });

    return { count };
  }

  async markAsRead(notificationId: string, recipientId: string, schoolId: string) {
    // Verify notification belongs to recipient and school
    const notification = await this.prisma.notifications.findFirst({
      where: {
        id: notificationId,
        recipient_id: recipientId,
        school_id: schoolId,
      },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    await this.prisma.notifications.update({
      where: { id: notificationId },
      data: { is_read: true },
    });

    return { message: 'Notification marked as read' };
  }

  async markAllAsRead(recipientId: string, schoolId: string) {
    // Verify recipient belongs to school
    const recipient = await this.prisma.profiles.findFirst({
      where: {
        id: recipientId,
        school_id: schoolId,
      },
    });

    if (!recipient) {
      throw new NotFoundException('Recipient not found');
    }

    const result = await this.prisma.notifications.updateMany({
      where: {
        recipient_id: recipientId,
        school_id: schoolId,
        is_read: false,
      },
      data: {
        is_read: true,
      },
    });

    return { count: result.count };
  }

  async getStudentIdsInClass(classId: string, schoolId: string) {
    const students = await this.prisma.profiles.findMany({
      where: {
        student_details: {
          class_id: classId,
        },
        school_id: schoolId,
        role_id: 4, // Student role
      },
      select: {
        id: true,
      },
    });

    return students.map((s) => s.id);
  }
}

