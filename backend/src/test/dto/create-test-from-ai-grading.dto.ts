import { IsString, IsNotEmpty, IsNumber, IsOptional, IsUUID, Min, Max } from 'class-validator';

export class CreateTestFromAiGradingDto {
  @IsUUID()
  @IsNotEmpty()
  student_id: string;

  @IsString()
  @IsNotEmpty()
  test_name: string;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsUUID()
  @IsNotEmpty()
  class_id: string;

  @IsNumber()
  @Min(1)
  total_marks: number;

  @IsNumber()
  @Min(0)
  marks_obtained: number;

  @IsString()
  @IsNotEmpty()
  ai_feedback: string;

  @IsOptional()
  @IsString()
  test_date?: string; // ISO date string, defaults to today

  @IsUUID()
  @IsNotEmpty()
  teacher_id: string;

  @IsUUID()
  @IsNotEmpty()
  school_id: string;

  @IsOptional()
  @IsNumber()
  exam_type_id?: number; // Defaults to a generic "Assignment" type
}
