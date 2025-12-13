import { IsString, IsNotEmpty, IsEmail } from 'class-validator';

export class OnboardSchoolDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  admin_email: string;

  @IsString()
  @IsNotEmpty()
  admin_password: string;

  @IsString()
  @IsNotEmpty()
  admin_name: string;
}
