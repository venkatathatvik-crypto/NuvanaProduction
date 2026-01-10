import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class BroadcastWhatsappDto {
  @IsString()
  @IsNotEmpty()
  message: string;

  @IsString()
  @IsOptional()
  classId?: string;

  @IsString()
  @IsOptional()
  schoolId?: string;
  
  // For testing individual numbers from Postman
  @IsString()
  @IsOptional()
  to?: string;
}
