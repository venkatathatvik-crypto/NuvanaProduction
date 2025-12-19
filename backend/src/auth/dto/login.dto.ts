import { IsEmail, IsString, MinLength, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsUUID()
  @IsOptional()
  school_id?: string;

  @IsString()
  @IsOptional()
  expectedRole?: string;
}
