// Attendance services for teachers and students
import { attendanceApi } from "./attendanceApiService";

export interface StudentAttendance {
  id: string;
  name: string;
  roll_number: string;
  present: boolean;
  status?: string;
}

export interface AttendanceRecord {
  id: string;
  student_id: string;
  attendance_date: string;
  status: string;
  taken_by: string;
  recorded_at: string;
}

// Get students by class_id for attendance marking
export const getStudentsByClass = async (
  classId: string
): Promise<StudentAttendance[]> => {
  return attendanceApi.getStudentsByClass(classId);
};

// Fetch existing attendance records for a specific date and class
export const getAttendanceForDate = async (
  classId: string,
  attendanceDate: string
): Promise<Record<string, boolean | string>> => {
  return attendanceApi.getAttendanceForDate(classId, attendanceDate);
};

// Save attendance records for a date
export const saveAttendance = async (
  classId: string,
  attendanceDate: string,
  students: StudentAttendance[],
  teacherId: string,
  schoolId: string
): Promise<void> => {
  await attendanceApi.markAttendance({
    classId,
    attendanceDate,
    students,
    teacherId,
  });
};

// Get overall student attendance percentage
export const getOverallAttendancePercentage = async (
  studentId: string
): Promise<number> => {
  try {
    const result = await attendanceApi.getStudentAttendancePercentage(studentId);
    return result.percentage;
  } catch {
    return 0;
  }
};

// Get student attendance breakdown by subject
export const getStudentAttendanceBySubject = async (
  studentId: string
): Promise<any[]> => {
  try {
    const result = await attendanceApi.getStudentAttendanceBySubject(studentId);
    return result || [];
  } catch {
    return [];
  }
};

// Get count of pending tests for a student (published tests not yet attempted)
export const getStudentPendingTestsCount = async (
  studentId: string
): Promise<number> => {
  try {
    const result = await attendanceApi.getStudentPendingTestsCount(studentId);
    return result.count;
  } catch {
    return 0;
  }
};

// Get count of pending Internal Assessments for a student
export const getStudentPendingAssessmentsCount = async (
  studentId: string
): Promise<number> => {
  try {
    const result = await attendanceApi.getStudentPendingAssessmentsCount(studentId);
    return result.count;
  } catch {
    return 0;
  }
};

// Get student's average marks percentage across all graded tests
export const getStudentAverageMarksPercentage = async (
  studentId: string
): Promise<number> => {
  try {
    const result = await attendanceApi.getStudentAverageMarksPercentage(studentId);
    return result.percentage;
  } catch {
    return 0;
  }
};

// Get monthly attendance data for a student
export const getStudentMonthlyAttendance = async (
  studentId: string,
  year: number,
  month: number,
): Promise<any> => {
  try {
    return await attendanceApi.getStudentMonthlyAttendance(studentId, year, month);
  } catch (error) {
    console.error('Error fetching monthly attendance:', error);
    return null;
  }
};

// Get monthly attendance summary (all months)
export const getStudentMonthlyAttendanceSummary = async (
  studentId: string,
): Promise<any[]> => {
  try {
    return await attendanceApi.getStudentMonthlyAttendanceSummary(studentId);
  } catch (error) {
    console.error('Error fetching monthly summary:', error);
    return [];
  }
};
