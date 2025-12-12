import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmbeddingService {
    private openai: OpenAI;

    constructor(private configService: ConfigService) {
        this.openai = new OpenAI({
            apiKey: this.configService.get<string>('openai.apiKey'),
        });
    }

    async generateEmbedding(text: string): Promise<number[]> {
        // Sanitize text
        const cleanText = text.replace(/\n/g, ' ');

        const response = await this.openai.embeddings.create({
            model: this.configService.get<string>('openai.embeddingModel'),
            input: cleanText,
        });

        return response.data[0].embedding;
    }
}
