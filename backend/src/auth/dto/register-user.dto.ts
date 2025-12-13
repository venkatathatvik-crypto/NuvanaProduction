import { IsEmail, IsString, MinLength, IsNotEmpty, IsInt, IsOptional, IsUUID } from 'class-validator';

export class RegisterUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  @IsNotEmpty()
  role_id: number;

  @IsUUID()
  @IsOptional()
  school_id?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  temporaryPassword: string;
}
