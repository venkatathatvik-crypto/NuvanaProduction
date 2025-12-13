import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateGradeDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class UpdateGradeDto {
  @IsString()
  @IsOptional()
  name?: string;
}

export class GradeResponseDto {
  id: number;
  name: string;
  school_id: string;
  created_at: Date;
}
