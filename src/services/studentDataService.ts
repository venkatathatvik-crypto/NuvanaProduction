// Student data services - profile, voice notes, basic student info
import { apiClient } from "@/lib/apiClient";

export interface StudentData {
  id: string;
  class_id: string | null;
  class_name?: string;
  grade_id?: number;
  grade_name?: string;
  roll_number?: string;
}

export interface StudentVoiceNote {
  id: string;
  title: string;
  storageUrl: string;
  duration: number;
  fileSize: number;
  subject: string;
  gradeSubjectId: string;
  uploadDate: string;
}

// Get student data including class_id from backend API
export const getStudentData = async (
  studentId: string
): Promise<StudentData | null> => {
  try {
    const { apiClient } = await import('@/lib/apiClient');
    const data = await apiClient.get<{
      id: string;
      student_details: {
        class_id: string | null;
        roll_number: string | null;
        classes: {
          id: string;
          name: string;
          grade_levels: {
            id: number;
            name: string;
          };
        } | null;
      } | null;
    }>(`/users/${studentId}`);

    if (!data) {
      return null;
    }

    // Extract student_details
    const studentDetails = data.student_details;

    if (!studentDetails) {
      console.warn("No student_details found for student:", studentId);
      return null;
    }

    const classData = studentDetails.classes;
    const gradeData = classData?.grade_levels;

    return {
      id: data.id,
      class_id: studentDetails.class_id || null,
      class_name: classData?.name,
      grade_id: gradeData?.id,
      grade_name: gradeData?.name,
      roll_number: studentDetails.roll_number || undefined,
    };
  } catch (error: any) {
    console.error("Error fetching student data:", error);
    throw new Error(error.message || "Failed to load student data.");
  }
};

// Get voice notes by class_id for students
export const getStudentVoiceNotes = async (
  classId: string,
  schoolId: string
): Promise<StudentVoiceNote[]> => {
  try {
    const { apiClient } = await import('@/lib/apiClient');
    const data = await apiClient.get<Array<{
      id: string;
      title: string;
      storageUrl: string;
      storagePath: string;
      durationSeconds: number;
      duration: number;
      fileSizeBytes: number;
      fileSize: number;
      subject: string;
      uploadDate: string;
      createdAt: string;
    }>>(`/file-upload/voice-notes/class/${classId}`);

    return data.map((record) => ({
      id: record.id,
      title: record.title,
      storageUrl: record.storageUrl,
      duration: record.durationSeconds || record.duration || 0,
      fileSize: record.fileSizeBytes || record.fileSize || 0,
      subject: record.subject || "General",
      gradeSubjectId: "", // Not needed for student view
      uploadDate: record.uploadDate || record.createdAt || new Date().toISOString(),
    }));
  } catch (error) {
    console.error("Error fetching student voice notes:", error);
    throw new Error("Failed to load voice notes.");
  }
};
