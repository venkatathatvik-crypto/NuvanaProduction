// Student Analytics DTOs

export class StudentStatsSummaryDto {
  overallPercentage: number;
  totalTests: number;
  bestSubject: string;
  attendancePercentage: number;
}

export class SubjectPerformanceDto {
  subject: string;
  score: number;
  fullMark: number;
  percentage: number;
}

export class ProgressTrendPointDto {
  month: string;
  score: number;
}

export class StrengthWeaknessItemDto {
  subject: string;
  desc: string;
  topic?: string;
  mastery?: number;
}

export class StrengthsWeaknessesDto {
  strengths: StrengthWeaknessItemDto[];
  weaknesses: StrengthWeaknessItemDto[];
}

export class ChapterPerformanceDto {
  name: string;
  avgScore: number;
  totalQuestions: number;
  mastery: number;
}

export class TopicPerformanceDto {
  name: string;
  avgScore: number;
  totalQuestions: number;
  chapters: string[];
  mastery: number;
}

export class StudentChapterTopicAnalyticsDto {
  chapters: ChapterPerformanceDto[];
  topics: TopicPerformanceDto[];
}

// Teacher Analytics DTOs

export class ClassPerformanceTrendDto {
  month: string;
  avgScore: number;
  attendance: number;
}

export class SubjectAverageDto {
  subject: string;
  avg: number;
}

export class AttendanceVsMarksDto {
  studentId: string;
  studentName: string;
  attendance: number;
  marks: number;
  correlation?: number;
}

export class ClassChapterTopicAnalyticsDto {
  chapters: ChapterPerformanceDto[];
  topics: TopicPerformanceDto[];
}

export class StudentWithScoreDto {
  id: string;
  name: string;
  avgScore: number;
  attendancePercentage: number;
}

export class RecentTestMetricsDto {
  test: string;
  avg: number;
  top: number;
}

export class QuestionTypeDistributionDto {
  name: string;
  value: number;
}

export class StudentAnalyticsForTeacherDto {
  radar: Array<{
    subject: string;
    A: number;
    B: number;
  }>;
  strengths: StrengthWeaknessItemDto[];
  weaknesses: StrengthWeaknessItemDto[];
}

