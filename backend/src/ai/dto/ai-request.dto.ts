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
    classId?: string;

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

    // Quiz-specific parameters for explicit control
    @IsOptional()
    quizParams?: {
        questionCount?: number;
        difficulty?: 'Easy' | 'Medium' | 'Hard';
        questionTypes?: {
            mcq?: number;  // percentage (0-100)
            shortAnswer?: number;  // percentage (0-100)
            essay?: number;  // percentage (0-100)
        } | string;  // Also accepts string like 'mixed', 'mcq', 'short', 'essay'
        bloomLevels?: string[];  // e.g., ['Remember', 'Understand', 'Apply']
        chapter?: string;
        topic?: string;
    };

    // Study Plan-specific parameters for stateless slot-filling
    @IsOptional()
    studyPlanParams?: {
        days?: number;         // Number of days for the study plan (e.g., 3, 5, 7, 14)
        hoursPerDay?: number;  // Hours per day available for study (e.g., 1, 2, 3, 4)
    };

    // Life Coach category for RAG filtering
    @IsString()
    @IsOptional()
    lifeCoachCategory?: string;

    // Lesson Plan-specific parameters
    @IsOptional()
    lessonPlanParams?: {
        numberOfDays?: number;      // Number of days the lesson plan covers (e.g., 1, 2, 3, 5, 7)
        lessonDuration?: number;    // Duration of each lesson in minutes (e.g., 30, 45, 60, 90)
        objectives?: string;        // Teaching objectives
    };
}
