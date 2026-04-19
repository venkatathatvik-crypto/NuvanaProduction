// Notification service for creating and managing notifications
import { apiClient } from "@/lib/apiClient";
import { logger } from '@/lib/logger';

export interface Notification {
  id: string;
  recipient_id: string;
  school_id: string;
  title: string;
  message: string;
  notification_type: string;
  source_id?: string;
  target_url?: string;
  is_read: boolean;
  is_urgent: boolean;
  created_at: string;
}

export interface CreateNotificationParams {
  recipient_id: string;
  school_id: string;
  title: string;
  message: string;
  notification_type: "attendance" | "file" | "test" | "announcement" | "grade" | "submission";
  source_id?: string;
  target_url?: string;
  is_urgent?: boolean;
}

// Create a single notification
export const createNotification = async (
  params: CreateNotificationParams
): Promise<void> => {
  try {
    await apiClient.post('/notifications', {
      recipient_id: params.recipient_id,
      title: params.title,
      message: params.message,
      notification_type: params.notification_type,
      source_id: params.source_id,
      target_url: params.target_url,
      is_urgent: params.is_urgent || false,
    });
  } catch (error) {
    logger.error("Error creating notification:", error);
    throw new Error("Failed to create notification");
  }
};

// Create notifications for multiple recipients (batch)
export const createNotificationsForClass = async (
  recipientIds: string[],
  params: Omit<CreateNotificationParams, "recipient_id">
): Promise<void> => {
  if (recipientIds.length === 0) return;

  try {
    await apiClient.post('/notifications/batch', {
      recipient_ids: recipientIds,
      title: params.title,
      message: params.message,
      notification_type: params.notification_type,
      source_id: params.source_id,
      target_url: params.target_url,
      is_urgent: params.is_urgent || false,
    });
  } catch (error) {
    logger.error("Error creating batch notifications:", error);
    // Don't throw - notifications should not block main actions
  }
};

// Get notifications for a user
export const getNotifications = async (
  recipientId: string,
  limit: number = 20
): Promise<Notification[]> => {
  try {
    const notifications = await apiClient.get(`/notifications/recipient/${recipientId}?limit=${limit}`);
    return notifications || [];
  } catch (error) {
    logger.error("Error fetching notifications:", error);
    return [];
  }
};

// Get unread notification count
export const getUnreadNotificationCount = async (
  recipientId: string
): Promise<number> => {
  try {
    const result = await apiClient.get(`/notifications/recipient/${recipientId}/unread-count`);
    return result.count || 0;
  } catch (error) {
    logger.error("Error fetching unread count:", error);
    return 0;
  }
};

// Mark a single notification as read
export const markNotificationAsRead = async (
  notificationId: string,
  recipientId: string
): Promise<void> => {
  try {
    await apiClient.patch(`/notifications/${notificationId}/read/recipient/${recipientId}`);
  } catch (error) {
    logger.error("Error marking notification as read:", error);
  }
};

// Mark all notifications as read for a user
export const markAllNotificationsAsRead = async (
  recipientId: string
): Promise<void> => {
  try {
    await apiClient.patch(`/notifications/recipient/${recipientId}/read-all`);
  } catch (error) {
    logger.error("Error marking all as read:", error);
  }
};

// Get student IDs in a class (helper for batch notifications)
export const getStudentIdsInClass = async (
  classId: string
): Promise<string[]> => {
  try {
    const result = await apiClient.get(`/notifications/class/${classId}/student-ids`);
    return result.student_ids || [];
  } catch (error) {
    logger.error("Error fetching student IDs:", error);
    return [];
  }
};
