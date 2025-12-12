import { Injectable } from '@nestjs/common';
import * as pdf from 'pdf-parse';
import { EmbeddingService } from './embedding.service';
import { RagService } from './rag.service';

@Injectable()
export class IngestionService {
    constructor(
        private embeddingService: EmbeddingService,
        private ragService: RagService,
    ) { }

    async processFile(buffer: Buffer, metadata: any) {
        // 1. Extract Text
        const data = await pdf(buffer);
        const fullText = data.text;

        // 2. Chunking (Simple sliding window)
        const chunks = this.chunkText(fullText, 1000, 200);

        // 3. Embedding & Storing
        for (const chunk of chunks) {
            const vector = await this.embeddingService.generateEmbedding(chunk);
            await this.ragService.storeVector(vector, chunk, metadata);
        }

        return { chunksProcessed: chunks.length };
    }

    private chunkText(text: string, chunkSize: number, overlap: number): string[] {
        const chunks: string[] = [];
        for (let i = 0; i < text.length; i += (chunkSize - overlap)) {
            chunks.push(text.slice(i, i + chunkSize));
        }
        return chunks;
    }
}
