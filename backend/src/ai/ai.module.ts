import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { GeminiProvider } from './llm/gemini.provider';
import { RagModule } from './rag/rag.module';
import { MasteryService } from './recommender/mastery.service';
import { RecommendationService } from './recommender/recommendation.service';
import { TopicsService } from './recommender/topics.service';

@Module({
    imports: [
        ConfigModule,   // 👈 REQUIRED for GEMINI_API_KEY
        RagModule,
    ],
    controllers: [AiController],
    providers: [
        AiService,
        GeminiProvider,
        MasteryService,
        RecommendationService,
        TopicsService,
    ],
})
export class AiModule { }
