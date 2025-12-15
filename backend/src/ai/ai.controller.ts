import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiRequestDto, AiTaskType } from './dto/ai-request.dto';
import { AiResponseDto } from './dto/ai-response.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AiController {
    constructor(private readonly aiService: AiService) { }

    @Post('explain')
    @Roles('student', 'teacher', 'school_admin', 'super_admin')
    @HttpCode(HttpStatus.OK)
    async explain(@Body() dto: AiRequestDto): Promise<AiResponseDto> {
        console.log(`[AI Controller] POST /ai/explain - Request received`);
        console.log(`[AI Controller] Request body:`, JSON.stringify(dto, null, 2));
        console.log(`[AI Controller] Subject from DTO:`, dto.subject || 'Not provided');
        dto.taskType = AiTaskType.EXPLAIN;
        return this.aiService.processRequest(dto);
    }

    @Post('solve')
    @Roles('student', 'teacher', 'school_admin', 'super_admin')
    @HttpCode(HttpStatus.OK)
    async solve(@Body() dto: AiRequestDto): Promise<AiResponseDto> {
        console.log(`[AI Controller] POST /ai/solve - Request received`);
        dto.taskType = AiTaskType.SOLVE;
        return this.aiService.processRequest(dto);
    }

    @Post('doubt')
    @Roles('student', 'teacher', 'school_admin', 'super_admin')
    @HttpCode(HttpStatus.OK)
    async doubt(@Body() dto: AiRequestDto): Promise<AiResponseDto> {
        console.log(`[AI Controller] POST /ai/doubt - Request received`);
        console.log(`[AI Controller] Request body:`, JSON.stringify(dto, null, 2));
        console.log(`[AI Controller] Subject from DTO:`, dto.subject || 'Not provided');
        dto.taskType = AiTaskType.DOUBT;
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
}
