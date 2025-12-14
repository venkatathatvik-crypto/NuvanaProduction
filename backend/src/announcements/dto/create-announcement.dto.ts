import { IsString, IsBoolean, IsArray, IsUUID, IsOptional } from 'class-validator';

export class CreateAnnouncementDto {
  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsBoolean()
  @IsOptional()
  isUrgent?: boolean;

  @IsArray()
  @IsUUID('4', { each: true })
  classIds: string[];

  @IsUUID()
  teacherId: string;
}
