import {
  IsString,
  IsUUID,
  IsDateString,
  IsArray,
  ValidateNested,
  IsBoolean,
  IsOptional,
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
  @IsOptional()
  present?: boolean;

  @IsString()
  @IsOptional()
  status?: string;
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

  @IsUUID()
  @IsOptional()
  periodId?: string;
}
