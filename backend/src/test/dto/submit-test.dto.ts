import {
  IsUUID,
  IsArray,
  ValidateNested,
  IsOptional,
  IsInt,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class StudentAnswerDto {
  @IsUUID()
  question_id: string;

  @IsOptional()
  @IsInt()
  student_selected_option_index?: number;

  @IsOptional()
  @IsString()
  subjective_answer_text?: string;
}

export class SubmitTestDto {
  @IsUUID()
  test_id: string;

  @IsUUID()
  student_id: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StudentAnswerDto)
  answers: StudentAnswerDto[];
}
