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
    private flashModelName: string;
    private proModelName: string;
    private flashModel: ChatGoogleGenerativeAI | null = null;
    private proModel: ChatGoogleGenerativeAI | null = null;
    private modelCache: Map<string, ChatGoogleGenerativeAI> = new Map();
    private readonly logger = new Logger(GeminiProvider.name);

    constructor(private configService: ConfigService) {
        const rawApiKey = this.configService.get<string>('GEMINI_API_KEY');
        this.apiKey = rawApiKey ? rawApiKey.trim() : null;

        // Use Gemini 3 preview models
        this.flashModelName = this.configService.get<string>('GEMINI_FLASH_MODEL') || 'gemini-3-flash-preview';
        this.proModelName = this.configService.get<string>('GEMINI_PRO_MODEL') || 'gemini-3-pro-preview';

        if (this.apiKey) {
            this.logger.log(`Initialized Gemini with Key: ${this.apiKey.substring(0, 5)}...${this.apiKey.substring(this.apiKey.length - 4)}`);
            this.logger.log(`Flash Model: ${this.flashModelName}`);
            this.logger.log(`Pro Model: ${this.proModelName}`);
        } else {
            this.logger.warn('GEMINI_API_KEY is not set. GeminiProvider will fail if used.');
        }
    }

    onModuleInit() {
        if (!this.apiKey) return;

        try {
            // Initialize default Flash model
            this.flashModel = this.createModel(this.flashModelName);
            this.logger.log('✓ Gemini Flash Provider ready (v1beta)');
        } catch (error) {
            this.logger.error('❌ Failed to initialize Gemini Flash model:', error);
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

    /**
     * Heuristic to determine if a task is complex enough to warrant the Pro model
     * DISABLED: Always use Flash model for cost optimization
     */
    private shouldUseProModel(messages: LLMMessage[]): boolean {
        // DISABLED: Force Flash model for all requests (student and teacher)
        // User preference: Use only Flash model to reduce costs
        return false;
        
        /* ORIGINAL LOGIC (DISABLED):
        // Allow disabling Pro entirely via env var if quota is exhausted
        if (this.configService.get<string>('DISABLE_GEMINI_PRO') === 'true') return false;

        const totalContent = messages.map(m => m.content).join(' ');
        
        // Criteria for Pro model:
        // 1. Long context (increased threshold: 12000 chars)
        // Gemini 1.5/3 Flash handles up to 1M tokens, but reasoning degrades slightly
        if (totalContent.length > 12000) return true;

        // 2. Keywords indicating extremely complex reasoning
        // Removed 'grade paper' and 'detailed lesson plan' as Flash (especially v3) is excellent at these
        const complexKeywords = [
            'critical analysis', 'advanced mathematics', 'complex logic', 
            'coding architecture', 'adversarial testing'
        ];

        return complexKeywords.some(keyword => totalContent.toLowerCase().includes(keyword));
        */
    }

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

        let targetModelName = modelOverride;
        let activeModel: ChatGoogleGenerativeAI | null = null;

        // Determine active model based on override or routing logic
        if (modelOverride) {
            if (this.modelCache.has(modelOverride)) {
                activeModel = this.modelCache.get(modelOverride)!;
            } else {
                activeModel = this.createModel(modelOverride);
                this.modelCache.set(modelOverride, activeModel);
            }
        } else if (this.shouldUseProModel(messages)) {
            targetModelName = this.proModelName;
            if (!this.proModel) {
                this.proModel = this.createModel(this.proModelName);
            }
            activeModel = this.proModel;
        } else {
            targetModelName = this.flashModelName;
            activeModel = this.flashModel;
        }

        if (!activeModel) {
            throw new Error(`Gemini model [${targetModelName}] failed to initialize.`);
        }

        try {
            this.logger.log(`[Gemini] Routing to: ${targetModelName}`);
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
            
            // Fallback: If Pro fails, try Flash (unless Flash was already the target)
            if (targetModelName === this.proModelName && this.flashModel) {
                this.logger.warn(`[Gemini] Pro model failed, falling back to Flash: ${this.flashModelName}`);
                return this.generate(messages, this.flashModelName);
            }
            
            throw error;
        }
    }
}
