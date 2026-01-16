import { IsUUID, IsString, IsIn, IsInt, Min, Max } from 'class-validator';

export class SendQuestionDto {
  @IsUUID()
  session_id: string;

  @IsString()
  question_text: string;

  @IsString()
  option_a: string;

  @IsString()
  option_b: string;

  @IsString()
  option_c: string;

  @IsString()
  option_d: string;

  @IsIn(['A', 'B', 'C', 'D'])
  correct_option: 'A' | 'B' | 'C' | 'D';

  @IsInt()
  @Min(10)
  @Max(120)
  time_limit_seconds: number;

  @IsInt()
  @Min(5)
  @Max(50)
  points: number;
}
