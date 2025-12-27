import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SendMessageDto } from './dto/messages.dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class MessagesService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * Send a message from teacher to admin or vice versa
   */
  async sendMessage(
    dto: SendMessageDto,
    senderId: string,
    schoolId: string,
  ) {
    // Verify recipient exists and belongs to same school
    const recipient = await this.prisma.profiles.findFirst({
      where: {
        id: dto.recipientId,
        school_id: schoolId,
      },
      select: {
        id: true,
        role_id: true,
        name: true,
      },
    });

    if (!recipient) {
      throw new NotFoundException('Recipient not found');
    }

    // Get sender info for notification type
    const sender = await this.prisma.profiles.findUnique({
      where: { id: senderId },
      select: { role_id: true, name: true },
    });

    // Determine notification type based on sender role
    // role_id: 2 = Admin, 3 = Teacher
    const notificationType =
      sender.role_id === 2 ? 'admin_message' : 'teacher_message';
    const targetUrl =
      sender.role_id === 2 ? '/teacher/communication' : '/admin/messages';

    // Create message as notification
    const message = await this.prisma.notifications.create({
      data: {
        school_id: schoolId,
        recipient_id: dto.recipientId,
        title: dto.subject,
        message: dto.message,
        notification_type: notificationType,
        source_id: senderId,
        target_url: targetUrl,
        is_urgent: dto.isUrgent || false,
        is_read: false,
      },
      include: {
        profiles: {
          select: {
            id: true,
            name: true,
            email: true,
            role_id: true,
          },
        },
      },
    });

    // Invalidate caches
    await this.invalidateMessageCaches(schoolId, senderId, dto.recipientId);

    return {
      id: message.id,
      subject: message.title,
      message: message.message,
      sentAt: message.created_at,
      recipient: {
        id: message.profiles.id,
        name: message.profiles.name,
        email: message.profiles.email,
      },
    };
  }

  /**
   * Get all conversations for a user (grouped by conversation partner)
   */
  async getConversations(userId: string, schoolId: string) {
    const cacheKey = `school:${schoolId}:user:${userId}:conversations`;

    // Try cache first
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Get all messages where user is sender or recipient
    const messages = await this.prisma.notifications.findMany({
      where: {
        school_id: schoolId,
        notification_type: {
          in: ['admin_message', 'teacher_message'],
        },
        OR: [{ recipient_id: userId }, { source_id: userId }],
      },
      orderBy: {
        created_at: 'desc',
      },
      include: {
        profiles: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar_url: true,
            role_id: true,
          },
        },
      },
    });

    // Group messages by conversation partner
    const conversationsMap = new Map();

    for (const msg of messages) {
      // Determine the other person in the conversation
      const otherUserId =
        msg.source_id === userId ? msg.recipient_id : msg.source_id;

      if (!conversationsMap.has(otherUserId)) {
        // Get other user's info
        const otherUser = await this.prisma.profiles.findUnique({
          where: { id: otherUserId },
          select: {
            id: true,
            name: true,
            email: true,
            avatar_url: true,
            role_id: true,
          },
        });

        conversationsMap.set(otherUserId, {
          userId: otherUserId,
          userName: otherUser.name,
          userEmail: otherUser.email,
          userAvatar: otherUser.avatar_url,
          userRole: otherUser.role_id,
          lastMessage: msg.message,
          lastMessageTime: msg.created_at,
          unreadCount: 0,
          messages: [],
        });
      }

      const conversation = conversationsMap.get(otherUserId);
      conversation.messages.push(msg);

      // Count unread messages (where user is recipient and not read)
      if (msg.recipient_id === userId && !msg.is_read) {
        conversation.unreadCount++;
      }
    }

    const conversations = Array.from(conversationsMap.values());

    // Cache for 5 minutes
    await this.cacheManager.set(cacheKey, conversations, 300000);

    return conversations;
  }

  /**
   * Get conversation with a specific user
   */
  async getConversation(
    userId: string,
    otherUserId: string,
    schoolId: string,
  ) {
    const cacheKey = `school:${schoolId}:conversation:${userId}:${otherUserId}`;

    // Try cache first
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Get all messages between these two users
    const messages = await this.prisma.notifications.findMany({
      where: {
        school_id: schoolId,
        notification_type: {
          in: ['admin_message', 'teacher_message'],
        },
        OR: [
          { source_id: userId, recipient_id: otherUserId },
          { source_id: otherUserId, recipient_id: userId },
        ],
      },
      orderBy: {
        created_at: 'asc',
      },
      include: {
        profiles: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar_url: true,
            role_id: true,
          },
        },
      },
    });

    // Get other user info
    const otherUser = await this.prisma.profiles.findUnique({
      where: { id: otherUserId },
      select: {
        id: true,
        name: true,
        email: true,
        avatar_url: true,
        role_id: true,
      },
    });

    const conversation = {
      otherUser,
      messages: messages.map((msg) => ({
        id: msg.id,
        subject: msg.title,
        message: msg.message,
        sentAt: msg.created_at,
        isFromMe: msg.source_id === userId,
        isRead: msg.is_read,
        isUrgent: msg.is_urgent,
      })),
    };

    // Cache for 5 minutes
    await this.cacheManager.set(cacheKey, conversation, 300000);

    return conversation;
  }

  /**
   * Mark message as read
   */
  async markAsRead(messageId: string, userId: string, schoolId: string) {
    // Verify message belongs to user
    const message = await this.prisma.notifications.findFirst({
      where: {
        id: messageId,
        recipient_id: userId,
        school_id: schoolId,
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Update message
    await this.prisma.notifications.update({
      where: { id: messageId },
      data: { is_read: true },
    });

    // Invalidate caches
    await this.invalidateMessageCaches(
      schoolId,
      userId,
      message.source_id,
    );

    return { success: true };
  }

  /**
   * Get unread message count
   */
  async getUnreadCount(userId: string, schoolId: string) {
    const cacheKey = `school:${schoolId}:user:${userId}:unread-count`;

    // Try cache first
    const cached = await this.cacheManager.get(cacheKey);
    if (cached !== null && cached !== undefined) {
      return cached;
    }

    const count = await this.prisma.notifications.count({
      where: {
        school_id: schoolId,
        recipient_id: userId,
        notification_type: {
          in: ['admin_message', 'teacher_message'],
        },
        is_read: false,
      },
    });

    // Cache for 1 minute
    await this.cacheManager.set(cacheKey, count, 60000);

    return count;
  }

  /**
   * Invalidate all message-related caches
   */
  private async invalidateMessageCaches(
    schoolId: string,
    userId1: string,
    userId2: string,
  ) {
    const keysToInvalidate = [
      `school:${schoolId}:user:${userId1}:conversations`,
      `school:${schoolId}:user:${userId2}:conversations`,
      `school:${schoolId}:conversation:${userId1}:${userId2}`,
      `school:${schoolId}:conversation:${userId2}:${userId1}`,
      `school:${schoolId}:user:${userId1}:unread-count`,
      `school:${schoolId}:user:${userId2}:unread-count`,
    ];

    await Promise.all(
      keysToInvalidate.map((key) => this.cacheManager.del(key)),
    );
  }
}
