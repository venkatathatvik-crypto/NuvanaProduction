import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { TestService } from './test.service';
import {
  CreateTestDto,
  UpdateTestDto,
  SubmitTestDto,
  GradeSubmissionDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Tenant } from '../auth/decorators/tenant.decorator';

@Controller('tests')
@UseGuards(JwtAuthGuard)
export class TestController {
  constructor(private readonly testService: TestService) {}

  // ==================== TEACHER ENDPOINTS ====================

  @Post()
  async createTest(@Body() dto: CreateTestDto, @Tenant() schoolId: string) {
    return this.testService.createTest(dto, schoolId);
  }

  @Get('teacher/:teacherId')
  async getTeacherTests(
    @Param('teacherId') teacherId: string,
    @Tenant() schoolId: string,
  ) {
    return this.testService.getTeacherTests(teacherId, schoolId);
  }

  @Get('grading-queue/teacher/:teacherId')
  async getTeacherGradingQueue(
    @Param('teacherId') teacherId: string,
    @Tenant() schoolId: string,
  ) {
    return this.testService.getTeacherGradingQueue(teacherId, schoolId);
  }

  @Get(':id/teacher/:teacherId')
  async getTeacherTest(
    @Param('id') id: string,
    @Param('teacherId') teacherId: string,
    @Tenant() schoolId: string,
  ) {
    return this.testService.getTeacherTest(id, teacherId, schoolId);
  }

  @Patch(':id/teacher/:teacherId')
  async updateTest(
    @Param('id') id: string,
    @Param('teacherId') teacherId: string,
    @Body() dto: UpdateTestDto,
    @Tenant() schoolId: string,
  ) {
    return this.testService.updateTest(id, dto, teacherId, schoolId);
  }

  @Patch(':id/publish/:teacherId')
  async publishTest(
    @Param('id') id: string,
    @Param('teacherId') teacherId: string,
    @Body() body: { is_published: boolean },
    @Tenant() schoolId: string,
  ) {
    return this.testService.publishTest(
      id,
      teacherId,
      schoolId,
      body.is_published,
    );
  }

  @Delete(':id/teacher/:teacherId')
  async deleteTest(
    @Param('id') id: string,
    @Param('teacherId') teacherId: string,
    @Tenant() schoolId: string,
  ) {
    return this.testService.deleteTest(id, teacherId, schoolId);
  }

  @Get(':id/submissions/teacher/:teacherId')
  async getTestSubmissions(
    @Param('id') id: string,
    @Param('teacherId') teacherId: string,
    @Tenant() schoolId: string,
  ) {
    return this.testService.getTestSubmissions(id, teacherId, schoolId);
  }

  @Post('submissions/grade/:teacherId')
  async gradeSubmission(
    @Param('teacherId') teacherId: string,
    @Body() dto: GradeSubmissionDto,
    @Tenant() schoolId: string,
  ) {
    return this.testService.gradeSubmission(dto, teacherId, schoolId);
  }

  // ==================== STUDENT ENDPOINTS ====================

  @Get('student/class/:classId/student/:studentId')
  async getStudentTests(
    @Param('classId') classId: string,
    @Param('studentId') studentId: string,
    @Tenant() schoolId: string,
  ) {
    return this.testService.getStudentTests(classId, studentId, schoolId);
  }

  @Get(':id/student/:studentId')
  async getStudentTest(
    @Param('id') id: string,
    @Param('studentId') studentId: string,
    @Tenant() schoolId: string,
  ) {
    return this.testService.getStudentTest(id, studentId, schoolId);
  }

  @Post('submit')
  async submitTest(@Body() dto: SubmitTestDto, @Tenant() schoolId: string) {
    return this.testService.submitTest(dto, schoolId);
  }

  @Get('submissions/:id/student/:studentId')
  async getStudentSubmission(
    @Param('id') id: string,
    @Param('studentId') studentId: string,
    @Tenant() schoolId: string,
  ) {
    return this.testService.getStudentSubmission(id, studentId, schoolId);
  }

  @Get('student/:studentId/graded')
  async getStudentGradedTests(
    @Param('studentId') studentId: string,
    @Tenant() schoolId: string,
  ) {
    return this.testService.getStudentGradedTests(studentId, schoolId);
  }

  @Get(':testId/submission/student/:studentId')
  async getSubmissionByTestAndStudent(
    @Param('testId') testId: string,
    @Param('studentId') studentId: string,
    @Tenant() schoolId: string,
  ) {
    return this.testService.getSubmissionByTestAndStudent(testId, studentId, schoolId);
  }
}
