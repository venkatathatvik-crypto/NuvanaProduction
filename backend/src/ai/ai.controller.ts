import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Request } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AiService } from './ai.service';
import { AiRequestDto, AiTaskType } from './dto/ai-request.dto';
import { AiResponseDto } from './dto/ai-response.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('ai')
@UseGuards(RolesGuard)
@Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 AI requests per minute
export class AiController {
    constructor(private readonly aiService: AiService) { }

    @Post('start')
    @Roles('student', 'teacher', 'school_admin', 'super_admin')
    @HttpCode(HttpStatus.OK)
    async start(@Body() dto: AiRequestDto, @Request() req): Promise<AiResponseDto> {
        console.log(`[AI Controller] POST /ai/start - Request received (Default Mode)`);
        dto.taskType = AiTaskType.START;
        dto.additionalContext = { ...dto.additionalContext, userId: req.user.id, roleId: req.user.role_id, schoolId: req.user.school_id };
        return this.aiService.processRequest(dto);
    }

    @Post('explain')
    @Roles('student', 'teacher', 'school_admin', 'super_admin')
    @HttpCode(HttpStatus.OK)
    async explain(@Body() dto: AiRequestDto, @Request() req): Promise<AiResponseDto> {
        console.log(`[AI Controller] POST /ai/explain - Request received`);
        dto.taskType = AiTaskType.EXPLAIN;
        dto.additionalContext = { ...dto.additionalContext, userId: req.user.id, roleId: req.user.role_id, schoolId: req.user.school_id };
        return this.aiService.processRequest(dto);
    }

    @Post('solve')
    @Roles('student', 'teacher', 'school_admin', 'super_admin')
    @HttpCode(HttpStatus.OK)
    async solve(@Body() dto: AiRequestDto, @Request() req): Promise<AiResponseDto> {
        console.log(`[AI Controller] POST /ai/solve - Request received`);
        dto.taskType = AiTaskType.SOLVE;
        dto.additionalContext = { ...dto.additionalContext, userId: req.user.id, roleId: req.user.role_id, schoolId: req.user.school_id };
        return this.aiService.processRequest(dto);
    }

    @Post('doubt')
    @Roles('student', 'teacher', 'school_admin', 'super_admin')
    @HttpCode(HttpStatus.OK)
    async doubt(@Body() dto: AiRequestDto, @Request() req): Promise<AiResponseDto> {
        console.log(`[AI Controller] POST /ai/doubt - Request received`);
        dto.taskType = AiTaskType.DOUBT;
        dto.additionalContext = { ...dto.additionalContext, userId: req.user.id, roleId: req.user.role_id, schoolId: req.user.school_id };
        return this.aiService.processRequest(dto);
    }

    @Post('summary')
    @Roles('student', 'teacher', 'school_admin', 'super_admin')
    @HttpCode(HttpStatus.OK)
    async summary(@Body() dto: AiRequestDto): Promise<AiResponseDto> {
        console.log(`[AI Controller] POST /ai/summary - Request received`);
        dto.taskType = AiTaskType.SUMMARY;
        return this.aiService.processRequest(dto);
    }

    @Post('expand')
    @Roles('student', 'teacher', 'school_admin', 'super_admin')
    @HttpCode(HttpStatus.OK)
    async expand(@Body() dto: AiRequestDto): Promise<AiResponseDto> {
        console.log(`[AI Controller] POST /ai/expand - Request received`);
        dto.taskType = AiTaskType.EXPAND;
        return this.aiService.processRequest(dto);
    }

    @Post('studyplan')
    @Roles('student', 'teacher', 'school_admin', 'super_admin')
    @HttpCode(HttpStatus.OK)
    async studyPlan(@Body() dto: AiRequestDto): Promise<AiResponseDto> {
        console.log(`[AI Controller] POST /ai/studyplan - Request received`);
        dto.taskType = AiTaskType.STUDY_PLAN;
        return this.aiService.processRequest(dto);
    }

    @Post('predict')
    @Roles('student', 'teacher', 'school_admin', 'super_admin')
    @HttpCode(HttpStatus.OK)
    async predict(@Body() dto: AiRequestDto): Promise<AiResponseDto> {
        console.log(`[AI Controller] POST /ai/predict - Request received`);
        dto.taskType = AiTaskType.PREDICT;
        return this.aiService.processRequest(dto);
    }

    @Post('mocktest')
    @Roles('student', 'teacher', 'school_admin', 'super_admin')
    @HttpCode(HttpStatus.OK)
    async mockTest(@Body() dto: AiRequestDto): Promise<AiResponseDto> {
        console.log(`[AI Controller] POST /ai/mocktest - Request received`);
        dto.taskType = AiTaskType.MOCK_TEST;
        return this.aiService.processRequest(dto);
    }

    @Post('lifeskill')
    @Roles('student', 'teacher', 'school_admin', 'super_admin')
    @HttpCode(HttpStatus.OK)
    async lifeSkill(@Body() dto: AiRequestDto): Promise<AiResponseDto> {
        console.log(`[AI Controller] POST /ai/lifeskill - Request received`);
        dto.taskType = AiTaskType.LIFE_SKILL;
        return this.aiService.processRequest(dto);
    }

    // ==================== TEACHER AI FEATURES ====================

    @Post('teacherlessonplan')
    @Roles('teacher', 'school_admin', 'super_admin')
    @HttpCode(HttpStatus.OK)
    async teacherLessonPlan(@Body() dto: AiRequestDto, @Request() req): Promise<AiResponseDto> {
        console.log(`[AI Controller] POST /ai/teacherlessonplan - Request received`);
        dto.taskType = AiTaskType.TEACHER_LESSON_PLAN;
        dto.additionalContext = { ...dto.additionalContext, userId: req.user.id, roleId: req.user.role_id, schoolId: req.user.school_id };
        return this.aiService.processRequest(dto);
    }

    @Post('teacheremaildraft')
    @Roles('teacher', 'school_admin', 'super_admin')
    @HttpCode(HttpStatus.OK)
    async teacherEmailDraft(@Body() dto: AiRequestDto, @Request() req): Promise<AiResponseDto> {
        console.log(`[AI Controller] POST /ai/teacheremaildraft - Request received`);
        dto.taskType = AiTaskType.TEACHER_EMAIL_DRAFT;
        dto.additionalContext = { ...dto.additionalContext, userId: req.user.id, roleId: req.user.role_id, schoolId: req.user.school_id };
        return this.aiService.processRequest(dto);
    }

    @Post('teachergradepaper')
    @Roles('teacher', 'school_admin', 'super_admin')
    @HttpCode(HttpStatus.OK)
    async teacherGradePaper(@Body() dto: AiRequestDto, @Request() req): Promise<AiResponseDto> {
        console.log(`[AI Controller] POST /ai/teachergradepaper - Request received`);
        dto.taskType = AiTaskType.TEACHER_GRADE_PAPER;
        dto.additionalContext = { ...dto.additionalContext, userId: req.user.id, roleId: req.user.role_id, schoolId: req.user.school_id };
        return this.aiService.processRequest(dto);
    }
}
