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
