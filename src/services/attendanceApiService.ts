import { apiClient } from '@/lib/apiClient';

// ==================== TYPES ====================
export interface StudentAttendance {
  id: string;
  name: string;
  roll_number: string;
  present: boolean;
  status?: string;
}

export interface AttendanceMap {
  [studentId: string]: boolean | string;
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

export interface SubjectAttendance {
  subject: string;
  present: number;
  total: number;
  percentage: number;
  trend: 'up' | 'down';
  recentClasses: Array<{
    date: string;
    status: 'present' | 'absent';
  }>;
}

export interface DailyAttendanceData {
  date: string;
  day: number;
  dayName: string;
  status: 'present' | 'absent' | null;
  isWeekend: boolean;
  present: number;
  absent: number;
}

export interface MonthlyAttendance {
  year: number;
  month: number;
  monthName: string;
  dailyData: DailyAttendanceData[];
  summary: {
    presentDays: number;
    absentDays: number;
    totalDays: number;
    percentage: number;
  };
}

export interface MonthlyAttendanceSummary {
  year: number;
  month: number;
  monthKey: string;
  monthName: string;
  present: number;
  absent: number;
  total: number;
  percentage: number;
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
   * Mark attendance for a class across multiple dates (bulk operation)
   */
  async markBulkAttendance(
    classId: string,
    attendanceDates: string[],
    students: StudentAttendance[],
    teacherId: string
  ): Promise<{
    message: string;
    totalRecordsCreated: number;
    datesUpdated: number;
    studentsAffected: number;
  }> {
    return apiClient.post('/attendance/bulk', {
      classId,
      attendanceDates,
      students,
      teacherId,
    });
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
  async getStudentAttendanceBySubject(studentId: string): Promise<SubjectAttendance[]> {
    return apiClient.get(`/attendance/student/${studentId}/by-subject`);
  },

  /**
   * Get monthly attendance data for a student
   */
  async getStudentMonthlyAttendance(
    studentId: string,
    year: number,
    month: number,
  ): Promise<MonthlyAttendance> {
    return apiClient.get(`/attendance/student/${studentId}/monthly?year=${year}&month=${month}`);
  },

  /**
   * Get monthly attendance summary (all months)
   */
  async getStudentMonthlyAttendanceSummary(studentId: string): Promise<MonthlyAttendanceSummary[]> {
    return apiClient.get(`/attendance/student/${studentId}/monthly-summary`);
  },
};
