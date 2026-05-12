import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatVertexAI } from '@langchain/google-vertexai';
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';
import { LLMMessage, LLMProvider } from './llm.provider.interface';

@Injectable()
export class GeminiProvider implements LLMProvider, OnModuleInit {
    private modelName: string;
    private model: ChatVertexAI | null = null;
    private modelCache: Map<string, ChatVertexAI> = new Map();
    private readonly logger = new Logger(GeminiProvider.name);

    constructor(private configService: ConfigService) {
        // Use Gemini model (defaults to flash or pro)
        this.modelName = this.configService.get<string>('GEMINI_MODEL') || 
                        this.configService.get<string>('GEMINI_FLASH_MODEL') || 
                        'gemini-3-flash';

        const location = this.configService.get<string>('GCP_LOCATION') || 'us-central1';
        this.logger.log(`Initializing Vertex AI with Location: ${location}`);
        this.logger.log(`Active Model: ${this.modelName}`);
    }

    onModuleInit() {
        try {
            // Initialize default model
            this.model = this.createModel(this.modelName);
            this.logger.log(`✓ Vertex AI Provider ready - Model: ${this.modelName}`);
        } catch (error) {
            this.logger.error(`❌ Failed to initialize Vertex AI model [${this.modelName}]:`, error);
        }
    }

    private createModel(modelName: string): ChatVertexAI {
        const location = this.configService.get<string>('GCP_LOCATION') || 'us-central1';

        // NOTE: 'project' property is not supported in this version's constructor.
        // It should be set in GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_CLOUD_PROJECT environment variables.
        return new ChatVertexAI({
            model: modelName,
            location: location,
            temperature: 0.7,
            maxOutputTokens: 8192,
        });
    }

    /**
     * Converts generic LLM messages to LangChain messages
     */
    private convertMessages(messages: LLMMessage[]): (HumanMessage | SystemMessage | AIMessage)[] {
        return messages.map(msg => {
            switch (msg.role) {
                case 'system':
                    return new SystemMessage(msg.content);
                case 'user':
                    return new HumanMessage(msg.content);
                case 'assistant':
                    return new AIMessage(msg.content);
                default:
                    return new HumanMessage(msg.content);
            }
        });
    }

    async generate(messages: LLMMessage[], modelOverride?: string): Promise<string> {
        let targetModelName = modelOverride || this.modelName;
        let activeModel: ChatVertexAI | null = null;

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
            throw new Error(`Vertex AI model [${targetModelName}] failed to initialize.`);
        }

        try {
            this.logger.log(`[Vertex AI] Processing with: ${targetModelName}`);
            const langchainMessages = this.convertMessages(messages);
            
            // Cast to any to resolve @langchain/core version conflicts ([MESSAGE_SYMBOL] mismatch)
            const response = await activeModel.invoke(langchainMessages as any);

            const text = typeof response.content === 'string' 
                ? response.content 
                : JSON.stringify(response.content);

            if (!text || text.trim().length === 0) {
                throw new Error('Vertex AI returned empty text.');
            }

            return text;
        } catch (error: any) {
            this.logger.error(`[Vertex AI] Generation failed (${targetModelName}):`, error.message);
            throw error;
        }
    }
}
