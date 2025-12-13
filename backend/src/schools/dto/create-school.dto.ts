import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class CreateSchoolDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsUUID()
  @IsOptional()
  admin_profile_id?: string;
}
