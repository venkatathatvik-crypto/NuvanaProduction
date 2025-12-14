import {
  IsString,
  IsUUID,
  IsDateString,
  IsArray,
  ValidateNested,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AttendanceStudentDto {
  @IsUUID()
  id: string;

  @IsString()
  name: string;

  @IsString()
  roll_number: string;

  @IsBoolean()
  present: boolean;
}

export class MarkAttendanceDto {
  @IsUUID()
  classId: string;

  @IsDateString()
  attendanceDate: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceStudentDto)
  students: AttendanceStudentDto[];

  @IsUUID()
  teacherId: string;
}
