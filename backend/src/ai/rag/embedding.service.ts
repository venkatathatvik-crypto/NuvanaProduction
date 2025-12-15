import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class EmbeddingService implements OnModuleInit {
    private readonly logger = new Logger(EmbeddingService.name);
    private genAI: GoogleGenerativeAI | null = null;
    private isEnabled = false;

    constructor(private configService: ConfigService) {}

    onModuleInit() {
        const apiKey = this.configService.get<string>('GEMINI_API_KEY');
        
        if (!apiKey || apiKey.trim() === '') {
            this.logger.warn('⚠️ EmbeddingService DISABLED: GEMINI_API_KEY not set');
            this.logger.warn('   RAG functionality will not work without embeddings');
            return;
        }

        try {
            this.genAI = new GoogleGenerativeAI(apiKey.trim());
            this.isEnabled = true;
            this.logger.log('✓ EmbeddingService enabled with Gemini API');
        } catch (error) {
            this.logger.error('❌ Failed to initialize EmbeddingService:', error);
            this.isEnabled = false;
        }
    }

    /**
     * Generate embedding vector for given text using Gemini's embedding model
     * Uses REST API directly since SDK may not support embeddings
     * @param text - Text to generate embedding for
     * @returns Array of numbers representing the embedding vector, or empty array if unavailable
     */
    async generateEmbedding(text: string): Promise<number[]> {
        if (!this.isEnabled || !this.genAI) {
            this.logger.debug('Embedding generation skipped: service not enabled');
            return [];
        }

        if (!text || text.trim().length === 0) {
            this.logger.warn('Empty text provided for embedding generation');
            return [];
        }

        try {
            const apiKey = this.configService.get<string>('GEMINI_API_KEY');
            if (!apiKey) {
                return [];
            }

            // Clean text: remove newlines and extra spaces
            const cleanText = text.replace(/\n+/g, ' ').trim();

            if (cleanText.length === 0) {
                return [];
            }

            // Use Gemini REST API for embeddings
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        model: 'models/text-embedding-004',
                        content: {
                            parts: [{ text: cleanText }],
                        },
                        taskType: 'RETRIEVAL_DOCUMENT',
                    }),
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                this.logger.error(`Embedding API error: ${response.status} - ${errorText}`);
                return [];
            }

            const result = await response.json();
            const embedding = result.embedding?.values;

            if (!embedding || embedding.length === 0) {
                this.logger.warn('Empty embedding returned from Gemini API');
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
        if (!this.isEnabled) {
            return [];
        }

        if (!query || query.trim().length === 0) {
            return [];
        }

        try {
            const apiKey = this.configService.get<string>('GEMINI_API_KEY');
            if (!apiKey) {
                return [];
            }

            const cleanQuery = query.replace(/\n+/g, ' ').trim();

            // Use Gemini REST API for embeddings
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        model: 'models/text-embedding-004',
                        content: {
                            parts: [{ text: cleanQuery }],
                        },
                        taskType: 'RETRIEVAL_QUERY',
                    }),
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                this.logger.error(`Query embedding API error: ${response.status} - ${errorText}`);
                return [];
            }

            const result = await response.json();
            return result.embedding?.values || [];
        } catch (error) {
            this.logger.error('Error generating query embedding:', error);
        return [];
        }
    }
}
