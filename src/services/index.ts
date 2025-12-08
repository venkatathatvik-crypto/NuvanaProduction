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
  getStudentPendingTestsCount,
  getStudentPendingAssessmentsCount,
  getStudentAverageMarksPercentage,
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

// Re-export remaining functions from legacy file
export * from "./academicLegacy";

