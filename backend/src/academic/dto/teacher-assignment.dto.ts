import { IsUUID, IsNotEmpty, IsArray } from 'class-validator';

export class AssignTeacherToClassDto {
  @IsUUID()
  @IsNotEmpty()
  teacher_id: string;

  @IsUUID()
  @IsNotEmpty()
  class_id: string;
}

export class TeacherClassResponseDto {
  id: string;
  teacher_id: string;
  class_id: string;
  school_id: string;
  created_at: Date;
  classes?: {
    id: string;
    name: string;
  };
  profiles?: {
    id: string;
    name: string;
    email: string;
  };
}

export class AssignSubjectsToTeacherDto {
  @IsUUID()
  @IsNotEmpty()
  teacher_id: string;

  @IsArray()
  @IsUUID('4', { each: true })
  grade_subject_ids: string[];
}

export class TeacherSubjectResponseDto {
  id: string;
  teacher_id: string;
  grade_subject_id: string;
  school_id: string;
  assigned_at: Date;
  grade_subjects?: {
    id: string;
    subjects_master?: {
      name: string;
    };
    grade_levels?: {
      name: string;
    };
  };
}
