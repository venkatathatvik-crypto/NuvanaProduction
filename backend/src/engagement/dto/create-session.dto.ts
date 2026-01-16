import { IsUUID, IsOptional, IsString } from 'class-validator';

export class CreateSessionDto {
  @IsUUID()
  school_id: string;

  @IsUUID()
  teacher_id: string;

  @IsUUID()
  class_id: string;

  @IsOptional()
  @IsUUID()
  file_id?: string;

  @IsOptional()
  @IsString()
  session_name?: string;
}
