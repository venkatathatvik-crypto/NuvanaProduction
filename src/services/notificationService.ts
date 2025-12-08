// Notification service for creating and managing notifications
import { supabase } from "./types";

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
  const { error } = await supabase.from("notifications").insert({
    recipient_id: params.recipient_id,
    school_id: params.school_id,
    title: params.title,
    message: params.message,
    notification_type: params.notification_type,
    source_id: params.source_id || null,
    target_url: params.target_url || null,
    is_read: false,
    is_urgent: params.is_urgent || false,
  });

  if (error) {
    console.error("Error creating notification:", error);
    throw new Error("Failed to create notification");
  }
};

// Create notifications for multiple recipients (batch)
export const createNotificationsForClass = async (
  recipientIds: string[],
  params: Omit<CreateNotificationParams, "recipient_id">
): Promise<void> => {
  if (recipientIds.length === 0) return;

  const notifications = recipientIds.map((recipientId) => ({
    recipient_id: recipientId,
    school_id: params.school_id,
    title: params.title,
    message: params.message,
    notification_type: params.notification_type,
    source_id: params.source_id || null,
    target_url: params.target_url || null,
    is_read: false,
    is_urgent: params.is_urgent || false,
  }));

  const { error } = await supabase.from("notifications").insert(notifications);

  if (error) {
    console.error("Error creating batch notifications:", error);
    // Don't throw - notifications should not block main actions
  }
};

// Get notifications for a user
export const getNotifications = async (
  recipientId: string,
  limit: number = 20
): Promise<Notification[]> => {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("recipient_id", recipientId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching notifications:", error);
    return [];
  }

  return data || [];
};

// Get unread notification count
export const getUnreadNotificationCount = async (
  recipientId: string
): Promise<number> => {
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("recipient_id", recipientId)
    .eq("is_read", false);

  if (error) {
    console.error("Error fetching unread count:", error);
    return 0;
  }

  return count || 0;
};

// Mark a single notification as read
export const markNotificationAsRead = async (
  notificationId: string
): Promise<void> => {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId);

  if (error) {
    console.error("Error marking notification as read:", error);
  }
};

// Mark all notifications as read for a user
export const markAllNotificationsAsRead = async (
  recipientId: string
): Promise<void> => {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("recipient_id", recipientId)
    .eq("is_read", false);

  if (error) {
    console.error("Error marking all as read:", error);
  }
};

// Get student IDs in a class (helper for batch notifications)
export const getStudentIdsInClass = async (
  classId: string
): Promise<string[]> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("class_id", classId)
    .eq("role_id", 4); // role_id 4 = student

  if (error) {
    console.error("Error fetching student IDs:", error);
    return [];
  }

  return data?.map((s) => s.id) || [];
};
