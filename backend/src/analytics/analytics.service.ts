import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import {
  StudentStatsSummaryDto,
  SubjectPerformanceDto,
  ProgressTrendPointDto,
  StrengthsWeaknessesDto,
  StudentChapterTopicAnalyticsDto,
  ClassPerformanceTrendDto,
  SubjectAverageDto,
  AttendanceVsMarksDto,
  ClassChapterTopicAnalyticsDto as ClassChapterTopicDto,
  StudentWithScoreDto,
  RecentTestMetricsDto,
  QuestionTypeDistributionDto,
  StudentAnalyticsForTeacherDto,
} from './dto';

@Injectable()
export class AnalyticsService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) { }

  // ==================== STUDENT ANALYTICS ====================

  /**
   * Get overall statistics summary for a student
   */
  async getStudentStatsSummary(
    studentId: string,
    schoolId: string,
  ): Promise<StudentStatsSummaryDto> {
    const cacheKey = `analytics:student:${studentId}:stats`;
    
    // Try cache first
    const cached = await this.cacheManager.get<StudentStatsSummaryDto>(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Verify student exists
    const student = await this.prisma.profiles.findFirst({
      where: {
        id: studentId,
        school_id: schoolId,
        role_id: 4, // Student role
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Get overall percentage from all graded submissions
    const submissions = await this.prisma.test_submissions.findMany({
      where: {
        student_id: studentId,
        is_graded: true,
        tests: {
          school_id: schoolId,
        },
      },
      include: {
        tests: {
          include: {
            questions: true,
          },
        },
      },
    });

    let totalMarksObtained = 0;
    let totalMaxMarks = 0;

    submissions.forEach((submission) => {
      const testMaxMarks = submission.tests.questions.reduce(
        (sum, q) => sum + (q.marks || 0),
        0,
      );
      totalMaxMarks += testMaxMarks;
      totalMarksObtained += submission.total_marks_obtained || 0;
    });

    const overallPercentage =
      totalMaxMarks > 0
        ? Math.round((totalMarksObtained / totalMaxMarks) * 100)
        : 0;

    // Get total tests count
    const totalTests = submissions.length;

    // Get best subject from subject performance
    const subjectPerformance = await this.getStudentSubjectPerformance(
      studentId,
      schoolId,
    );
    const bestSubject =
      subjectPerformance.length > 0 ? subjectPerformance[0].subject : 'N/A';

    // Get attendance percentage
    const attendanceRecords = await this.prisma.attendance.findMany({
      where: {
        student_id: studentId,
        school_id: schoolId,
      },
    });

    const presentDays = attendanceRecords.filter(
      (r) => r.status === 'present',
    ).length;
    const totalDays = attendanceRecords.length;
    const attendancePercentage =
      totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

    const result = {
      overallPercentage,
      totalTests,
      bestSubject,
      attendancePercentage,
    };
    
    // Store in cache (TTL: 900 seconds = 15 minutes)
    await this.cacheManager.set(cacheKey, result, 900);
    
    return result;
  }

  /**
   * Get performance breakdown by subject
   */
  async getStudentSubjectPerformance(
    studentId: string,
    schoolId: string,
  ): Promise<SubjectPerformanceDto[]> {
    const cacheKey = `analytics:student:${studentId}:subjects`;
    
    // Try cache first
    const cached = await this.cacheManager.get<SubjectPerformanceDto[]>(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Get all graded submissions for this student
    const submissions = await this.prisma.test_submissions.findMany({
      where: {
        student_id: studentId,
        is_graded: true,
        tests: {
          school_id: schoolId,
        },
      },
      include: {
        tests: {
          include: {
            questions: true,
            grade_subjects: {
              include: {
                subjects_master: true,
              },
            },
          },
        },
      },
    });

    // Group by subject
    const subjectMap = new Map<
      string,
      { score: number; fullMark: number }
    >();

    submissions.forEach((submission) => {
      const subjectName =
        submission.tests.grade_subjects?.subjects_master?.name || 'Unknown';
      const testMaxMarks = submission.tests.questions.reduce(
        (sum, q) => sum + (q.marks || 0),
        0,
      );

      if (!subjectMap.has(subjectName)) {
        subjectMap.set(subjectName, { score: 0, fullMark: 0 });
      }

      const subjectData = subjectMap.get(subjectName)!;
      subjectData.score += submission.total_marks_obtained || 0;
      subjectData.fullMark += testMaxMarks;
    });

    // Convert to array and calculate percentages
    const result = Array.from(subjectMap.entries())
      .map(([subject, data]) => ({
        subject,
        score: data.score,
        fullMark: data.fullMark,
        percentage:
          data.fullMark > 0
            ? Math.round((data.score / data.fullMark) * 100)
            : 0,
      }))
      .sort((a, b) => b.percentage - a.percentage);
    
    // Store in cache (TTL: 900 seconds = 15 minutes)
    await this.cacheManager.set(cacheKey, result, 900);
    
    return result;
  }

  /**
   * Get monthly progress trend
   */
  async getStudentProgressTrend(
    studentId: string,
    schoolId: string,
  ): Promise<ProgressTrendPointDto[]> {
    const submissions = await this.prisma.test_submissions.findMany({
      where: {
        student_id: studentId,
        is_graded: true,
        tests: {
          school_id: schoolId,
        },
      },
      include: {
        tests: {
          include: {
            questions: true,
          },
        },
      },
      orderBy: {
        submitted_at: 'asc',
      },
    });

    if (submissions.length === 0) {
      return [];
    }

    // Group by month
    const monthlyData = new Map<
      string,
      { totalScore: number; totalMarks: number; count: number }
    >();

    submissions.forEach((submission) => {
      const date = new Date(submission.submitted_at || new Date());
      const monthKey = date.toLocaleString('en-US', { month: 'short' });

      const testMaxMarks = submission.tests.questions.reduce(
        (sum, q) => sum + (q.marks || 0),
        0,
      );

      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, { totalScore: 0, totalMarks: 0, count: 0 });
      }

      const monthData = monthlyData.get(monthKey)!;
      monthData.totalScore += submission.total_marks_obtained || 0;
      monthData.totalMarks += testMaxMarks;
      monthData.count += 1;
    });

    // Convert to array and return last 6 months
    const trendData = Array.from(monthlyData.entries())
      .map(([month, data]) => ({
        month,
        score:
          data.totalMarks > 0
            ? Math.round((data.totalScore / data.totalMarks) * 100)
            : 0,
      }))
      .slice(-6); // Last 6 months

    return trendData;
  }

  /**
   * Get strengths and weaknesses based on topic/chapter mastery
   */
  async getStudentStrengthsWeaknesses(
    studentId: string,
    schoolId: string,
  ): Promise<StrengthsWeaknessesDto> {
    // Get all graded submissions with answers
    const submissions = await this.prisma.test_submissions.findMany({
      where: {
        student_id: studentId,
        is_graded: true,
        tests: {
          school_id: schoolId,
        },
      },
      include: {
        student_answers: {
          include: {
            questions: {
              include: {
                tests: {
                  include: {
                    grade_subjects: {
                      include: {
                        subjects_master: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        tests: {
          include: {
            grade_subjects: {
              include: {
                subjects_master: true,
              },
            },
          },
        },
      },
    });

    // Calculate mastery for each topic
    const topicMastery = new Map<
      string,
      { earned: number; possible: number; subject: string }
    >();

    submissions.forEach((submission) => {
      const subjectName =
        submission.tests.grade_subjects?.subjects_master?.name || 'Unknown';

      submission.student_answers.forEach((answer) => {
        const question = answer.questions;
        const topic = question.topic || 'Uncategorized';
        const chapter = question.chapter || 'Uncategorized';

        // Calculate earned points
        let earnedPoints = 0;
        if (question.question_type === 'MCQ') {
          // Check if selected option index matches correct option index
          const correctOptionIndex = question.correct_option_index;
          const selectedOptionIndex = answer.student_selected_option_index;
          if (
            correctOptionIndex !== null &&
            selectedOptionIndex !== null &&
            correctOptionIndex === selectedOptionIndex
          ) {
            earnedPoints = question.marks;
          }
        } else {
          // Subjective - use teacher's graded marks
          earnedPoints = answer.marks_awarded || 0;
        }

        const possiblePoints = question.marks;

        const key = `${subjectName}::${topic}`;
        if (!topicMastery.has(key)) {
          topicMastery.set(key, {
            earned: 0,
            possible: 0,
            subject: subjectName,
          });
        }

        const mastery = topicMastery.get(key)!;
        mastery.earned += earnedPoints;
        mastery.possible += possiblePoints;
      });
    });

    // Calculate mastery percentages and categorize
    const strengths: Array<{
      subject: string;
      desc: string;
      topic?: string;
      mastery?: number;
    }> = [];
    const weaknesses: Array<{
      subject: string;
      desc: string;
      topic?: string;
      mastery?: number;
    }> = [];

    topicMastery.forEach((data, key) => {
      const mastery =
        data.possible > 0 ? (data.earned / data.possible) * 100 : 0;
      const topic = key.split('::')[1];

      if (mastery >= 80) {
        strengths.push({
          subject: data.subject,
          desc:
            mastery >= 90
              ? `Excellent performance - ${Math.round(mastery)}% average`
              : `Strong understanding - ${Math.round(mastery)}% average`,
          topic,
          mastery: Math.round(mastery),
        });
      } else if (mastery < 60) {
        weaknesses.push({
          subject: data.subject,
          desc:
            mastery < 40
              ? `Needs significant improvement - ${Math.round(mastery)}% average`
              : `Room for improvement - ${Math.round(mastery)}% average`,
          topic,
          mastery: Math.round(mastery),
        });
      }
    });

    // Sort and limit
    strengths.sort((a, b) => (b.mastery || 0) - (a.mastery || 0));
    weaknesses.sort((a, b) => (a.mastery || 0) - (b.mastery || 0));

    return {
      strengths: strengths.slice(0, 5),
      weaknesses: weaknesses.slice(0, 5),
    };
  }

  /**
   * Get detailed chapter and topic performance breakdown
   */
  async getStudentChapterTopicAnalytics(
    studentId: string,
    schoolId: string,
  ): Promise<StudentChapterTopicAnalyticsDto> {
    // Get all graded submissions with answers
    const submissions = await this.prisma.test_submissions.findMany({
      where: {
        student_id: studentId,
        is_graded: true,
        tests: {
          school_id: schoolId,
        },
      },
      include: {
        student_answers: {
          include: {
            questions: true,
          },
        },
      },
    });

    // Calculate chapter mastery
    const chapterMap = new Map<
      string,
      { earned: number; possible: number; questions: number }
    >();

    // Calculate topic mastery
    const topicMap = new Map<
      string,
      {
        earned: number;
        possible: number;
        questions: number;
        chapters: Set<string>;
      }
    >();

    submissions.forEach((submission) => {
      submission.student_answers.forEach((answer) => {
        const question = answer.questions;
        const chapter = question.chapter || 'Uncategorized';
        const topic = question.topic || 'Uncategorized';

        // Calculate earned points
        let earnedPoints = 0;
        if (question.question_type === 'MCQ') {
          // Check if selected option index matches correct option index
          const correctOptionIndex = question.correct_option_index;
          const selectedOptionIndex = answer.student_selected_option_index;
          if (
            correctOptionIndex !== null &&
            selectedOptionIndex !== null &&
            correctOptionIndex === selectedOptionIndex
          ) {
            earnedPoints = question.marks;
          }
        } else {
          earnedPoints = answer.marks_awarded || 0;
        }

        const possiblePoints = question.marks;

        // Update chapter map
        if (!chapterMap.has(chapter)) {
          chapterMap.set(chapter, { earned: 0, possible: 0, questions: 0 });
        }
        const chapterData = chapterMap.get(chapter)!;
        chapterData.earned += earnedPoints;
        chapterData.possible += possiblePoints;
        chapterData.questions += 1;

        // Update topic map
        if (!topicMap.has(topic)) {
          topicMap.set(topic, {
            earned: 0,
            possible: 0,
            questions: 0,
            chapters: new Set(),
          });
        }
        const topicData = topicMap.get(topic)!;
        topicData.earned += earnedPoints;
        topicData.possible += possiblePoints;
        topicData.questions += 1;
        topicData.chapters.add(chapter);
      });
    });

    // Convert to DTOs
    const chapters = Array.from(chapterMap.entries())
      .map(([name, data]) => ({
        name,
        avgScore:
          data.possible > 0 ? Math.round((data.earned / data.possible) * 100) : 0,
        totalQuestions: data.questions,
        mastery:
          data.possible > 0 ? Math.round((data.earned / data.possible) * 100) : 0,
      }))
      .sort((a, b) => b.avgScore - a.avgScore);

    const topics = Array.from(topicMap.entries())
      .map(([name, data]) => ({
        name,
        avgScore:
          data.possible > 0 ? Math.round((data.earned / data.possible) * 100) : 0,
        totalQuestions: data.questions,
        chapters: Array.from(data.chapters),
        mastery:
          data.possible > 0 ? Math.round((data.earned / data.possible) * 100) : 0,
      }))
      .sort((a, b) => b.avgScore - a.avgScore);

    return { chapters, topics };
  }

  // ==================== TEACHER ANALYTICS ====================

  /**
   * Get class performance trend over time
   */
  async getClassPerformanceTrend(
    classId: string,
    schoolId: string,
  ): Promise<ClassPerformanceTrendDto[]> {
    const cacheKey = `analytics:class:${classId}:performance`;
    
    // Try cache first
    const cached = await this.cacheManager.get<ClassPerformanceTrendDto[]>(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Get all students in the class
    const students = await this.prisma.profiles.findMany({
      where: {
        student_details: {
          class_id: classId,
        },
        school_id: schoolId,
        role_id: 4,
      },
      select: {
        id: true,
      },
    });

    const studentIds = students.map((s) => s.id);

    if (studentIds.length === 0) {
      return [];
    }

    // Get all graded submissions for these students
    const submissions = await this.prisma.test_submissions.findMany({
      where: {
        student_id: { in: studentIds },
        is_graded: true,
        tests: {
          class_id: classId,
          school_id: schoolId,
        },
      },
      include: {
        tests: {
          include: {
            questions: true,
          },
        },
      },
      orderBy: {
        submitted_at: 'asc',
      },
    });

    // Get attendance data
    const attendanceRecords = await this.prisma.attendance.findMany({
      where: {
        student_id: { in: studentIds },
        school_id: schoolId,
      },
    });

    // Group submissions by month
    const monthlyScores = new Map<
      string,
      { totalScore: number; totalMarks: number; count: number }
    >();

    submissions.forEach((submission) => {
      const date = new Date(submission.submitted_at || new Date());
      const monthKey = date.toLocaleString('en-US', { month: 'short' });

      const testMaxMarks = submission.tests.questions.reduce(
        (sum, q) => sum + (q.marks || 0),
        0,
      );

      if (!monthlyScores.has(monthKey)) {
        monthlyScores.set(monthKey, {
          totalScore: 0,
          totalMarks: 0,
          count: 0,
        });
      }

      const monthData = monthlyScores.get(monthKey)!;
      monthData.totalScore += submission.total_marks_obtained || 0;
      monthData.totalMarks += testMaxMarks;
      monthData.count += 1;
    });

    // Group attendance by month
    const monthlyAttendance = new Map<
      string,
      { present: number; total: number }
    >();

    attendanceRecords.forEach((record) => {
      const date = new Date(record.attendance_date);
      const monthKey = date.toLocaleString('en-US', { month: 'short' });

      if (!monthlyAttendance.has(monthKey)) {
        monthlyAttendance.set(monthKey, { present: 0, total: 0 });
      }

      const monthData = monthlyAttendance.get(monthKey)!;
      monthData.total += 1;
      if (record.status === 'present') {
        monthData.present += 1;
      }
    });

    // Combine data and return last 6 months
    const result = Array.from(monthlyScores.entries())
      .map(([month, data]) => ({
        month,
        avgScore:
          data.totalMarks > 0
            ? Math.round((data.totalScore / data.totalMarks) * 100)
            : 0,
        attendance: monthlyAttendance.get(month)?.total
          ? Math.round(
            (monthlyAttendance.get(month)!.present /
              monthlyAttendance.get(month)!.total) *
            100,
          )
          : 0,
      }))
      .slice(-6); // Last 6 months
    
    // Store in cache (TTL: 900 seconds = 15 minutes)
    await this.cacheManager.set(cacheKey, result, 900);
    
    return result;
  }

  /**
   * Get class average performance by subject
   */
  async getClassSubjectAverages(
    classId: string,
    schoolId: string,
  ): Promise<SubjectAverageDto[]> {
    // Get all students in the class
    const students = await this.prisma.profiles.findMany({
      where: {
        student_details: {
          class_id: classId,
        },
        school_id: schoolId,
        role_id: 4,
      },
      select: {
        id: true,
      },
    });

    const studentIds = students.map((s) => s.id);

    if (studentIds.length === 0) {
      return [];
    }

    // Get all graded submissions
    const submissions = await this.prisma.test_submissions.findMany({
      where: {
        student_id: { in: studentIds },
        is_graded: true,
        tests: {
          class_id: classId,
          school_id: schoolId,
        },
      },
      include: {
        tests: {
          include: {
            questions: true,
            grade_subjects: {
              include: {
                subjects_master: true,
              },
            },
          },
        },
      },
    });

    // Group by subject
    const subjectMap = new Map<
      string,
      { totalScore: number; totalMarks: number; studentCount: Set<string> }
    >();

    submissions.forEach((submission) => {
      const subjectName =
        submission.tests.grade_subjects?.subjects_master?.name || 'Unknown';
      const testMaxMarks = submission.tests.questions.reduce(
        (sum, q) => sum + (q.marks || 0),
        0,
      );

      if (!subjectMap.has(subjectName)) {
        subjectMap.set(subjectName, {
          totalScore: 0,
          totalMarks: 0,
          studentCount: new Set(),
        });
      }

      const subjectData = subjectMap.get(subjectName)!;
      subjectData.totalScore += submission.total_marks_obtained || 0;
      subjectData.totalMarks += testMaxMarks;
      subjectData.studentCount.add(submission.student_id);
    });

    // Calculate averages
    return Array.from(subjectMap.entries())
      .map(([subject, data]) => ({
        subject,
        avg:
          data.totalMarks > 0
            ? Math.round((data.totalScore / data.totalMarks) * 100)
            : 0,
      }))
      .sort((a, b) => b.avg - a.avg);
  }

  /**
   * Get attendance vs marks correlation data
   */
  async getAttendanceVsMarksData(
    classId: string,
    schoolId: string,
  ): Promise<AttendanceVsMarksDto[]> {
    // Get all students in the class
    const students = await this.prisma.profiles.findMany({
      where: {
        student_details: {
          class_id: classId,
        },
        school_id: schoolId,
        role_id: 4,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (students.length === 0) {
      return [];
    }

    const studentIds = students.map((s) => s.id);

    // Get attendance for each student
    const attendanceRecords = await this.prisma.attendance.findMany({
      where: {
        student_id: { in: studentIds },
        school_id: schoolId,
      },
    });

    // Get test submissions for each student
    const submissions = await this.prisma.test_submissions.findMany({
      where: {
        student_id: { in: studentIds },
        is_graded: true,
        tests: {
          class_id: classId,
          school_id: schoolId,
        },
      },
      include: {
        tests: {
          include: {
            questions: true,
          },
        },
      },
    });

    // Calculate attendance and marks for each student
    const studentData = students.map((student) => {
      // Calculate attendance percentage
      const studentAttendance = attendanceRecords.filter(
        (a) => a.student_id === student.id,
      );
      const presentDays = studentAttendance.filter(
        (a) => a.status === 'present',
      ).length;
      const totalDays = studentAttendance.length;
      const attendance =
        totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

      // Calculate average marks percentage
      const studentSubmissions = submissions.filter(
        (s) => s.student_id === student.id,
      );
      let totalMarksObtained = 0;
      let totalMaxMarks = 0;

      studentSubmissions.forEach((submission) => {
        const testMaxMarks = submission.tests.questions.reduce(
          (sum, q) => sum + (q.marks || 0),
          0,
        );
        totalMaxMarks += testMaxMarks;
        totalMarksObtained += submission.total_marks_obtained || 0;
      });

      const marks =
        totalMaxMarks > 0
          ? Math.round((totalMarksObtained / totalMaxMarks) * 100)
          : 0;

      return {
        studentId: student.id,
        studentName: student.name || 'Unknown',
        attendance,
        marks,
      };
    });

    // Calculate Pearson correlation coefficient
    const validData = studentData.filter((d) => d.attendance > 0 && d.marks > 0);
    if (validData.length < 2) {
      return studentData.map((d) => ({
        ...d,
        correlation: 0,
      }));
    }

    const meanAttendance =
      validData.reduce((sum, d) => sum + d.attendance, 0) / validData.length;
    const meanMarks =
      validData.reduce((sum, d) => sum + d.marks, 0) / validData.length;

    const numerator = validData.reduce(
      (sum, d) =>
        sum + (d.attendance - meanAttendance) * (d.marks - meanMarks),
      0,
    );

    const sumSquaredDiffAttendance = validData.reduce(
      (sum, d) => sum + Math.pow(d.attendance - meanAttendance, 2),
      0,
    );
    const sumSquaredDiffMarks = validData.reduce(
      (sum, d) => sum + Math.pow(d.marks - meanMarks, 2),
      0,
    );

    const denominator = Math.sqrt(sumSquaredDiffAttendance * sumSquaredDiffMarks);
    const correlation = denominator > 0 ? numerator / denominator : 0;

    return studentData.map((d) => ({
      ...d,
      correlation: Math.round(correlation * 100) / 100,
    }));
  }

  /**
   * Get class-wide chapter and topic performance
   */
  async getClassChapterTopicAnalytics(
    classId: string,
    schoolId: string,
    subjectId?: string,
  ): Promise<ClassChapterTopicDto> {
    // Get all students in the class
    const students = await this.prisma.profiles.findMany({
      where: {
        student_details: {
          class_id: classId,
        },
        school_id: schoolId,
        role_id: 4,
      },
      select: {
        id: true,
      },
    });

    const studentIds = students.map((s) => s.id);

    if (studentIds.length === 0) {
      return { chapters: [], topics: [] };
    }

    // Get all graded submissions
    const submissions = await this.prisma.test_submissions.findMany({
      where: {
        student_id: { in: studentIds },
        is_graded: true,
        tests: {
          class_id: classId,
          school_id: schoolId,
          ...(subjectId && { grade_subject_id: subjectId }),
        },
      },
      include: {
        student_answers: {
          include: {
            questions: true,
          },
        },
      },
    });

    // Calculate class mean mastery for chapters
    const chapterMap = new Map<
      string,
      {
        totalEarned: number;
        totalPossible: number;
        questions: number;
        studentMasteries: number[];
      }
    >();

    // Calculate class mean mastery for topics
    const topicMap = new Map<
      string,
      {
        totalEarned: number;
        totalPossible: number;
        questions: number;
        chapters: Set<string>;
        studentMasteries: number[];
      }
    >();

    // First, calculate individual student masteries
    const studentMasteries = new Map<
      string,
      Map<string, { earned: number; possible: number }>
    >(); // studentId -> topic/chapter -> mastery

    submissions.forEach((submission) => {
      if (!studentMasteries.has(submission.student_id)) {
        studentMasteries.set(submission.student_id, new Map());
      }

      const studentMastery = studentMasteries.get(submission.student_id)!;

      submission.student_answers.forEach((answer) => {
        const question = answer.questions;
        const chapter = question.chapter || 'Uncategorized';
        const topic = question.topic || 'Uncategorized';

        // Calculate earned points
        let earnedPoints = 0;
        if (question.question_type === 'MCQ') {
          // Check if selected option index matches correct option index
          const correctOptionIndex = question.correct_option_index;
          const selectedOptionIndex = answer.student_selected_option_index;
          if (
            correctOptionIndex !== null &&
            selectedOptionIndex !== null &&
            correctOptionIndex === selectedOptionIndex
          ) {
            earnedPoints = question.marks;
          }
        } else {
          earnedPoints = answer.marks_awarded || 0;
        }

        const possiblePoints = question.marks;

        // Update chapter tracking
        const chapterKey = `chapter::${chapter}`;
        if (!studentMastery.has(chapterKey)) {
          studentMastery.set(chapterKey, { earned: 0, possible: 0 });
        }
        const chapterData = studentMastery.get(chapterKey)!;
        chapterData.earned += earnedPoints;
        chapterData.possible += possiblePoints;

        // Update topic tracking
        const topicKey = `topic::${topic}`;
        if (!studentMastery.has(topicKey)) {
          studentMastery.set(topicKey, { earned: 0, possible: 0 });
        }
        const topicData = studentMastery.get(topicKey)!;
        topicData.earned += earnedPoints;
        topicData.possible += possiblePoints;
      });
    });

    // Aggregate across all students for chapters
    studentMasteries.forEach((studentMastery, studentId) => {
      studentMastery.forEach((mastery, key) => {
        if (key.startsWith('chapter::')) {
          const chapter = key.replace('chapter::', '');
          if (!chapterMap.has(chapter)) {
            chapterMap.set(chapter, {
              totalEarned: 0,
              totalPossible: 0,
              questions: 0,
              studentMasteries: [],
            });
          }

          const chapterData = chapterMap.get(chapter)!;
          chapterData.totalEarned += mastery.earned;
          chapterData.totalPossible += mastery.possible;
          if (mastery.possible > 0) {
            const masteryPercent = (mastery.earned / mastery.possible) * 100;
            chapterData.studentMasteries.push(masteryPercent);
          }
        } else if (key.startsWith('topic::')) {
          const topic = key.replace('topic::', '');
          // Find chapter for this topic from submissions
          submissions.forEach((sub) => {
            sub.student_answers.forEach((ans) => {
              if (ans.questions.topic === topic) {
                const chapter = ans.questions.chapter || 'Uncategorized';
                if (!topicMap.has(topic)) {
                  topicMap.set(topic, {
                    totalEarned: 0,
                    totalPossible: 0,
                    questions: 0,
                    chapters: new Set(),
                    studentMasteries: [],
                  });
                }

                const topicData = topicMap.get(topic)!;
                topicData.totalEarned += mastery.earned;
                topicData.totalPossible += mastery.possible;
                topicData.chapters.add(chapter);
                if (mastery.possible > 0) {
                  const masteryPercent = (mastery.earned / mastery.possible) * 100;
                  topicData.studentMasteries.push(masteryPercent);
                }
              }
            });
          });
        }
      });
    });

    // Calculate Class Mean Mastery (CMM) for chapters
    const chapters = Array.from(chapterMap.entries())
      .map(([name, data]) => {
        const classMeanMastery =
          data.studentMasteries.length > 0
            ? data.studentMasteries.reduce((a, b) => a + b, 0) /
            data.studentMasteries.length
            : 0;

        return {
          name,
          avgScore: Math.round(classMeanMastery),
          totalQuestions: data.totalPossible > 0 ? Math.ceil(data.totalPossible / (data.studentMasteries.length || 1)) : 0,
          mastery: Math.round(classMeanMastery),
        };
      })
      .sort((a, b) => b.avgScore - a.avgScore);

    // Calculate Class Mean Mastery (CMM) for topics
    const topics = Array.from(topicMap.entries())
      .map(([name, data]) => {
        const classMeanMastery =
          data.studentMasteries.length > 0
            ? data.studentMasteries.reduce((a, b) => a + b, 0) /
            data.studentMasteries.length
            : 0;

        return {
          name,
          avgScore: Math.round(classMeanMastery),
          totalQuestions: data.totalPossible > 0 ? Math.ceil(data.totalPossible / (data.studentMasteries.length || 1)) : 0,
          chapters: Array.from(data.chapters),
          mastery: Math.round(classMeanMastery),
        };
      })
      .sort((a, b) => b.avgScore - a.avgScore);

    return { chapters, topics };
  }

  /**
   * Get list of students with their average scores and attendance
   */
  async getClassStudentsWithScores(
    classId: string,
    schoolId: string,
  ): Promise<StudentWithScoreDto[]> {
    // Get all students in the class
    const students = await this.prisma.profiles.findMany({
      where: {
        student_details: {
          class_id: classId,
        },
        school_id: schoolId,
        role_id: 4,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (students.length === 0) {
      return [];
    }

    const studentIds = students.map((s) => s.id);

    // Get all graded submissions
    const submissions = await this.prisma.test_submissions.findMany({
      where: {
        student_id: { in: studentIds },
        is_graded: true,
        tests: {
          class_id: classId,
          school_id: schoolId,
        },
      },
      include: {
        tests: {
          include: {
            questions: true,
          },
        },
      },
    });

    // Get attendance records
    const attendanceRecords = await this.prisma.attendance.findMany({
      where: {
        student_id: { in: studentIds },
        school_id: schoolId,
      },
    });

    // Calculate for each student
    return students
      .map((student) => {
        // Calculate average score
        const studentSubmissions = submissions.filter(
          (s) => s.student_id === student.id,
        );
        let totalMarksObtained = 0;
        let totalMaxMarks = 0;

        studentSubmissions.forEach((submission) => {
          const testMaxMarks = submission.tests.questions.reduce(
            (sum, q) => sum + (q.marks || 0),
            0,
          );
          totalMaxMarks += testMaxMarks;
          totalMarksObtained += submission.total_marks_obtained || 0;
        });

        const avgScore =
          totalMaxMarks > 0
            ? Math.round((totalMarksObtained / totalMaxMarks) * 100)
            : 0;

        // Calculate attendance
        const studentAttendance = attendanceRecords.filter(
          (a) => a.student_id === student.id,
        );
        const presentDays = studentAttendance.filter(
          (a) => a.status === 'present',
        ).length;
        const totalDays = studentAttendance.length;
        const attendancePercentage =
          totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

        return {
          id: student.id,
          name: student.name || 'Unknown',
          avgScore,
          attendancePercentage,
        };
      })
      .sort((a, b) => b.avgScore - a.avgScore);
  }

  /**
   * Get metrics for recent tests
   */
  async getRecentTestsMetrics(
    classId: string,
    schoolId: string,
    limit: number = 10,
  ): Promise<RecentTestMetricsDto[]> {
    // Get recent tests for the class
    const tests = await this.prisma.tests.findMany({
      where: {
        class_id: classId,
        school_id: schoolId,
        is_published: true,
      },
      include: {
        questions: true,
      },
      orderBy: {
        created_at: 'desc',
      },
      take: limit,
    });

    // Get all students in the class
    const students = await this.prisma.profiles.findMany({
      where: {
        student_details: {
          class_id: classId,
        },
        school_id: schoolId,
        role_id: 4,
      },
      select: {
        id: true,
      },
    });

    const studentIds = students.map((s) => s.id);

    // Get submissions for these tests
    const submissions = await this.prisma.test_submissions.findMany({
      where: {
        test_id: { in: tests.map((t) => t.id) },
        student_id: { in: studentIds },
        is_graded: true,
      },
    });

    // Calculate metrics for each test
    return tests.map((test) => {
      const testSubmissions = submissions.filter(
        (s) => s.test_id === test.id,
      );
      const testMaxMarks = test.questions.reduce(
        (sum, q) => sum + (q.marks || 0),
        0,
      );

      if (testSubmissions.length === 0) {
        return {
          test: test.title,
          avg: 0,
          top: 0,
        };
      }

      const percentages = testSubmissions.map((sub) => {
        if (testMaxMarks === 0) return 0;
        return ((sub.total_marks_obtained || 0) / testMaxMarks) * 100;
      });

      const avg = Math.round(
        percentages.reduce((a, b) => a + b, 0) / percentages.length,
      );
      const top = Math.round(Math.max(...percentages));

      return {
        test: test.title,
        avg,
        top,
      };
    });
  }

  /**
   * Get distribution of question types across all tests
   */
  async getQuestionTypeDistribution(
    classId: string,
    schoolId: string,
  ): Promise<QuestionTypeDistributionDto[]> {
    // Get all tests for the class
    const tests = await this.prisma.tests.findMany({
      where: {
        class_id: classId,
        school_id: schoolId,
      },
      include: {
        questions: true,
      },
    });

    // Count questions by type
    const typeMap = new Map<string, number>();

    tests.forEach((test) => {
      test.questions.forEach((question) => {
        const typeName = this.mapQuestionTypeToDisplayName(question.question_type);
        typeMap.set(typeName, (typeMap.get(typeName) || 0) + 1);
      });
    });

    return Array.from(typeMap.entries()).map(([name, value]) => ({
      name,
      value,
    }));
  }

  /**
   * Get individual student analytics for teacher view
   */
  async getStudentAnalyticsForTeacher(
    studentId: string,
    classId: string,
    schoolId: string,
  ): Promise<StudentAnalyticsForTeacherDto> {
    // Get subject performance
    const subjectPerformance = await this.getStudentSubjectPerformance(
      studentId,
      schoolId,
    );

    // Get strengths and weaknesses
    const strengthsWeaknesses = await this.getStudentStrengthsWeaknesses(
      studentId,
      schoolId,
    );

    // Get progress trend
    const progress = await this.getStudentProgressTrend(studentId, schoolId);

    // Get chapter/topic analytics
    const chapterTopic = await this.getStudentChapterTopicAnalytics(
      studentId,
      schoolId,
    );

    // Get attendance details
    const attendanceRecords = await this.prisma.attendance.findMany({
      where: {
        student_id: studentId,
        school_id: schoolId,
      },
    });

    const presentDays = attendanceRecords.filter(
      (r) => r.status === 'present',
    ).length;
    const totalDays = attendanceRecords.length;
    const attendancePercentage =
      totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

    // Format radar data
    const radar = subjectPerformance.map((s) => ({
      subject: s.subject,
      A: s.percentage,
      B: 100, // Full mark reference
    }));

    return {
      radar,
      strengths: strengthsWeaknesses.strengths,
      weaknesses: strengthsWeaknesses.weaknesses,
      progress,
      attendance: {
        percentage: attendancePercentage,
        presentDays,
        totalDays,
      },
      chapterTopic,
    };
  }

  // Helper method to map question type enum to display name
  private mapQuestionTypeToDisplayName(
    questionType: string,
  ): string {
    const typeMap: Record<string, string> = {
      MCQ: 'MCQ',
      Essay: 'Essay',
      Short_Answer: 'Short Answer',
      Very_Short_Answer: 'Very Short Answer',
    };
    return typeMap[questionType] || questionType;
  }
}

