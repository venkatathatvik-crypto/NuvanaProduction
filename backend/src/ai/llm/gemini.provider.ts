import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { LLMMessage, LLMProvider } from './llm.provider.interface';

/**
 * Gemini Provider using LangChain ChatGoogleGenerativeAI
 * Migrated from raw REST API to LangChain for better abstraction and maintainability
 */
@Injectable()
export class GeminiProvider implements LLMProvider, OnModuleInit {
    private apiKey: string | null = null;
    private modelName: string;
    private model: ChatGoogleGenerativeAI | null = null;
    private readonly logger = new Logger(GeminiProvider.name);

    constructor(private configService: ConfigService) {
        const rawApiKey = this.configService.get<string>('GEMINI_API_KEY');
        this.apiKey = rawApiKey ? rawApiKey.trim() : null;
        
        // Use gemini-2.5-flash as default (from official docs)
        // Fallback to gemini-pro for backward compatibility
        this.modelName = this.configService.get<string>('GEMINI_MODEL') || 'gemini-2.5-flash';

        if (this.apiKey) {
            this.logger.log(`Initialized Gemini with Key: ${this.apiKey.substring(0, 5)}...${this.apiKey.substring(this.apiKey.length - 4)}`);
            this.logger.log(`Using model: ${this.modelName}`);
        } else {
            this.logger.warn('GEMINI_API_KEY is not set. GeminiProvider will fail if used.');
        }
    }

    onModuleInit() {
        if (!this.apiKey || this.apiKey.trim() === '') {
            this.logger.error('❌ GEMINI_API_KEY is missing or empty. AI features will not work.');
            this.logger.error('   Please set GEMINI_API_KEY in your .env file');
            return;
        }

        try {
            // Initialize LangChain ChatGoogleGenerativeAI model
            this.model = new ChatGoogleGenerativeAI({
                model: this.modelName,
                apiKey: this.apiKey,
                temperature: 0.7, // Default temperature, can be made configurable
                maxOutputTokens: 8192, // Default max tokens
            });

            this.logger.log('✓ GeminiProvider ready for requests (using LangChain)');
            this.logger.log(`   Model: ${this.modelName}`);
        } catch (error) {
            this.logger.error('❌ Failed to initialize ChatGoogleGenerativeAI:', error);
            this.model = null;
        }
    }

    /**
     * Generate content using LangChain ChatGoogleGenerativeAI
     * Converts LLMMessage[] to LangChain message format and invokes the model
     */
    async generate(messages: LLMMessage[]): Promise<string> {
        if (!this.apiKey) {
            throw new Error('Gemini API key not initialized. Check GEMINI_API_KEY.');
        }

        if (!this.model) {
            throw new Error('ChatGoogleGenerativeAI model not initialized. Check GEMINI_API_KEY.');
        }

        try {
            // Convert LLMMessage[] to LangChain message format
            const langchainMessages = messages.map(msg => {
                if (msg.role === 'system') {
                    return new SystemMessage(msg.content);
                } else if (msg.role === 'user') {
                    return new HumanMessage(msg.content);
                } else {
                    // For assistant messages, use HumanMessage as fallback
                    // (LangChain ChatGoogleGenerativeAI handles conversation context)
                    return new HumanMessage(msg.content);
                }
            });

            // Invoke the model with LangChain messages
            const response = await this.model.invoke(langchainMessages);

            // Extract text content from LangChain response
            if (!response || !response.content) {
                throw new Error('Gemini returned empty content in response.');
            }

            const text = typeof response.content === 'string' 
                ? response.content 
                : String(response.content);

            if (!text || text.trim().length === 0) {
                throw new Error('Gemini returned empty text.');
            }

            return text;
        } catch (error) {
            this.logger.error('Gemini generation failed:', error);
            throw error;
        }
    }
}
