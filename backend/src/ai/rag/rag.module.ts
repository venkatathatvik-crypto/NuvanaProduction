import { Module } from '@nestjs/common';
import { RagService } from './rag.service';
import { EmbeddingService } from './embedding.service';
import { IngestionService } from './ingestion.service';

@Module({
    providers: [RagService, EmbeddingService, IngestionService],
    exports: [RagService, IngestionService],
})
export class RagModule { }
