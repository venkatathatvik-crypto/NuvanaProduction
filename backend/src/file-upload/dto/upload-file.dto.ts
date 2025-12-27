import { IsString, IsNotEmpty, IsInt, IsOptional, IsIn, IsNumberString } from 'class-validator';
import { Type } from 'class-transformer';

export class UploadFileDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  classId?: string;

  @IsString()
  @IsNotEmpty()
  gradeSubjectId: string;

  @IsOptional()
  @IsNumberString()
  categoryId?: string;

  @IsString()
  @IsIn(['pdf', 'video'])
  fileType: 'pdf' | 'video';

  @IsString()
  @IsNotEmpty()
  teacherId: string;

  @IsString()
  @IsNotEmpty()
  schoolId: string;
}

