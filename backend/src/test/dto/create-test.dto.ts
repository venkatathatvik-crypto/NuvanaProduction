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
  IsIn,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum QuestionType {
  MCQ = 'MCQ',
  Essay = 'Essay',
  Short_Answer = 'Short Answer',
  Very_Short_Answer = 'Very Short Answer',
  // Also accept enum keys directly
  Short_Answer_Key = 'Short_Answer',
  Very_Short_Answer_Key = 'Very_Short_Answer',
}

export class CreateQuestionDto {
  @IsOptional()
  @IsUUID()
  id?: string; // Optional ID for updates

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

  @IsIn(['MCQ', 'Essay', 'Short Answer', 'Very Short Answer', 'Short_Answer', 'Very_Short_Answer'], {
    message: 'question_type must be one of the following values: MCQ, Essay, Short Answer, Very Short Answer',
  })
  question_type: QuestionType | 'Short_Answer' | 'Very_Short_Answer';

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
