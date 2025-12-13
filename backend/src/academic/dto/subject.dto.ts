import { IsString, IsNotEmpty, IsInt, IsArray, IsUUID } from 'class-validator';

export class CreateSubjectDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class SubjectResponseDto {
  id: string;
  name: string;
  school_id: string;
  created_at: Date;
}

export class AssignSubjectsToGradeDto {
  @IsInt()
  @IsNotEmpty()
  grade_level_id: number;

  @IsArray()
  @IsUUID('4', { each: true })
  subject_master_ids: string[];
}

export class GradeSubjectResponseDto {
  id: string;
  grade_level_id: number;
  subject_master_id: string;
  school_id: string;
  subjects_master?: {
    id: string;
    name: string;
  };
  grade_levels?: {
    id: number;
    name: string;
  };
}
