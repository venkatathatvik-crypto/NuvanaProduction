import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, Min, Max } from 'class-validator';

export enum AiTaskType {
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
    classBand?: string; // e.g., 'primary', 'middle', 'high', 'advanced'

    @IsString()
    @IsOptional()
    studentId?: string;

    @IsOptional()
    additionalContext?: any;
}
