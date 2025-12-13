import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';

export enum ExamTypeCategory {
  INTERNAL_ASSESSMENT = 'Internal_Assessment',
  SCHOOL_EXAM = 'School_Exam',
}

export class CreateExamTypeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  type: string; // 'Internal Assessment' or 'School Exam' (exact database values)
}

export class UpdateExamTypeDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(ExamTypeCategory)
  @IsOptional()
  type?: ExamTypeCategory;
}

export class ExamTypeResponseDto {
  id: number;
  name: string;
  type: ExamTypeCategory;
  school_id: string;
  created_at: Date;
}
