import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VertexAIEmbeddings } from '@langchain/google-vertexai';

@Injectable()
export class EmbeddingService implements OnModuleInit {
    private readonly logger = new Logger(EmbeddingService.name);
    private documentEmbedder: VertexAIEmbeddings | null = null;
    private queryEmbedder: VertexAIEmbeddings | null = null;
    private isEnabled = false;
    private readonly MODEL_NAME = 'text-embedding-004';

    constructor(private configService: ConfigService) {}

    onModuleInit() {
        const projectId = this.configService.get<string>('GCP_PROJECT_ID');
        const location = this.configService.get<string>('GCP_LOCATION') || 'us-central1';
        
        // GCP_PROJECT_ID is used by VertexAIEmbeddings if provided, 
        // otherwise it falls back to GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_CLOUD_PROJECT
        
        try {
            this.documentEmbedder = new VertexAIEmbeddings({
                model: this.MODEL_NAME,
                location: location,
                // Note: project is not strictly required in the constructor 
                // if it's in the credentials or environment
            });

            this.queryEmbedder = new VertexAIEmbeddings({
                model: this.MODEL_NAME,
                location: location,
            });

            this.isEnabled = true;
            this.logger.log(`✓ EmbeddingService enabled with Vertex AI (Model: ${this.MODEL_NAME}, Region: ${location})`);
        } catch (error) {
            this.logger.error('❌ Failed to initialize EmbeddingService:', error);
            this.isEnabled = false;
        }
    }

    /**
     * Generate embedding vector for given text using LangChain Vertex AI
     * @param text - Text to generate embedding for
     * @returns Array of numbers representing the embedding vector, or empty array if unavailable
     */
    async generateEmbedding(text: string): Promise<number[]> {
        if (!this.isEnabled || !this.documentEmbedder) {
            return [];
        }

        if (!text || text.trim().length === 0) {
            return [];
        }

        try {
            const cleanText = text.replace(/\n+/g, ' ').trim();
            if (cleanText.length === 0) return [];

            const result = await this.documentEmbedder.embedQuery(cleanText);

            if (!result || result.length === 0) {
                this.logger.warn('Empty embedding returned from Vertex AI');
                return [];
            }

            this.logger.debug(`Generated embedding: ${result.length} dimensions`);
            return result;
        } catch (error) {
            this.logger.error('Error generating embedding:', error);
            return [];
        }
    }

    /**
     * Generate embedding for a query (optimized for search)
     */
    async generateQueryEmbedding(query: string): Promise<number[]> {
        if (!this.isEnabled || !this.queryEmbedder) {
            return [];
        }

        if (!query || query.trim().length === 0) {
            return [];
        }

        try {
            const cleanQuery = query.replace(/\n+/g, ' ').trim();
            if (cleanQuery.length === 0) return [];

            const result = await this.queryEmbedder.embedQuery(cleanQuery);
            return result || [];
        } catch (error) {
            this.logger.error('Error generating query embedding:', error);
            return [];
        }
    }
}
