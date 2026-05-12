import { IsUUID, IsIn, IsInt, Min } from 'class-validator';

export class SubmitResponseDto {
  @IsUUID()
  question_id: string;

  @IsUUID()
  student_id: string;

  @IsIn(['A', 'B', 'C', 'D'])
  selected_option: 'A' | 'B' | 'C' | 'D';

  @IsInt()
  @Min(0)
  response_time_ms: number;
}
