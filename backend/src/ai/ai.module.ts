import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { GeminiProvider } from './llm/gemini.provider';
import { RagModule } from './rag/rag.module';
import { MasteryService } from './recommender/mastery.service';
import { RecommendationService } from './recommender/recommendation.service';
import { TopicsService } from './recommender/topics.service';
import { QuizDeduplicationService } from './quiz-deduplication.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
    imports: [
        ConfigModule,   // 👈 REQUIRED for GEMINI_API_KEY
        PrismaModule,   // 👈 REQUIRED for database access (MasteryService, TopicsService)
        RagModule,
        AnalyticsModule, // 👈 REQUIRED for performance data
    ],
    controllers: [AiController],
    providers: [
        AiService,
        GeminiProvider,
        MasteryService,
        RecommendationService,
        TopicsService,
        QuizDeduplicationService, // Phase 3 & 4: Quiz history and deduplication
    ],
})
export class AiModule { }
