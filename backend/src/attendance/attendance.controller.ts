import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { MarkAttendanceDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Tenant } from '../auth/decorators/tenant.decorator';

@Controller('attendance')
@UseGuards(JwtAuthGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get('students/class/:classId')
  async getStudentsByClass(
    @Param('classId') classId: string,
    @Tenant() schoolId: string,
  ) {
    return this.attendanceService.getStudentsByClass(classId, schoolId);
  }

  @Get('class/:classId/date/:date')
  async getAttendanceForDate(
    @Param('classId') classId: string,
    @Param('date') date: string,
    @Tenant() schoolId: string,
  ) {
    return this.attendanceService.getAttendanceForDate(
      classId,
      date,
      schoolId,
    );
  }

  @Post()
  async markAttendance(
    @Body() dto: MarkAttendanceDto,
    @Tenant() schoolId: string,
  ) {
    return this.attendanceService.markAttendance(dto, schoolId);
  }

  @Get('student/:studentId/percentage')
  async getStudentAttendancePercentage(
    @Param('studentId') studentId: string,
    @Tenant() schoolId: string,
  ) {
    return this.attendanceService.getStudentAttendancePercentage(
      studentId,
      schoolId,
    );
  }

  @Get('student/:studentId/pending-tests')
  async getStudentPendingTestsCount(
    @Param('studentId') studentId: string,
    @Tenant() schoolId: string,
  ) {
    const count = await this.attendanceService.getStudentPendingTestsCount(
      studentId,
      schoolId,
    );
    return { count };
  }

  @Get('student/:studentId/pending-assessments')
  async getStudentPendingAssessmentsCount(
    @Param('studentId') studentId: string,
    @Tenant() schoolId: string,
  ) {
    const count =
      await this.attendanceService.getStudentPendingAssessmentsCount(
        studentId,
        schoolId,
      );
    return { count };
  }

  @Get('student/:studentId/average-marks')
  async getStudentAverageMarksPercentage(
    @Param('studentId') studentId: string,
    @Tenant() schoolId: string,
  ) {
    const percentage =
      await this.attendanceService.getStudentAverageMarksPercentage(
        studentId,
        schoolId,
      );
    return { percentage };
  }

  @Get('student/:studentId/by-subject')
  async getStudentAttendanceBySubject(
    @Param('studentId') studentId: string,
    @Tenant() schoolId: string,
  ) {
    return this.attendanceService.getStudentAttendanceBySubject(
      studentId,
      schoolId,
    );
  }
}
