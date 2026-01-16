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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('engagement')
@UseGuards(JwtAuthGuard)
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
}
