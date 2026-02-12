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
    private modelCache: Map<string, ChatGoogleGenerativeAI> = new Map();
    private readonly logger = new Logger(GeminiProvider.name);

    constructor(private configService: ConfigService) {
        const rawApiKey = this.configService.get<string>('GEMINI_API_KEY');
        this.apiKey = rawApiKey ? rawApiKey.trim() : null;

        // Use Gemini model (defaults to flash preview if not set)
        this.modelName = this.configService.get<string>('GEMINI_MODEL') || 
                        this.configService.get<string>('GEMINI_FLASH_MODEL') || 
                        'gemini-3-flash-preview';

        if (this.apiKey) {
            this.logger.log(`Initialized Gemini with Key: ${this.apiKey.substring(0, 5)}...${this.apiKey.substring(this.apiKey.length - 4)}`);
            this.logger.log(`Active Model: ${this.modelName}`);
        } else {
            this.logger.warn('GEMINI_API_KEY is not set. GeminiProvider will fail if used.');
        }
    }

    onModuleInit() {
        if (!this.apiKey) return;

        try {
            // Initialize default model
            this.model = this.createModel(this.modelName);
            this.logger.log(`✓ Gemini Provider ready (v1beta) - Model: ${this.modelName}`);
        } catch (error) {
            this.logger.error(`❌ Failed to initialize Gemini model [${this.modelName}]:`, error);
        }
    }

    private createModel(modelName: string): ChatGoogleGenerativeAI {
        return new ChatGoogleGenerativeAI({
            model: modelName,
            apiKey: this.apiKey!,
            apiVersion: 'v1beta', // Required for Gemini 3 preview models
            temperature: 0.7,
            maxOutputTokens: 8192,
        });
    }

    // Simplified: No Pro vs Flash routing for these models

    /**
     * Merges system messages into the first human message for better API compatibility
     */
    private convertMessages(messages: LLMMessage[]): (HumanMessage | SystemMessage)[] {
        const systemPrompts = messages
            .filter(msg => msg.role === 'system')
            .map(msg => msg.content)
            .join('\n\n');

        const langchainMessages: (HumanMessage | SystemMessage)[] = [];
        let firstHumanPassed = false;

        messages.forEach(msg => {
            if (msg.role === 'user') {
                if (!firstHumanPassed && systemPrompts) {
                    langchainMessages.push(new HumanMessage(`${systemPrompts}\n\n---\n\n${msg.content}`));
                    firstHumanPassed = true;
                } else {
                    langchainMessages.push(new HumanMessage(msg.content));
                    firstHumanPassed = true;
                }
            } else if (msg.role === 'assistant') {
                langchainMessages.push(new HumanMessage(msg.content));
            }
        });

        if (!firstHumanPassed && systemPrompts) {
            langchainMessages.push(new HumanMessage(systemPrompts));
        }

        return langchainMessages;
    }

    async generate(messages: LLMMessage[], modelOverride?: string): Promise<string> {
        if (!this.apiKey) {
            throw new Error('Gemini API key not initialized.');
        }

        let targetModelName = modelOverride || this.modelName;
        let activeModel: ChatGoogleGenerativeAI | null = null;

        // Use override if provided, otherwise use default
        if (modelOverride) {
            if (this.modelCache.has(modelOverride)) {
                activeModel = this.modelCache.get(modelOverride)!;
            } else {
                activeModel = this.createModel(modelOverride);
                this.modelCache.set(modelOverride, activeModel);
            }
        } else {
            activeModel = this.model;
        }

        if (!activeModel) {
            throw new Error(`Gemini model [${targetModelName}] failed to initialize.`);
        }

        try {
            this.logger.log(`[Gemini] Processing with: ${targetModelName}`);
            const langchainMessages = this.convertMessages(messages);
            const response = await activeModel.invoke(langchainMessages);

            const text = typeof response.content === 'string' 
                ? response.content 
                : JSON.stringify(response.content);

            if (!text || text.trim().length === 0) {
                throw new Error('Gemini returned empty text.');
            }

            return text;
        } catch (error: any) {
            this.logger.error(`[Gemini] Generation failed (${targetModelName}):`, error.message);
            throw error;
        }
    }
}
