import { apiClient } from '@/lib/apiClient';

// ==================== TYPES ====================
export interface WhatsappRecipient {
  phoneNumber: string;
  recipientId?: string;
}

export interface BroadcastParams {
  recipients: WhatsappRecipient[];
  templateName: string;
  languageCode: string;
  components?: any[];
  senderId?: string;
  schoolId?: string;
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
   * Send a WhatsApp broadcast to multiple recipients
   */
  async sendBroadcast(params: BroadcastParams): Promise<{ success: boolean; count: number; jobIds?: string[] }> {
    return apiClient.post('/whatsapp/broadcast', params);
  },

  /**
   * Get WhatsApp message history for a school
   */
  async getHistory(schoolId: string, limit: number = 50): Promise<WhatsappMessage[]> {
    return apiClient.get(`/whatsapp/history?schoolId=${schoolId}&limit=${limit}`);
  },

  /**
   * Send a plain text WhatsApp message (no template)
   */
  async sendTextMessage(params: { 
    phoneNumber: string; 
    message: string;
    senderId?: string;
    schoolId?: string;
  }): Promise<{ success: boolean; jobId: string }> {
    return apiClient.post('/whatsapp/send-text', params);
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

  /**
   * Verify Webhook (mainly for backend setup, but included for completeness)
   */
  async verifyWebhook(params: { mode: string; token: string; challenge: string }): Promise<string> {
    const query = new URLSearchParams(params).toString();
    return apiClient.get(`/whatsapp/webhook?${query}`);
  },
};
