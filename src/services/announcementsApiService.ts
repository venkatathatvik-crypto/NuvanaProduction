import { apiClient } from '@/lib/apiClient';

// ==================== TYPES ====================
export interface TeacherAnnouncement {
  id: string;
  title: string;
  message: string;
  isUrgent: boolean;
  createdAt: string;
  classes: {
    class_id: string;
    class_name: string;
  }[];
  views?: number;
}

export interface StudentAnnouncement {
  id: string;
  title: string;
  message: string;
  isUrgent: boolean;
  createdAt: string;
  class_name: string;
}

export interface CreateAnnouncementParams {
  title: string;
  message: string;
  isUrgent: boolean;
  classIds: string[];
  teacherId: string;
}

// ==================== ANNOUNCEMENTS SERVICE ====================
export const announcementsApi = {
  /**
   * Create a new announcement
   */
  async createAnnouncement(
    params: CreateAnnouncementParams
  ): Promise<TeacherAnnouncement> {
    return apiClient.post('/announcements', params);
  },

  /**
   * Get all announcements for a teacher
   */
  async getTeacherAnnouncements(
    teacherId: string
  ): Promise<TeacherAnnouncement[]> {
    return apiClient.get(`/announcements/teacher/${teacherId}`);
  },

  /**
   * Get all announcements for a class (student view)
   */
  async getStudentAnnouncements(
    classId: string
  ): Promise<StudentAnnouncement[]> {
    return apiClient.get(`/announcements/student/class/${classId}`);
  },

  /**
   * Get a single announcement by ID
   */
  async getAnnouncementById(id: string): Promise<TeacherAnnouncement> {
    return apiClient.get(`/announcements/${id}`);
  },

  /**
   * Update an announcement
   */
  async updateAnnouncement(
    id: string,
    data: {
      title?: string;
      message?: string;
      isUrgent?: boolean;
    }
  ): Promise<TeacherAnnouncement> {
    return apiClient.patch(`/announcements/${id}`, data);
  },

  /**
   * Delete an announcement
   */
  async deleteAnnouncement(id: string): Promise<{ message: string }> {
    return apiClient.delete(`/announcements/${id}`);
  },
};
