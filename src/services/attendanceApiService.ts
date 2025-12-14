import { apiClient } from '@/lib/apiClient';

// ==================== TYPES ====================
export interface StudentAttendance {
  id: string;
  name: string;
  roll_number: string;
  present: boolean;
}

export interface AttendanceMap {
  [studentId: string]: boolean;
}

export interface AttendancePercentage {
  percentage: number;
  totalDays: number;
  presentDays: number;
}

export interface MarkAttendanceParams {
  classId: string;
  attendanceDate: string;
  students: StudentAttendance[];
  teacherId: string;
}

export interface MarkAttendanceResponse {
  message: string;
  presentCount: number;
  totalCount: number;
}

// ==================== ATTENDANCE SERVICE ====================
export const attendanceApi = {
  /**
   * Get all students in a class for attendance marking
   */
  async getStudentsByClass(classId: string): Promise<StudentAttendance[]> {
    return apiClient.get(`/attendance/students/class/${classId}`);
  },

  /**
   * Get attendance records for a specific class and date
   */
  async getAttendanceForDate(
    classId: string,
    date: string
  ): Promise<AttendanceMap> {
    return apiClient.get(`/attendance/class/${classId}/date/${date}`);
  },

  /**
   * Mark attendance for a class on a specific date
   */
  async markAttendance(
    params: MarkAttendanceParams
  ): Promise<MarkAttendanceResponse> {
    return apiClient.post('/attendance', params);
  },

  /**
   * Get attendance percentage for a student
   */
  async getStudentAttendancePercentage(
    studentId: string
  ): Promise<AttendancePercentage> {
    return apiClient.get(`/attendance/student/${studentId}/percentage`);
  },

  /**
   * Get count of pending tests for a student
   */
  async getStudentPendingTestsCount(studentId: string): Promise<{ count: number }> {
    return apiClient.get(`/attendance/student/${studentId}/pending-tests`);
  },

  /**
   * Get count of pending assessments for a student
   */
  async getStudentPendingAssessmentsCount(
    studentId: string
  ): Promise<{ count: number }> {
    return apiClient.get(`/attendance/student/${studentId}/pending-assessments`);
  },

  /**
   * Get average marks percentage for a student
   */
  async getStudentAverageMarksPercentage(
    studentId: string
  ): Promise<{ percentage: number }> {
    return apiClient.get(`/attendance/student/${studentId}/average-marks`);
  },

  /**
   * Get student attendance breakdown by subject
   */
  async getStudentAttendanceBySubject(studentId: string): Promise<any[]> {
    return apiClient.get(`/attendance/student/${studentId}/by-subject`);
  },
};
