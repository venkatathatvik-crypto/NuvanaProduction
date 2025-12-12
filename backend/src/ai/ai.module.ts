import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { RagModule } from './rag/rag.module';
import { MasteryService } from './recommender/mastery.service';
import { RecommendationService } from './recommender/recommendation.service';
import { TopicsService } from './recommender/topics.service';

@Module({
    imports: [RagModule],
    controllers: [AiController],
    providers: [
        AiService,
        MasteryService,
        RecommendationService,
        TopicsService,
    ],
})
export class AiModule { }
