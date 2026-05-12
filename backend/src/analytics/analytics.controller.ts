import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { Tenant } from '../auth/decorators/tenant.decorator';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  // ==================== STUDENT ANALYTICS ENDPOINTS ====================

  @Get('student/:studentId/stats-summary')
  async getStudentStatsSummary(
    @Param('studentId') studentId: string,
    @Tenant() schoolId: string,
  ) {
    return this.analyticsService.getStudentStatsSummary(studentId, schoolId);
  }

  @Get('student/:studentId/subject-performance')
  async getStudentSubjectPerformance(
    @Param('studentId') studentId: string,
    @Tenant() schoolId: string,
  ) {
    return this.analyticsService.getStudentSubjectPerformance(
      studentId,
      schoolId,
    );
  }

  @Get('student/:studentId/progress-trend')
  async getStudentProgressTrend(
    @Param('studentId') studentId: string,
    @Tenant() schoolId: string,
  ) {
    return this.analyticsService.getStudentProgressTrend(studentId, schoolId);
  }

  @Get('student/:studentId/strengths-weaknesses')
  async getStudentStrengthsWeaknesses(
    @Param('studentId') studentId: string,
    @Tenant() schoolId: string,
  ) {
    return this.analyticsService.getStudentStrengthsWeaknesses(
      studentId,
      schoolId,
    );
  }

  @Get('student/:studentId/chapter-topic-analytics')
  async getStudentChapterTopicAnalytics(
    @Param('studentId') studentId: string,
    @Tenant() schoolId: string,
  ) {
    return this.analyticsService.getStudentChapterTopicAnalytics(
      studentId,
      schoolId,
    );
  }

  // ==================== TEACHER ANALYTICS ENDPOINTS ====================

  @Get('class/:classId/performance-trend')
  async getClassPerformanceTrend(
    @Param('classId') classId: string,
    @Tenant() schoolId: string,
  ) {
    return this.analyticsService.getClassPerformanceTrend(classId, schoolId);
  }

  @Get('class/:classId/subject-averages')
  async getClassSubjectAverages(
    @Param('classId') classId: string,
    @Tenant() schoolId: string,
  ) {
    return this.analyticsService.getClassSubjectAverages(classId, schoolId);
  }

  @Get('class/:classId/attendance-vs-marks')
  async getAttendanceVsMarksData(
    @Param('classId') classId: string,
    @Tenant() schoolId: string,
  ) {
    return this.analyticsService.getAttendanceVsMarksData(classId, schoolId);
  }

  @Get('class/:classId/chapter-topic-analytics')
  async getClassChapterTopicAnalytics(
    @Param('classId') classId: string,
    @Query('subjectId') subjectId?: string,
    @Tenant() schoolId?: string,
  ) {
    return this.analyticsService.getClassChapterTopicAnalytics(
      classId,
      schoolId!,
      subjectId,
    );
  }

  @Get('class/:classId/students-with-scores')
  async getClassStudentsWithScores(
    @Param('classId') classId: string,
    @Tenant() schoolId: string,
  ) {
    return this.analyticsService.getClassStudentsWithScores(classId, schoolId);
  }

  @Get('class/:classId/recent-tests-metrics')
  async getRecentTestsMetrics(
    @Param('classId') classId: string,
    @Query('limit') limit?: string,
    @Tenant() schoolId?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.analyticsService.getRecentTestsMetrics(
      classId,
      schoolId!,
      limitNum,
    );
  }

  @Get('class/:classId/question-type-distribution')
  async getQuestionTypeDistribution(
    @Param('classId') classId: string,
    @Tenant() schoolId: string,
  ) {
    return this.analyticsService.getQuestionTypeDistribution(classId, schoolId);
  }

  @Get('student/:studentId/for-teacher')
  async getStudentAnalyticsForTeacher(
    @Param('studentId') studentId: string,
    @Query('classId') classId: string,
    @Tenant() schoolId: string,
  ) {
    return this.analyticsService.getStudentAnalyticsForTeacher(
      studentId,
      classId,
      schoolId,
    );
  }
}

