import { apiClient } from '@/lib/apiClient';

// ==================== TYPES ====================
export interface SchoolAnnouncementData {
  parentName: string;
  studentName: string;
  messageText: string;
  schoolName: string;
}

export interface TemplateDataMap {
  school_announcement: SchoolAnnouncementData;
}

export type UseCase = keyof TemplateDataMap;

export interface WhatsappRecipient {
  phoneNumber: string;
  recipientId?: string;
  data?: any;
}

export interface SendUnifiedParams<T extends UseCase> {
  useCase: T;
  data: TemplateDataMap[T];
  phoneNumber?: string;
  recipients?: WhatsappRecipient[];
  senderId: string;
  schoolId: string;
}

export interface WhatsappMessage {
  id: string;
  wa_message_id: string | null;
  sender_id: string | null;
  school_id: string | null;
  phone_number: string;
  message_text: string;
  status: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  direction: 'OUTGOING' | 'INCOMING';
  metadata: any;
  created_at: string;
  updated_at: string;
  profiles?: {
    name: string;
  };
}

// ==================== WHATSAPP API SERVICE ====================
export const whatsappApi = {
  /**
   * Unified method to send WhatsApp messages (Individual or Broadcast)
   */
  async sendUnified<T extends UseCase>(params: SendUnifiedParams<T>): Promise<{ success: boolean; count: number; jobIds?: string[] }> {
    return apiClient.post('/whatsapp/send', params);
  },

  /**
   * Get WhatsApp message history for a school
   */
  async getHistory(schoolId: string, limit: number = 50): Promise<WhatsappMessage[]> {
    return apiClient.get(`/whatsapp/history?schoolId=${schoolId}&limit=${limit}`);
  },

  /**
   * Get eligible parent recipients for a class
   */
  async getClassRecipients(classId: string): Promise<Array<{ phoneNumber: string; recipientId: string; studentName: string }>> {
    return apiClient.get(`/whatsapp/recipients/class/${classId}`);
  },

  /**
   * Get eligible parent recipient for a specific student
   */
  async getStudentRecipient(studentId: string): Promise<{ phoneNumber: string; recipientId: string; studentName: string } | null> {
    return apiClient.get(`/whatsapp/recipients/student/${studentId}`);
  },
};
