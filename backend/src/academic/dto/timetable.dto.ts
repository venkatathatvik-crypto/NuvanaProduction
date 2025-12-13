import { IsUUID, IsNotEmpty, IsInt, IsString, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePeriodDto {
  @IsUUID()
  @IsNotEmpty()
  class_id: string;

  @IsInt()
  @Min(1)
  @Max(7)
  @IsNotEmpty()
  day_of_week: number; // 1=Monday, 7=Sunday

  @IsInt()
  @Min(1)
  @IsNotEmpty()
  period_number: number;

  @IsUUID()
  @IsNotEmpty()
  subject_id: string; // This is grade_subjects.id

  @IsUUID()
  @IsNotEmpty()
  teacher_id: string;

  @IsString()
  @IsNotEmpty()
  start_time: string; // HH:MM format

  @IsString()
  @IsNotEmpty()
  end_time: string; // HH:MM format

  @IsString()
  @IsOptional()
  room?: string;
}

export class UpdatePeriodDto {
  @IsInt()
  @Min(1)
  @IsOptional()
  period_number?: number;

  @IsUUID()
  @IsOptional()
  subject_id?: string;

  @IsUUID()
  @IsOptional()
  teacher_id?: string;

  @IsString()
  @IsOptional()
  start_time?: string;

  @IsString()
  @IsOptional()
  end_time?: string;

  @IsString()
  @IsOptional()
  room?: string;
}

export class PeriodResponseDto {
  id: string;
  timetable_day_id: string;
  period_number: number;
  subject_id: string;
  teacher_id: string;
  start_time: string;
  end_time: string;
  room?: string;
  grade_subjects?: {
    id: string;
    subjects_master?: {
      name: string;
    };
  };
  profiles?: {
    id: string;
    name: string;
  };
}

export class TimetableDayResponseDto {
  id: string;
  class_id: string;
  day_of_week: number;
  school_id: string;
  timetable_periods: PeriodResponseDto[];
}

export class WeeklyTimetableResponseDto {
  [key: number]: TimetableDayResponseDto; // key is day_of_week (1-7)
}
