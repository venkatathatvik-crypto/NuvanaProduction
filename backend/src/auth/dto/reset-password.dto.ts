import { IsEmail, IsString, MinLength, IsNotEmpty, IsOptional, IsUUID, Length } from 'class-validator';

export class ResetPasswordDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsUUID()
  @IsOptional()
  school_id?: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  otp: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  newPassword: string;
}
