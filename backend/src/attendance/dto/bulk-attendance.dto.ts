import {
  IsString,
  IsUUID,
  IsDateString,
  IsArray,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AttendanceStudentDto } from './mark-attendance.dto';

export class BulkMarkAttendanceDto {
  @IsUUID()
  classId: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsDateString({}, { each: true })
  attendanceDates: string[];

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AttendanceStudentDto)
  students: AttendanceStudentDto[];

  @IsUUID()
  teacherId: string;
}
