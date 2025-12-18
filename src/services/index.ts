/**
 * Academic Services - Barrel File
 * 
 * This file re-exports all academic-related services for backward compatibility.
 * The original monolithic academic.ts has been split into domain-specific modules:
 * 
 * - types.ts: Shared types, interfaces, and utilities
 * - classService.ts: Classes, grades, subjects, file categories
 * - fileService.ts: File upload, download, management
 * - announcementService.ts: Teacher and student announcements
 * - studentDataService.ts: Student profile data
 * - attendanceService.ts: Attendance tracking and statistics
 * 
 * Functions that have NOT been migrated yet remain in academicLegacy.ts
 * and are re-exported here for full backward compatibility.
 */

// Re-export from types
export {
  type NamedEntity,
  type NamedClass,
  type GradeSubjectOption,
  type FileCategoryOption,
  resolveName,
  FILES_BUCKET,
  VOICE_NOTES_BUCKET,
} from "./types";

// Re-export from schemas (for backward compatibility)
export type { NestedClass, FlattenedClass } from "@/schemas/academic";

// Re-export from classService
export {
  getClasses,
  getExamTypes,
  getExamTypesWithCategory,
  type ExamTypeWithCategory,
  getSubjects,
  getFileCategories,
  getTeacherClasses,
  getGradeSubjectsDetailed,
  getTeacherSubjectsForClass,
} from "./classService";

// Re-export from fileService
export {
  type TeacherFileItem,
  type StudentFileItem,
  type UploadTeacherFileParams,
  getTeacherFiles,
  uploadTeacherFile,
  deleteTeacherFile,
  incrementFileDownload,
  getStudentFiles,
} from "./fileService";

// Re-export from announcementService
export {
  type TeacherAnnouncement,
  type StudentAnnouncement,
  type CreateAnnouncementParams,
  getTeacherAnnouncements,
  createTeacherAnnouncement,
  deleteTeacherAnnouncement,
  getStudentAnnouncements,
} from "./announcementService";

// Re-export from studentDataService
export {
  type StudentData,
  type StudentVoiceNote,
  getStudentData,
  getStudentVoiceNotes,
} from "./studentDataService";

// Re-export from attendanceService
export {
  type StudentAttendance,
  type AttendanceRecord,
  getStudentsByClass,
  getAttendanceForDate,
  saveAttendance,
  getOverallAttendancePercentage,
  getStudentAttendanceBySubject,
  getStudentPendingTestsCount,
  getStudentPendingAssessmentsCount,
  getStudentAverageMarksPercentage,
  getStudentMonthlyAttendance,
  getStudentMonthlyAttendanceSummary,
} from "./attendanceService";

// Re-export from notificationService
export {
  type Notification,
  type CreateNotificationParams,
  createNotification,
  createNotificationsForClass,
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getStudentIdsInClass,
} from "./notificationService";

// Re-export from emailService
export {
  sendEmail,
  getStudentEmailsInClass,
  sendAttendanceEmail,
  sendFileUploadEmail,
  sendTestPublishedEmail,
  sendAnnouncementEmail,
  sendGradeEmail,
} from "./emailService";

// Re-export from testService
export {
  type QuestionType,
  type TestQuestion,
  type TeacherTest,
  type StudentTest,
  type CreateTestParams,
  type StudentTestWithQuestions,
  type StudentTestQuestion,
  createTeacherTest,
  getTeacherTest,
  getTeacherTests,
  updateTeacherTest,
  publishTeacherTest,
  deleteTeacherTest,
  getStudentTests,
  getStudentTestForAttempt,
  submitStudentTest,
  getStudentSubmission,
  getTestResult,
  getStudentGradedTests,
  getGradeSubjectIdBySubjectName,
  getExamTypeIdByName,
  getTeacherGradingQueue,
  getTestSubmissionsForGrading,
  gradeStudentAnswer,
  finalizeSubmissionGrading,
  type StudentTestWithQuestions,
  type StudentSubmission,
  type TestResult,
  type StudentGradedTest,
  type SubmitTestParams,
  type GradingQueueItem,
  type SubmissionToGrade,
} from "./testService";

// Import analyticsApi for use in wrapper functions
import { analyticsApi } from "./analyticsApiService";

// Re-export from analyticsApiService
export {
  analyticsApi,
  type StudentStatsSummary,
  type SubjectPerformance,
  type ProgressTrendPoint,
  type StrengthWeaknessItem,
  type StrengthsWeaknesses,
  type ChapterPerformance,
  type TopicPerformance,
  type StudentChapterTopicAnalytics,
  type ClassPerformanceTrend,
  type SubjectAverage,
  type AttendanceVsMarks,
  type ClassChapterTopicAnalytics,
  type StudentWithScore,
  type RecentTestMetrics,
  type QuestionTypeDistribution,
  type StudentAnalyticsForTeacher,
} from "./analyticsApiService";

// Type aliases for backward compatibility
export type ClassStudentWithScore = StudentWithScore;
export type SubjectAverageData = SubjectAverage;

// Backward-compatible wrapper functions for analytics
export const getStudentStatsSummary = (studentId: string) =>
  analyticsApi.getStudentStatsSummary(studentId);

export const getStudentSubjectPerformance = (studentId: string) =>
  analyticsApi.getStudentSubjectPerformance(studentId);

export const getStudentProgressTrend = (studentId: string) =>
  analyticsApi.getStudentProgressTrend(studentId);

export const getStudentStrengthsWeaknesses = (studentId: string) =>
  analyticsApi.getStudentStrengthsWeaknesses(studentId);

export const getStudentChapterTopicAnalytics = (studentId: string) =>
  analyticsApi.getStudentChapterTopicAnalytics(studentId);

export const getClassPerformanceTrend = (classId: string) =>
  analyticsApi.getClassPerformanceTrend(classId);

export const getClassSubjectAverages = (classId: string) =>
  analyticsApi.getClassSubjectAverages(classId);

export const getAttendanceVsMarksData = (classId: string) =>
  analyticsApi.getAttendanceVsMarksData(classId);

export const getChapterTopicAnalytics = (classId: string, subjectId?: string) =>
  analyticsApi.getClassChapterTopicAnalytics(classId, subjectId);

export const getClassStudentsWithScores = (classId: string) =>
  analyticsApi.getClassStudentsWithScores(classId);

export const getRecentTestsMetrics = (classId: string, limit?: number) =>
  analyticsApi.getRecentTestsMetrics(classId, limit);

export const getQuestionTypeDistribution = (classId: string) =>
  analyticsApi.getQuestionTypeDistribution(classId);

export const getStudentAnalyticsForTeacher = (studentId: string, classId: string) =>
  analyticsApi.getStudentAnalyticsForTeacher(studentId, classId);

// Re-export remaining functions from legacy file
export * from "./academicLegacy";

