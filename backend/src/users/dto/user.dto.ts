import { IsString, IsOptional, IsUUID, IsDate, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  avatar_url?: string;
}

export class CreateStudentDetailsDto {
  @IsString()
  @IsOptional()
  roll_number?: string;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  admission_date?: Date;

  @IsString()
  @IsOptional()
  parent_contact?: string;

  @IsUUID()
  @IsOptional()
  class_id?: string;
}

export class CreateTeacherDetailsDto {
  @IsString()
  @IsOptional()
  bio?: string;

  @IsString()
  @IsOptional()
  specialization?: string;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  joining_date?: Date;
}
