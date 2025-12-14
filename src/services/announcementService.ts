// Announcement services for teachers and students
import { announcementsApi } from "./announcementsApiService";

export interface TeacherAnnouncement {
  id: string;
  title: string;
  message: string;
  isUrgent: boolean;
  createdAt: string;
  classes: { class_id: string; class_name: string }[];
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
  schoolId: string;
}

export const getTeacherAnnouncements = async (
  teacherId: string,
  schoolId: string
): Promise<TeacherAnnouncement[]> => {
  return announcementsApi.getTeacherAnnouncements(teacherId);
};

export const createTeacherAnnouncement = async (
  params: CreateAnnouncementParams
): Promise<TeacherAnnouncement> => {
  return announcementsApi.createAnnouncement({
    title: params.title,
    message: params.message,
    isUrgent: params.isUrgent,
    classIds: params.classIds,
    teacherId: params.teacherId,
  });
};

export const deleteTeacherAnnouncement = async (
  announcementId: string,
  classId: string
): Promise<void> => {
  await announcementsApi.deleteAnnouncement(announcementId);
};

// Get announcements filtered by class_id for students
export const getStudentAnnouncements = async (
  classId: string
): Promise<StudentAnnouncement[]> => {
  return announcementsApi.getStudentAnnouncements(classId);
};
