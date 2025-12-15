import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class EmbeddingService {
    private readonly logger = new Logger(EmbeddingService.name);

    constructor() {
        this.logger.warn(
            'EmbeddingService DISABLED (Gemini-only mode)'
        );
    }

    async generateEmbedding(_: string): Promise<number[]> {
        this.logger.warn(
            'Embedding request skipped. Returning empty embedding.'
        );

        // Return dummy vector to keep pipeline alive
        return [];
    }
}
