import { apiClient } from "@/lib/apiClient";

export interface SendMessageDto {
  recipientId: string;
  subject: string;
  message: string;
  isUrgent?: boolean;
}

export interface Message {
  id: string;
  subject: string;
  message: string;
  sentAt: string;
  isFromMe: boolean;
  isRead: boolean;
  isUrgent: boolean;
}

export interface Conversation {
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar?: string;
  userRole: number;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

export interface ConversationDetail {
  otherUser: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
    role_id: number;
  };
  messages: Message[];
}

class MessagesService {
  async sendMessage(dto: SendMessageDto) {
    const response = await apiClient.post("/messages/send", dto);
    return response;
  }

  async getConversations(): Promise<Conversation[]> {
    const response = await apiClient.get("/messages/conversations");
    return response as Conversation[];
  }

  async getConversation(otherUserId: string): Promise<ConversationDetail> {
    const response = await apiClient.get(`/messages/conversation/${otherUserId}`);
    return response as ConversationDetail;
  }

  async markAsRead(messageId: string) {
    const response = await apiClient.patch(`/messages/${messageId}/read`);
    return response;
  }

  async getUnreadCount(): Promise<number> {
    const response = await apiClient.get("/messages/unread-count");
    return (response as { count: number }).count;
  }
}

export const messagesService = new MessagesService();
