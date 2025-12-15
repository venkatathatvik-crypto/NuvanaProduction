import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LLMMessage, LLMProvider } from './llm.provider.interface';

/**
 * Gemini Provider using official Gemini API
 * Based on: https://ai.google.dev/gemini-api/docs/quickstart#javascript
 * Uses REST API directly for maximum compatibility
 */
@Injectable()
export class GeminiProvider implements LLMProvider, OnModuleInit {
    private apiKey: string | null = null;
    private modelName: string;
    private readonly logger = new Logger(GeminiProvider.name);
    private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

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
        } else {
            this.logger.log('✓ GeminiProvider ready for requests');
            this.logger.log(`   Model: ${this.modelName}`);
            this.logger.log(`   API: ${this.baseUrl}`);
        }
    }

    /**
     * Generate content using Gemini API
     * Based on official documentation: https://ai.google.dev/gemini-api/docs/quickstart#javascript
     */
    async generate(messages: LLMMessage[]): Promise<string> {
        if (!this.apiKey) {
            throw new Error('Gemini API key not initialized. Check GEMINI_API_KEY.');
        }

        // Combine system and user messages into contents array
        // Following the official API structure
        let systemContext = '';
        const userParts: string[] = [];

        for (const msg of messages) {
            if (msg.role === 'system') {
                systemContext += `${msg.content}\n\n`;
            } else if (msg.role === 'user') {
                userParts.push(msg.content);
            }
        }

        // Build the request payload according to official API format
        const contents: any[] = [];
        
        // If we have system context, prepend it to the first user message
        if (systemContext.trim()) {
            contents.push({
                parts: [{ text: `${systemContext.trim()}\n\nUSER TASK:\n${userParts.join('\n')}` }],
            });
        } else {
            // No system context, just user messages
            userParts.forEach(part => {
                contents.push({
                    parts: [{ text: part }],
                });
            });
        }

        const payload = {
            contents: contents,
        };

        try {
            const url = `${this.baseUrl}/models/${this.modelName}:generateContent`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'x-goog-api-key': this.apiKey,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorText = await response.text();
                this.logger.error(`Gemini API error: ${response.status} - ${errorText}`);
                throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();

            // Extract text from response according to official API structure
            if (!data.candidates || data.candidates.length === 0) {
                throw new Error('Gemini returned no candidates in response.');
            }

            const candidate = data.candidates[0];
            if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
                throw new Error('Gemini returned empty content in response.');
            }

            const text = candidate.content.parts[0].text;

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
