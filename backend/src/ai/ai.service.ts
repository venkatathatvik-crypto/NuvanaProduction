import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GeminiProvider } from './llm/gemini.provider';
import { AiRequestDto, AiTaskType } from './dto/ai-request.dto';
import { AiResponseDto } from './dto/ai-response.dto';
import { RagService } from './rag/rag.service';
import { MasteryService } from './recommender/mastery.service';
import { RecommendationService } from './recommender/recommendation.service';

// Prompts
import { SYSTEM_ROOT_PROMPT } from './prompts/system.prompt';
import { ExplainPrompt } from './prompts/explain.prompt';
import { SolvePrompt } from './prompts/solve.prompt';
import { DoubtPrompt } from './prompts/doubt.prompt';
import { SummaryPrompt } from './prompts/summary.prompt';
import { ExpandPrompt } from './prompts/expand.prompt';
import { StudyPlanPrompt } from './prompts/studyplan.prompt';
import { PredictPrompt } from './prompts/predict.prompt';
import { MockTestPrompt } from './prompts/mocktest.prompt';
import { LifeSkillPrompt } from './prompts/lifeskill.prompt';

@Injectable()
export class AiService {
    constructor(
        private configService: ConfigService,
        private ragService: RagService,
        private masteryService: MasteryService,
        private recommendationService: RecommendationService,
        private llmProvider: GeminiProvider,
    ) { }

    async processRequest(dto: AiRequestDto): Promise<AiResponseDto> {
        try {
            const { taskType, query, subject, classBand, studentId, additionalContext } = dto;
            const band = classBand || 'middle';

            // 1. Context Retrieval (RAG)
            let ragContext;
            try {
                ragContext = await this.ragService.retrieve(query, subject || 'General', band);
            } catch (error) {
                console.warn('RAG Retrieval failed (Embedding/DB Error), proceeding without context:', error);
                ragContext = null;
            }

            if (!ragContext || ragContext.trim() === '') {
                ragContext = '[NO RELEVANT CONTENT FOUND]';
            }

            // 2. Student Mastery
            let masteryProfile = 'Standard';
            let difficulty = 'Medium';
            if (studentId && subject) {
                const profile = await this.masteryService.getMasteryProfile(studentId, subject);

                const hasTopics = profile.topics && Object.keys(profile.topics).length > 0;
                if (hasTopics) {
                    masteryProfile = `Overall Score: ${profile.overallScore}. Topic Mastery: ${JSON.stringify(profile.topics)}`;
                } else {
                    masteryProfile = `Overall Score: ${profile.overallScore}. No specific topic mastery data available yet.`;
                }

                if (profile.overallScore >= 0.8) difficulty = 'Hard';
                else if (profile.overallScore < 0.4) difficulty = 'Easy';
            }

            // 3. Prompt Selection
            let userPrompt = '';

            switch (taskType) {
                case AiTaskType.EXPLAIN:
                    userPrompt = ExplainPrompt(query, band, masteryProfile);
                    break;
                case AiTaskType.SOLVE:
                    userPrompt = SolvePrompt(query, band);
                    break;
                case AiTaskType.DOUBT:
                    userPrompt = DoubtPrompt(query, ragContext, band);
                    break;
                case AiTaskType.SUMMARY:
                    userPrompt = SummaryPrompt(dto.topic || query, band);
                    break;
                case AiTaskType.EXPAND:
                    userPrompt = ExpandPrompt(dto.topic || query, band);
                    break;
                case AiTaskType.STUDY_PLAN:
                    userPrompt = StudyPlanPrompt(dto.topic || query, 'Mastery', '1 Week', band);
                    break;
                case AiTaskType.PREDICT:
                    userPrompt = PredictPrompt(dto.topic || query, 'Key definition focus based on RAG', band);
                    break;
                case AiTaskType.MOCK_TEST:
                    userPrompt = MockTestPrompt([dto.topic || query], difficulty, '30 mins', band);
                    break;
                case AiTaskType.LIFE_SKILL:
                    userPrompt = LifeSkillPrompt(query, 'General Growth');
                    break;
                default:
                    userPrompt = query;
            }

            // 4. LLM Call
            const rawContent = await this.llmProvider.generate([
                { role: 'system', content: SYSTEM_ROOT_PROMPT },
                { role: 'system', content: `RAG CONTEXT: ${ragContext}` },
                { role: 'user', content: userPrompt }
            ]);

            return this.parseResponse(rawContent);

        } catch (error) {
            console.error('AI Service Error (FULL TRACE):', error);
            throw new InternalServerErrorException(`Failed to generate AI response: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    // Simple parser to map Markdown sections to DTO
    // In production, asking for JSON output from OpenAI is safer
    private parseResponse(text: string): AiResponseDto {
        const response = new AiResponseDto();
        response.rawResponse = text;

        // Basic extraction heuristics
        response.title = this.extractSection(text, 'Title') || 'AI Response';
        response.explanation = this.extractSection(text, 'Explanation') || text;
        response.personalizedFeedback = this.extractSection(text, 'Personalized Feedback');
        response.followUpQuestion = this.extractSection(text, 'Follow-up Question');

        const keyPointsRaw = this.extractSection(text, 'Key Points');
        response.keyPoints = keyPointsRaw ? keyPointsRaw.split('\n').filter(l => l.trim().startsWith('-')).map(l => l.replace('-', '').trim()) : [];

        return response;
    }

    private extractSection(text: string, sectionName: string): string | null {
        const regex = new RegExp(`### ${sectionName}\\s+([\\s\\S]*?)(?=###|$)`, 'i');
        const match = text.match(regex);
        return match ? match[1].trim() : null;
    }
}
