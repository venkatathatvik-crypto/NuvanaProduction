import { IsUUID, IsInt, IsOptional, Min, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class GradeAnswerDto {
  @IsUUID()
  answer_id: string;

  @IsInt()
  @Min(0)
  marks_awarded: number;
}

export class GradeSubmissionDto {
  @IsUUID()
  submission_id: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GradeAnswerDto)
  answers: GradeAnswerDto[];

  @IsOptional()
  @IsInt()
  @Min(0)
  total_marks_obtained?: number; // Optional - will be calculated if not provided
}
