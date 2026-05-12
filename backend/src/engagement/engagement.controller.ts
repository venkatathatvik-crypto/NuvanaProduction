import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { EngagementService } from './engagement.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { SendQuestionDto } from './dto/send-question.dto';

@Controller('engagement')
export class EngagementController {
  constructor(private engagementService: EngagementService) {}

  @Post('sessions')
  async createSession(@Body() dto: CreateSessionDto) {
    return this.engagementService.createSession(dto);
  }

  @Post('sessions/:id/end')
  async endSession(@Param('id') sessionId: string) {
    return this.engagementService.endSession(sessionId);
  }

  @Post('sessions/:id/questions')
  async sendQuestion(
    @Param('id') sessionId: string,
    @Body() dto: Omit<SendQuestionDto, 'session_id'>,
  ) {
    return this.engagementService.sendQuestion({
      ...dto,
      session_id: sessionId,
    });
  }

  @Get('sessions/:id')
  async getSession(@Param('id') sessionId: string) {
    return this.engagementService.getSession(sessionId);
  }

  @Get('sessions/:id/analytics')
  async getSessionAnalytics(@Param('id') sessionId: string) {
    return this.engagementService.getSessionAnalytics(sessionId);
  }

  @Get('teacher/:teacherId/sessions')
  async getTeacherSessions(@Param('teacherId') teacherId: string) {
    return this.engagementService.getTeacherSessions(teacherId);
  }

  @Get('student/:studentId/summary')
  async getStudentSummary(@Param('studentId') studentId: string) {
    return this.engagementService.getStudentSummary(studentId);
  }

  @Get('student/:studentId/history')
  async getStudentHistory(@Param('studentId') studentId: string) {
    return this.engagementService.getStudentSessionHistory(studentId);
  }

  @Get('class/:classId/active')
  async getActiveSession(@Param('classId') classId: string) {
    return this.engagementService.getActiveSessionForClass(classId);
  }

  @Get('school/:schoolId/analytics')
  async getSchoolAnalytics(@Param('schoolId') schoolId: string) {
    return this.engagementService.getSchoolAnalytics(schoolId);
  }

  @Get('school/:schoolId/leaderboard')
  async getTeacherLeaderboard(@Param('schoolId') schoolId: string) {
    return this.engagementService.getTeacherLeaderboard(schoolId);
  }

  @Get('school/:schoolId/sessions')
  async getSchoolSessions(@Param('schoolId') schoolId: string) {
    return this.engagementService.getSchoolSessions(schoolId);
  }

  @Get('school/:schoolId/class-subject-analytics')
  async getClassSubjectAnalytics(@Param('schoolId') schoolId: string) {
    return this.engagementService.getClassSubjectAnalytics(schoolId);
  }

  @Get('sessions/:id/students')
  async getSessionStudentDetails(@Param('id') sessionId: string) {
    return this.engagementService.getSessionStudentDetails(sessionId);
  }

  @Get('sessions/:id/leaderboard')
  async getSessionLeaderboard(@Param('id') sessionId: string) {
    return this.engagementService.getSessionLeaderboard(sessionId);
  }

  // ── Tiered Dashboard Endpoints ────────────────────────────────────────────

  // Admin: grade→class breakdown + top teacher
  @Get('admin/:schoolId/dashboard')
  async getAdminDashboard(@Param('schoolId') schoolId: string) {
    return this.engagementService.getAdminDashboard(schoolId);
  }

  // Teacher: session leaderboard, topic health, at-risk students
  @Get('teacher/sessions/:sessionId/dashboard')
  async getTeacherSessionDashboard(@Param('sessionId') sessionId: string) {
    return this.engagementService.getTeacherSessionDashboard(sessionId);
  }

  // Student: last 10 scores + class rank
  @Get('student/:student_id/performance')
  async getStudentPerformance(@Param('student_id') studentId: string) {
    return this.engagementService.getStudentPerformance(studentId);
  }
}
