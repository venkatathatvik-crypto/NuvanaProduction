import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, GenerativeModel, TaskType } from '@google/generative-ai';

@Injectable()
export class EmbeddingService implements OnModuleInit {
    private readonly logger = new Logger(EmbeddingService.name);
    private genAI: GoogleGenerativeAI | null = null;
    private documentModel: GenerativeModel | null = null;
    private queryModel: GenerativeModel | null = null;
    private isEnabled = false;
    private apiKey: string | null = null;
    private readonly MODEL_NAME = 'gemini-embedding-001';

    constructor(private configService: ConfigService) {}

    onModuleInit() {
        const apiKey = this.configService.get<string>('GEMINI_API_KEY');
        
        if (!apiKey || apiKey.trim() === '') {
            this.logger.warn('⚠️ EmbeddingService DISABLED: GEMINI_API_KEY not set');
            this.logger.warn('   RAG functionality will not work without embeddings');
            return;
        }

        try {
            this.apiKey = apiKey.trim();
            this.genAI = new GoogleGenerativeAI(this.apiKey);
            
            // Initialize models with v1 API version for text-embedding-004 support
            // We use the base SDK to have full control over apiVersion
            this.documentModel = this.genAI.getGenerativeModel(
                { model: this.MODEL_NAME },
                { apiVersion: 'v1' }
            );

            this.queryModel = this.genAI.getGenerativeModel(
                { model: this.MODEL_NAME },
                { apiVersion: 'v1' }
            );

            this.isEnabled = true;
            this.logger.log(`✓ EmbeddingService enabled with official Google AI SDK (Model: ${this.MODEL_NAME}, API: v1)`);
        } catch (error) {
            this.logger.error('❌ Failed to initialize EmbeddingService:', error);
            this.isEnabled = false;
        }
    }

    /**
     * Generate embedding vector for given text using official Google AI SDK
     * Uses RETRIEVAL_DOCUMENT task type for document embeddings
     * @param text - Text to generate embedding for
     * @returns Array of numbers representing the embedding vector, or empty array if unavailable
     */
    async generateEmbedding(text: string): Promise<number[]> {
        if (!this.isEnabled || !this.documentModel) {
            this.logger.debug('Embedding generation skipped: service not enabled');
            return [];
        }

        if (!text || text.trim().length === 0) {
            this.logger.warn('Empty text provided for embedding generation');
            return [];
        }

        try {
            // Clean text: remove newlines and extra spaces
            const cleanText = text.replace(/\n+/g, ' ').trim();

            if (cleanText.length === 0) {
                return [];
            }

            // Using official SDK embedContent method
            const result = await this.documentModel.embedContent({
                content: { role: 'user', parts: [{ text: cleanText }] },
                taskType: TaskType.RETRIEVAL_DOCUMENT
            });

            const embedding = result.embedding.values;

            if (!embedding || embedding.length === 0) {
                this.logger.warn('Empty embedding returned from official SDK');
                return [];
            }

            this.logger.debug(`Generated embedding: ${embedding.length} dimensions`);
            return embedding;
        } catch (error) {
            this.logger.error('Error generating embedding:', error);
            // Return empty array on error (graceful degradation)
            return [];
        }
    }

    /**
     * Generate embedding for a query (optimized for search)
     * Uses RETRIEVAL_QUERY task type for better query matching
     */
    async generateQueryEmbedding(query: string): Promise<number[]> {
        if (!this.isEnabled || !this.queryModel) {
            return [];
        }

        if (!query || query.trim().length === 0) {
            return [];
        }

        try {
            const cleanQuery = query.replace(/\n+/g, ' ').trim();

            if (cleanQuery.length === 0) {
                return [];
            }

            // Using official SDK embedContent method for query
            const result = await this.queryModel.embedContent({
                content: { role: 'user', parts: [{ text: cleanQuery }] },
                taskType: TaskType.RETRIEVAL_QUERY
            });

            const embedding = result.embedding.values;
            return embedding || [];
        } catch (error) {
            this.logger.error('Error generating query embedding:', error);
            return [];
        }
    }
}
