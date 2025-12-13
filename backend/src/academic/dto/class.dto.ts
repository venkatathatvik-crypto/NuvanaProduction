import { IsString, IsNotEmpty, IsInt, IsOptional } from 'class-validator';

export class CreateClassDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  @IsNotEmpty()
  grade_level_id: number;
}

export class UpdateClassDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsInt()
  @IsOptional()
  grade_level_id?: number;
}

export class ClassResponseDto {
  id: string;
  name: string;
  school_id: string;
  grade_level_id: number;
  grade_levels?: {
    id: number;
    name: string;
  };
  created_at: Date;
}
