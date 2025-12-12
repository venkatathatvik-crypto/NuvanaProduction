import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiRequestDto, AiTaskType } from './dto/ai-request.dto';
import { AiResponseDto } from './dto/ai-response.dto';

@Controller('ai')
export class AiController {
    constructor(private readonly aiService: AiService) { }

    @Post('explain')
    @HttpCode(HttpStatus.OK)
    async explain(@Body() dto: AiRequestDto): Promise<AiResponseDto> {
        dto.taskType = AiTaskType.EXPLAIN;
        return this.aiService.processRequest(dto);
    }

    @Post('solve')
    @HttpCode(HttpStatus.OK)
    async solve(@Body() dto: AiRequestDto): Promise<AiResponseDto> {
        dto.taskType = AiTaskType.SOLVE;
        return this.aiService.processRequest(dto);
    }

    @Post('doubt')
    @HttpCode(HttpStatus.OK)
    async doubt(@Body() dto: AiRequestDto): Promise<AiResponseDto> {
        dto.taskType = AiTaskType.DOUBT;
        return this.aiService.processRequest(dto);
    }

    @Post('summary')
    @HttpCode(HttpStatus.OK)
    async summary(@Body() dto: AiRequestDto): Promise<AiResponseDto> {
        dto.taskType = AiTaskType.SUMMARY;
        return this.aiService.processRequest(dto);
    }

    @Post('expand')
    @HttpCode(HttpStatus.OK)
    async expand(@Body() dto: AiRequestDto): Promise<AiResponseDto> {
        dto.taskType = AiTaskType.EXPAND;
        return this.aiService.processRequest(dto);
    }

    @Post('studyplan')
    @HttpCode(HttpStatus.OK)
    async studyPlan(@Body() dto: AiRequestDto): Promise<AiResponseDto> {
        dto.taskType = AiTaskType.STUDY_PLAN;
        return this.aiService.processRequest(dto);
    }

    @Post('predict')
    @HttpCode(HttpStatus.OK)
    async predict(@Body() dto: AiRequestDto): Promise<AiResponseDto> {
        dto.taskType = AiTaskType.PREDICT;
        return this.aiService.processRequest(dto);
    }

    @Post('mocktest')
    @HttpCode(HttpStatus.OK)
    async mockTest(@Body() dto: AiRequestDto): Promise<AiResponseDto> {
        dto.taskType = AiTaskType.MOCK_TEST;
        return this.aiService.processRequest(dto);
    }

    @Post('lifeskill')
    @HttpCode(HttpStatus.OK)
    async lifeSkill(@Body() dto: AiRequestDto): Promise<AiResponseDto> {
        dto.taskType = AiTaskType.LIFE_SKILL;
        return this.aiService.processRequest(dto);
    }
}
