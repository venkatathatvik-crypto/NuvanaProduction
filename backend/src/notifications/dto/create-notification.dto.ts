import { IsUUID, IsString, IsOptional, IsBoolean, IsArray } from 'class-validator';

export class CreateNotificationDto {
  @IsUUID()
  recipient_id: string;

  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsString()
  @IsOptional()
  notification_type?: string;

  @IsUUID()
  @IsOptional()
  source_id?: string;

  @IsString()
  @IsOptional()
  target_url?: string;

  @IsBoolean()
  @IsOptional()
  is_urgent?: boolean;
}

export class CreateBatchNotificationDto {
  @IsArray()
  @IsUUID(undefined, { each: true })
  recipient_ids: string[];

  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsString()
  @IsOptional()
  notification_type?: string;

  @IsUUID()
  @IsOptional()
  source_id?: string;

  @IsString()
  @IsOptional()
  target_url?: string;

  @IsBoolean()
  @IsOptional()
  is_urgent?: boolean;
}

