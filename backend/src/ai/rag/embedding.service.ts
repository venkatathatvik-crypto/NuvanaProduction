import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { TaskType } from '@google/generative-ai';

@Injectable()
export class EmbeddingService implements OnModuleInit {
    private readonly logger = new Logger(EmbeddingService.name);
    private embeddings: GoogleGenerativeAIEmbeddings | null = null;
    private queryEmbeddings: GoogleGenerativeAIEmbeddings | null = null;
    private isEnabled = false;
    private apiKey: string | null = null;

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
            
            // Initialize embeddings for documents (RETRIEVAL_DOCUMENT task type)
            this.embeddings = new GoogleGenerativeAIEmbeddings({
                modelName: 'text-embedding-004',
                apiKey: this.apiKey,
                taskType: TaskType.RETRIEVAL_DOCUMENT,
            });

            // Initialize embeddings for queries (RETRIEVAL_QUERY task type)
            this.queryEmbeddings = new GoogleGenerativeAIEmbeddings({
                modelName: 'text-embedding-004',
                apiKey: this.apiKey,
                taskType: TaskType.RETRIEVAL_QUERY,
            });

            this.isEnabled = true;
            this.logger.log('✓ EmbeddingService enabled with LangChain GoogleGenerativeAIEmbeddings');
        } catch (error) {
            this.logger.error('❌ Failed to initialize EmbeddingService:', error);
            this.isEnabled = false;
        }
    }

    /**
     * Generate embedding vector for given text using LangChain GoogleGenerativeAIEmbeddings
     * Uses RETRIEVAL_DOCUMENT task type for document embeddings
     * @param text - Text to generate embedding for
     * @returns Array of numbers representing the embedding vector, or empty array if unavailable
     */
    async generateEmbedding(text: string): Promise<number[]> {
        if (!this.isEnabled || !this.embeddings) {
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

            // Use LangChain embeddings (RETRIEVAL_DOCUMENT task type)
            const embedding = await this.embeddings.embedQuery(cleanText);

            if (!embedding || embedding.length === 0) {
                this.logger.warn('Empty embedding returned from LangChain embeddings');
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
        if (!this.isEnabled || !this.queryEmbeddings) {
            return [];
        }

        if (!query || query.trim().length === 0) {
            return [];
        }

        try {
            const cleanQuery = query.replace(/\n+/g, ' ').trim();

            // Use LangChain query embeddings (RETRIEVAL_QUERY task type)
            const embedding = await this.queryEmbeddings.embedQuery(cleanQuery);
            return embedding || [];
        } catch (error) {
            this.logger.error('Error generating query embedding:', error);
            return [];
        }
    }
}
