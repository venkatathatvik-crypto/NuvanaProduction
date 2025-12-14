import { IsUUID, IsInt, IsOptional, Min } from 'class-validator';

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

  @IsOptional()
  @IsInt()
  @Min(0)
  total_marks_obtained?: number;
}
