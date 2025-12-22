import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, Min, Max } from 'class-validator';

export enum AiTaskType {
    START = 'start',
    EXPLAIN = 'explain',
    SOLVE = 'solve',
    DOUBT = 'doubt',
    SUMMARY = 'summary',
    EXPAND = 'expand',
    STUDY_PLAN = 'study_plan',
    PREDICT = 'predict',
    MOCK_TEST = 'mock_test',
    LIFE_SKILL = 'life_skill',
    // Teacher-specific task types
    TEACHER_LESSON_PLAN = 'teacher_lesson_plan',
    TEACHER_EMAIL_DRAFT = 'teacher_email_draft',
    TEACHER_GRADE_PAPER = 'teacher_grade_paper',
}

export class AiRequestDto {
    @IsEnum(AiTaskType)
    @IsOptional()
    taskType: AiTaskType;

    @IsString()
    @IsNotEmpty()
    query: string;

    @IsString()
    @IsOptional()
    subject?: string;

    @IsString()
    @IsOptional()
    topic?: string;

    @IsString()
    @IsOptional()
    classBand?: string; // DEPRECATED: Auto-determined from student's grade in backend. Kept for backward compatibility only.

    @IsString()
    @IsOptional()
    studentId?: string;

    @IsOptional()
    additionalContext?: any;
}
