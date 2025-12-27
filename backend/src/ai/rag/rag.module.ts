import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RagService } from './rag.service';
import { RagController } from './rag.controller';
import { EmbeddingService } from './embedding.service';
import { IngestionService } from './ingestion.service';
import { LanguageDetectorService } from './language-detector.service';

@Module({
    imports: [ConfigModule],
    controllers: [RagController],
    providers: [
        RagService,
        EmbeddingService,
        IngestionService,
        LanguageDetectorService,
    ],
    exports: [
        RagService,
        EmbeddingService,
        IngestionService,
        LanguageDetectorService,
    ],
})
export class RagModule {}
