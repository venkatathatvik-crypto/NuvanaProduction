import { IsString, IsNotEmpty, IsInt, Min, IsNumberString } from 'class-validator';
import { Type } from 'class-transformer';

export class UploadVoiceNoteDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  classId: string;

  @IsString()
  @IsNotEmpty()
  gradeSubjectId: string;

  @IsNumberString()
  @IsNotEmpty()
  durationSeconds: string; // Will be converted to number in service
}

