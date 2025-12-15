import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { LLMMessage, LLMProvider } from './llm.provider.interface';

@Injectable()
export class GeminiProvider implements LLMProvider, OnModuleInit {
    private genAI: GoogleGenerativeAI;
    private model: any;
    private readonly logger = new Logger(GeminiProvider.name);

    constructor(private configService: ConfigService) {
        const rawApiKey = this.configService.get<string>('GEMINI_API_KEY');
        const apiKey = rawApiKey ? rawApiKey.trim() : '';

        if (!apiKey) {
            this.logger.warn('GEMINI_API_KEY is not set. GeminiProvider will fail if used.');
        } else {
            this.logger.log(`Initialized Gemini with Key: ${apiKey.substring(0, 5)}...${apiKey.substring(apiKey.length - 4)}`);
            this.genAI = new GoogleGenerativeAI(apiKey);
            this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        }
    }

    onModuleInit() {
        // This ensures the provider is instantiated at startup
        // The actual initialization happens in the constructor
        if (this.model) {
            this.logger.log('✓ GeminiProvider ready for requests');
        } else {
            this.logger.warn('⚠ GeminiProvider initialized but no API key configured');
        }
    }

    async generate(messages: LLMMessage[]): Promise<string> {
        if (!this.model) {
            throw new Error('Gemini model not initialized. Check GEMINI_API_KEY.');
        }

        // Gemini 1.5 Flash supports system instructions, but strict composition is safer for now.
        // We will separate the System/RAG context from the User prompt as requested: "single composed string" logic,
        // but leveraging the SDK properly.
        // Actually, the user requirement: "Prompt must be passed as a single composed string... preserving existing prompt content exactly."
        // implies we should concat.

        let systemContext = '';
        let userPrompt = '';

        for (const msg of messages) {
            if (msg.role === 'system') {
                systemContext += `${msg.content}\n\n`;
            } else if (msg.role === 'user') {
                userPrompt += `${msg.content}\n`;
            }
        }

        // Combining into a single prompt for the "user" role to ensure strict context adherence.
        // This effectively simulates a "system" instruction by prepending it to the user query.
        const finalPrompt = `${systemContext}USER TASK:\n${userPrompt}`;

        try {
            const result = await this.model.generateContent(finalPrompt);
            const response = await result.response;
            const text = response.text();

            if (!text) {
                throw new Error('Gemini returned empty response.');
            }
            return text;
        } catch (error) {
            this.logger.error('Gemini generation failed:', error);
            throw error;
        }
    }
}
