import {
  IsString,
  IsInt,
  IsUUID,
  IsOptional,
  IsDateString,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsEnum,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum QuestionType {
  MCQ = 'MCQ',
  Essay = 'Essay',
  Short_Answer = 'Short Answer',
  Very_Short_Answer = 'Very Short Answer',
}

export class CreateQuestionDto {
  @IsString()
  @MaxLength(5000)
  question_text: string;

  @IsInt()
  @Min(1)
  marks: number;

  @IsOptional()
  @IsString()
  chapter?: string;

  @IsOptional()
  @IsString()
  topic?: string;

  @IsEnum(QuestionType)
  question_type: QuestionType;

  @IsOptional()
  @IsInt()
  correct_option_index?: number;

  @IsOptional()
  @IsString()
  expected_answer_text?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];
}

export class CreateTestDto {
  @IsString()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @Min(1)
  duration_minutes: number;

  @IsBoolean()
  is_published: boolean;

  @IsUUID()
  class_id: string;

  @IsUUID()
  grade_subject_id: string;

  @IsInt()
  exam_type_id: number;

  @IsUUID()
  teacher_id: string;

  @IsOptional()
  @IsDateString()
  due_date?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  questions: CreateQuestionDto[];
}
