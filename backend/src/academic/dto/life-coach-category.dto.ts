import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateLifeCoachCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class UpdateLifeCoachCategoryDto {
  @IsString()
  @IsOptional()
  name?: string;
}
