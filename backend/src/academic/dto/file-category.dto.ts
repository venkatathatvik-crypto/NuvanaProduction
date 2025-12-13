import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateFileCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class UpdateFileCategoryDto {
  @IsString()
  @IsOptional()
  name?: string;
}

export class FileCategoryResponseDto {
  id: number;
  name: string;
  school_id: string;
  created_at: Date;
}
