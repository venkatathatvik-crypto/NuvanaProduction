import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class UpdateAnnouncementDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  message?: string;

  @IsBoolean()
  @IsOptional()
  isUrgent?: boolean;
}
