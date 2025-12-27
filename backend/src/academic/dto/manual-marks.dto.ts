import { IsString, IsNotEmpty, IsArray, IsNumber, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

class StudentMarkDto {
  @IsString()
  @IsNotEmpty()
  student_id: string;

  @IsNumber()
  marks_obtained: number;
}

export class SaveManualMarksDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  class_id: string;

  @IsString()
  @IsNotEmpty()
  grade_subject_id: string;

  @IsNumber()
  @IsNotEmpty()
  exam_type_id: number;

  @IsNumber()
  @IsNotEmpty()
  max_marks: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StudentMarkDto)
  marks: StudentMarkDto[];

  @IsOptional()
  @IsString()
  description?: string;
}
