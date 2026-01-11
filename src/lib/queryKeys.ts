/**
 * Centralized query keys for React Query
 * This ensures consistency across the application and makes cache invalidation easier
 */

export const queryKeys = {
  // Teacher-related queries
  teacher: {
    classes: (teacherId: string, schoolId: string) => 
      ['teacher-classes', teacherId, schoolId] as const,
    announcements: (teacherId: string, schoolId: string) => 
      ['teacher-announcements', teacherId, schoolId] as const,
    files: (teacherId: string, schoolId: string) => 
      ['teacher-files', teacherId, schoolId] as const,
    subjects: (teacherId: string, classId: string, gradeId: string) => 
      ['teacher-subjects', teacherId, classId, gradeId] as const,
    notifications: (teacherId: string, limit?: number) => 
      ['teacher-notifications', teacherId, limit] as const,
    gradingQueue: (teacherId: string) => 
      ['teacher-grading-queue', teacherId] as const,
    voiceNotes: (teacherId: string, schoolId: string) => 
      ['teacher-voice-notes', teacherId, schoolId] as const,
    tests: (teacherId: string, schoolId: string) => 
      ['teacher-tests', teacherId, schoolId] as const,
  },

  // Class-related queries
  class: {
    students: (classId: string) => 
      ['class-students', classId] as const,
    attendance: (classId: string, date: string) => 
      ['attendance-records', classId, date] as const,
    analytics: (classId: string) => 
      ['class-analytics', classId] as const,
    performanceTrend: (classId: string) => 
      ['class-performance-trend', classId] as const,
    subjectAverages: (classId: string) => 
      ['class-subject-averages', classId] as const,
    attendanceVsMarks: (classId: string) => 
      ['class-attendance-vs-marks', classId] as const,
    studentsWithScores: (classId: string) => 
      ['class-students-scores', classId] as const,
    recentTests: (classId: string) => 
      ['class-recent-tests', classId] as const,
    questionTypes: (classId: string) => 
      ['class-question-types', classId] as const,
    chapterTopicAnalytics: (classId: string) => 
      ['class-chapter-topic-analytics', classId] as const,
  },

  // Student-related queries (for teacher analytics)
  student: {
    analytics: (studentId: string, classId: string) => 
      ['student-analytics-teacher', studentId, classId] as const,
  },

  // File-related queries
  files: {
    categories: (schoolId: string) => 
      ['file-categories', schoolId] as const,
  },

  // School-related queries
  school: {
    details: (schoolId: string) => 
      ['school-details', schoolId] as const,
  },

  // Admin-related queries
  admin: {
    notifications: (adminId: string, limit?: number) => 
      ['admin-notifications', adminId, limit] as const,
  },
} as const;
