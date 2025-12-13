import { IsString, MinLength, IsNotEmpty, IsUUID } from 'class-validator';

export class ResetPasswordDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  newPassword: string;
}
