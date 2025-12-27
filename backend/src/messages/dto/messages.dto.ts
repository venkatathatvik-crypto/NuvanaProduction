import { IsString, IsUUID, IsBoolean, IsOptional } from 'class-validator';

export class SendMessageDto {
  @IsUUID()
  recipientId: string;

  @IsString()
  subject: string;

  @IsString()
  message: string;

  @IsBoolean()
  @IsOptional()
  isUrgent?: boolean;
}

export class MarkAsReadDto {
  @IsUUID()
  messageId: string;
}
