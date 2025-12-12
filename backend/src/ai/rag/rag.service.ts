import { Injectable, OnModuleInit } from '@nestjs/common';
import { Pool } from 'pg';
import { ConfigService } from '@nestjs/config';
import { EmbeddingService } from './embedding.service';

@Injectable()
export class RagService implements OnModuleInit {
    private pool: Pool;
    private isConnected = false;

    constructor(
        private configService: ConfigService,
        private embeddingService: EmbeddingService, // Injected to avoid circular dep if needed, or used by ingester
    ) {
        // Assuming PGVector setup
        const connectionString = this.configService.get<string>('DATABASE_URL');
        if (connectionString) {
            this.pool = new Pool({ connectionString });
            this.isConnected = true;
        }
    }

    async onModuleInit() {
        if (this.isConnected) {
            // Ensure table exists
            await this.pool.query(`CREATE EXTENSION IF NOT EXISTS vector;`);
            await this.pool.query(`
          CREATE TABLE IF NOT EXISTS documents (
            id SERIAL PRIMARY KEY,
            content TEXT,
            metadata JSONB,
            embedding vector(1536)
          );
        `);
        }
    }

    async storeVector(vector: number[], content: string, metadata: any) {
        if (!this.isConnected) {
            console.warn('Vector DB not connected. Skipping storage.');
            return;
        }
        const embeddingString = `[${vector.join(',')}]`;
        await this.pool.query(
            `INSERT INTO documents (content, metadata, embedding) VALUES ($1, $2, $3)`,
            [content, metadata, embeddingString]
        );
    }

    async retrieve(query: string, subject: string, classBand: string): Promise<string> {
        if (!this.isConnected) {
            return "Creating specific context for " + subject + " aimed at " + classBand + " level.";
        }

        // 1. Embed query
        const queryVector = await this.embeddingService.generateEmbedding(query);
        const vectorStr = `[${queryVector.join(',')}]`;

        // 2. Search (Cosine similarity)
        // Filter by subject if stored in metadata (assumed)
        const result = await this.pool.query(
            `SELECT content, 1 - (embedding <=> $1) as similarity 
         FROM documents 
         WHERE metadata->>'subject' = $2
         ORDER BY similarity DESC 
         LIMIT 3`,
            [vectorStr, subject]
        );

        if (result.rows.length === 0) return "";

        return result.rows.map(r => r.content).join('\n\n');
    }
}
