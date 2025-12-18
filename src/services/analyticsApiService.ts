import { apiClient } from '@/lib/apiClient';

// ==================== TYPES ====================

export interface StudentStatsSummary {
  overallPercentage: number;
  totalTests: number;
  bestSubject: string;
  attendancePercentage: number;
}

export interface SubjectPerformance {
  subject: string;
  score: number;
  fullMark: number;
  percentage: number;
}

export interface ProgressTrendPoint {
  month: string;
  score: number;
}

export interface StrengthWeaknessItem {
  subject: string;
  desc: string;
  topic?: string;
  mastery?: number;
}

export interface StrengthsWeaknesses {
  strengths: StrengthWeaknessItem[];
  weaknesses: StrengthWeaknessItem[];
}

export interface ChapterPerformance {
  name: string;
  avgScore: number;
  totalQuestions: number;
  mastery: number;
}

export interface TopicPerformance {
  name: string;
  avgScore: number;
  totalQuestions: number;
  chapters: string[];
  mastery: number;
}

export interface StudentChapterTopicAnalytics {
  chapters: ChapterPerformance[];
  topics: TopicPerformance[];
}

export interface ClassPerformanceTrend {
  month: string;
  avgScore: number;
  attendance: number;
}

export interface SubjectAverage {
  subject: string;
  avg: number;
}

export interface AttendanceVsMarks {
  studentId: string;
  studentName: string;
  attendance: number;
  marks: number;
  correlation?: number;
}

export interface ClassChapterTopicAnalytics {
  chapters: ChapterPerformance[];
  topics: TopicPerformance[];
}

export interface StudentWithScore {
  id: string;
  name: string;
  avgScore: number;
  attendancePercentage: number;
}

export interface RecentTestMetrics {
  test: string;
  avg: number;
  top: number;
}

export interface QuestionTypeDistribution {
  name: string;
  value: number;
}

export interface StudentAnalyticsForTeacher {
  radar: Array<{
    subject: string;
    A: number;
    B: number;
  }>;
  strengths: StrengthWeaknessItem[];
  weaknesses: StrengthWeaknessItem[];
}

// ==================== ANALYTICS API SERVICE ====================

export const analyticsApi = {
  // Student Analytics
  async getStudentStatsSummary(studentId: string): Promise<StudentStatsSummary> {
    return apiClient.get(`/analytics/student/${studentId}/stats-summary`);
  },

  async getStudentSubjectPerformance(studentId: string): Promise<SubjectPerformance[]> {
    return apiClient.get(`/analytics/student/${studentId}/subject-performance`);
  },

  async getStudentProgressTrend(studentId: string): Promise<ProgressTrendPoint[]> {
    return apiClient.get(`/analytics/student/${studentId}/progress-trend`);
  },

  async getStudentStrengthsWeaknesses(studentId: string): Promise<StrengthsWeaknesses> {
    return apiClient.get(`/analytics/student/${studentId}/strengths-weaknesses`);
  },

  async getStudentChapterTopicAnalytics(studentId: string): Promise<StudentChapterTopicAnalytics> {
    return apiClient.get(`/analytics/student/${studentId}/chapter-topic-analytics`);
  },

  // Teacher Analytics
  async getClassPerformanceTrend(classId: string): Promise<ClassPerformanceTrend[]> {
    return apiClient.get(`/analytics/class/${classId}/performance-trend`);
  },

  async getClassSubjectAverages(classId: string): Promise<SubjectAverage[]> {
    return apiClient.get(`/analytics/class/${classId}/subject-averages`);
  },

  async getAttendanceVsMarksData(classId: string): Promise<AttendanceVsMarks[]> {
    return apiClient.get(`/analytics/class/${classId}/attendance-vs-marks`);
  },

  async getClassChapterTopicAnalytics(classId: string, subjectId?: string): Promise<ClassChapterTopicAnalytics> {
    const url = subjectId
      ? `/analytics/class/${classId}/chapter-topic-analytics?subjectId=${subjectId}`
      : `/analytics/class/${classId}/chapter-topic-analytics`;
    return apiClient.get(url);
  },

  async getClassStudentsWithScores(classId: string): Promise<StudentWithScore[]> {
    return apiClient.get(`/analytics/class/${classId}/students-with-scores`);
  },

  async getRecentTestsMetrics(classId: string, limit?: number): Promise<RecentTestMetrics[]> {
    const url = limit
      ? `/analytics/class/${classId}/recent-tests-metrics?limit=${limit}`
      : `/analytics/class/${classId}/recent-tests-metrics`;
    return apiClient.get(url);
  },

  async getQuestionTypeDistribution(classId: string): Promise<QuestionTypeDistribution[]> {
    return apiClient.get(`/analytics/class/${classId}/question-type-distribution`);
  },

  async getStudentAnalyticsForTeacher(studentId: string, classId: string): Promise<StudentAnalyticsForTeacher> {
    return apiClient.get(`/analytics/student/${studentId}/for-teacher?classId=${classId}`);
  },
};

