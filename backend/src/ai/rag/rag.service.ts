import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Pool } from 'pg';
import { ConfigService } from '@nestjs/config';
import { EmbeddingService } from './embedding.service';

/**
 * RAG Service for vector storage and retrieval
 * 
 * Note: This service uses raw PostgreSQL with pgvector for maximum control over:
 * - Complex metadata filtering (class_id, subject)
 * - Custom similarity threshold with fallback logic
 * - Performance optimization with custom indexes
 * 
 * While LangChain provides PGVector support, our specific requirements (complex filtering,
 * similarity threshold fallback) are better handled with custom SQL queries.
 * 
 * The service maintains compatibility with LangChain Document format through the ingestion pipeline.
 */

@Injectable()
export class RagService implements OnModuleInit {
    private pool: Pool;
    private isConnected = false;
    private readonly logger = new Logger(RagService.name);

    constructor(
        private configService: ConfigService,
        private embeddingService: EmbeddingService,
    ) {
        const connectionString = this.configService.get<string>('DATABASE_URL');
        if (connectionString) {
            this.pool = new Pool({ connectionString });
            // Don't set isConnected here - wait for onModuleInit to confirm connection
        }
    }

    async onModuleInit() {
        if (!this.pool) {
            this.logger.warn('RAG: No DATABASE_URL configured. RAG disabled.');
            return;
        }

        this.logger.log('🚀 Initializing RAG Database connection...');
        try {
            // Test connection
            const startTime = Date.now();
            await this.pool.query('SELECT 1');
            const duration = Date.now() - startTime;
            this.isConnected = true;  // Now we know connection works
            this.logger.log(`✅ RAG Database connected successfully in ${duration}ms`);

            // Check if pgvector extension exists
            const extResult = await this.pool.query(
                `SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'vector') as exists`
            );

            if (!extResult.rows[0].exists) {
                this.logger.warn('pgvector extension not found. Attempting to create...');
                try {
                    await this.pool.query(`CREATE EXTENSION IF NOT EXISTS vector;`);
                    this.logger.log('✓ pgvector extension created');
                } catch (error) {
                    this.logger.error('Failed to create pgvector extension:', error);
                    this.logger.error('Please install pgvector: CREATE EXTENSION vector;');
                    this.isConnected = false;
                    return;
                }
            }

            // Check if documents table exists and get its current dimension
            const tableExists = await this.pool.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'documents'
                ) as exists;
            `);

            if (tableExists.rows[0].exists) {
                // Table exists - check current dimension
                const dimCheck = await this.pool.query(`
                    SELECT 
                        (SELECT COUNT(*) FROM documents) as row_count,
                        pg_typeof(embedding)::text as embedding_type
                    FROM documents 
                    LIMIT 1;
                `).catch(() => ({ rows: [{ row_count: '0', embedding_type: null }] }));

                const rowCount = parseInt(dimCheck.rows[0]?.row_count || '0');
                const embeddingType = dimCheck.rows[0]?.embedding_type || '';

                console.log(`[RAG] Documents table exists. Row count: ${rowCount}, Type: ${embeddingType}`);

                // If table has rows, check dimension from existing data
                if (rowCount > 0) {
                    const sampleDim = await this.pool.query(`
                        SELECT array_length(embedding::float[], 1) as dim
                        FROM documents 
                        LIMIT 1;
                    `).catch(() => ({ rows: [{ dim: null }] }));

                    const existingDim = sampleDim.rows[0]?.dim;
                    console.log(`[RAG] Existing embedding dimension: ${existingDim}`);

                    if (existingDim && existingDim !== 768) {
                        this.logger.warn(`⚠️ Table has ${existingDim}-dimensional vectors, but Gemini returns 768.`);
                        this.logger.warn(`   You may need to drop and recreate the table, or use a different embedding model.`);
                        // For now, we'll try to alter the column (this may fail if there's data)
                        try {
                            await this.pool.query(`
                                ALTER TABLE documents 
                                ALTER COLUMN embedding TYPE vector(768);
                            `);
                            this.logger.log('✓ Updated embedding column to 768 dimensions');
                        } catch (alterError) {
                            this.logger.error('Failed to alter embedding column. You may need to drop the table and recreate it.');
                            this.logger.error('SQL: DROP TABLE IF EXISTS documents; (then restart the app)');
                        }
                    }
                } else {
                    // Table exists but is empty - alter column to 768
                    try {
                        await this.pool.query(`
                            ALTER TABLE documents 
                            ALTER COLUMN embedding TYPE vector(768);
                        `);
                        console.log(`[RAG] ✓ Updated empty table to 768 dimensions`);
                    } catch (alterError) {
                        // If alter fails, try to recreate
                        console.log(`[RAG] Attempting to recreate table with correct dimension...`);
                        await this.pool.query(`DROP TABLE IF EXISTS documents CASCADE;`);
                        await this.pool.query(`
                            CREATE TABLE documents (
                                id SERIAL PRIMARY KEY,
                                content TEXT NOT NULL,
                                metadata JSONB DEFAULT '{}',
                                embedding vector(768)
                            );
                        `);
                        console.log(`[RAG] ✓ Recreated table with 768 dimensions`);
                    }
                }
            } else {
                // Table doesn't exist - create it with 768 dimensions
                await this.pool.query(`
                    CREATE TABLE documents (
                        id SERIAL PRIMARY KEY,
                        content TEXT NOT NULL,
                        metadata JSONB DEFAULT '{}',
                        embedding vector(768)
                    );
                `);
                console.log(`[RAG] ✓ Created documents table with 768 dimensions`);
            }

            // Create indexes for better performance
            await this.pool.query(`
                CREATE INDEX IF NOT EXISTS documents_embedding_idx 
                ON documents USING ivfflat (embedding vector_cosine_ops)
                WITH (lists = 100);
            `);

            await this.pool.query(`
                CREATE INDEX IF NOT EXISTS documents_subject_idx 
                ON documents ((metadata->>'subject'));
            `);

            this.logger.log('✓ RAG service initialized successfully');
        } catch (error) {
            this.logger.error('RAG initialization failed:', error);
            this.isConnected = false;
        }
    }

    async storeVector(vector: number[], content: string, metadata: any) {
        if (!this.isConnected) {
            console.warn('[RAG] Vector DB not connected. Skipping storage.');
            return;
        }

        // Clean content: Remove null bytes and invalid UTF-8 characters
        const cleanContent = content
            .replace(/\0/g, '') // Remove null bytes
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
            .trim();

        if (!cleanContent || cleanContent.length === 0) {
            console.warn('[RAG] ⚠️ Content is empty after cleaning, skipping storage');
            return;
        }

        // Validate vector dimension
        if (vector.length !== 768) {
            console.error(`[RAG] ❌ Vector dimension mismatch: expected 768, got ${vector.length}`);
            throw new Error(`Vector dimension mismatch: expected 768, got ${vector.length}`);
        }

        console.log(`[RAG] Storing vector with metadata:`, JSON.stringify(metadata, null, 2));
        const embeddingString = `[${vector.join(',')}]`;
        
        try {
            await this.pool.query(
                `INSERT INTO documents (content, metadata, embedding) VALUES ($1, $2, $3::vector)`,
                [cleanContent, JSON.stringify(metadata), embeddingString]
            );
            console.log(`[RAG] ✓ Stored vector successfully (${vector.length} dimensions, ${cleanContent.length} chars)`);
        } catch (error) {
            console.error(`[RAG] ❌ Error storing vector:`, error);
            throw error;
        }
    }

    /**
     * Build metadata filter for SQL queries
     * Returns filter conditions and parameters for class_id and subject filtering
     */
    private buildMetadataFilter(subject: string, classId?: string): {
        whereClause: string;
        params: any[];
    } {
        if (classId) {
            // Filter by both class_id and subject (most specific)
            return {
                whereClause: `WHERE metadata->>'class_id' = $2 AND (metadata->>'subject' = $3 OR metadata->>'subject' IS NULL)`,
                params: [classId, subject]
            };
        } else {
            // Fallback: filter by subject only (if class_id not available)
            return {
                whereClause: `WHERE metadata->>'subject' = $2 OR metadata->>'subject' IS NULL`,
                params: [subject]
            };
        }
    }

    /**
     * Filter results by similarity threshold with fallback logic
     * Returns relevant chunks above threshold, or best available if none meet threshold
     */
    private filterBySimilarity(
        chunksWithSimilarity: Array<{ content: string; similarity: number }>,
        threshold: number = 0.7
    ): string[] {
        // Filter chunks above threshold
        let relevantChunks = chunksWithSimilarity
            .filter(chunk => chunk.similarity > threshold)
            .map(chunk => chunk.content);

        // If no chunks above threshold, use the chunk with highest similarity
        if (relevantChunks.length === 0) {
            console.log(`[RAG] ⚠️ No documents above ${(threshold * 100).toFixed(0)}% similarity threshold`);
            
            const bestChunk = chunksWithSimilarity.reduce((best, current) => 
                current.similarity > best.similarity ? current : best
            );
            
            const bestSimilarityPercent = (bestChunk.similarity * 100).toFixed(1);
            console.log(`[RAG] 📌 Using best available chunk with ${bestSimilarityPercent}% similarity (below ${(threshold * 100).toFixed(0)}% threshold)`);
            console.log(`[RAG] ⚠️ Note: This chunk may be less relevant to the query`);
            
            relevantChunks = [bestChunk.content];
        }

        return relevantChunks;
    }

    /**
     * Retrieve relevant content from vector database
     * Filters by student's class_id and subject for personalized results
     * Uses custom SQL for complex filtering requirements
     */
    async retrieve(
        query: string, 
        subject: string, 
        classBand: string, 
        classId?: string
    ): Promise<string> {
        console.log(`[RAG] Starting retrieval - Query: "${query}", Subject: "${subject}", ClassBand: "${classBand}", ClassID: "${classId || 'none'}"`);

        if (!this.isConnected) {
            console.warn('[RAG] Vector DB not connected. RAG disabled.');
            return "";
        }

        // 1. Generate query embedding (optimized for search)
        console.log(`[RAG] Step 1: Generating query embedding...`);
        const queryVector = await this.embeddingService.generateQueryEmbedding(query);

        // 🔒 GRACEFUL DEGRADATION: If embeddings are disabled (returns empty array), skip RAG
        if (!queryVector || queryVector.length === 0) {
            console.warn('[RAG] ⚠️ Embeddings unavailable. Skipping RAG retrieval.');
            return "";
        }

        console.log(`[RAG] ✓ Generated query embedding (${queryVector.length} dimensions)`);
        const vectorStr = `[${queryVector.join(',')}]`;

        // 2. Build SQL query with class_id and subject filtering
        console.log(`[RAG] Step 2: Searching vector database...`);
        try {
            // Build metadata filter
            const filter = this.buildMetadataFilter(subject, classId);
            
            if (classId) {
                console.log(`[RAG] Filtering by class_id: ${classId} AND subject: ${subject}`);
            } else {
                console.log(`[RAG] Filtering by subject only: ${subject} (no class_id provided)`);
            }

            // Build SQL query with cosine similarity
            const sqlQuery = `
                SELECT content, 1 - (embedding <=> $1::vector) as similarity 
                FROM documents 
                ${filter.whereClause}
                ORDER BY similarity DESC 
                LIMIT 5
            `;
            
            // Combine vector string with filter parameters
            const queryParams = [vectorStr, ...filter.params];

            const result = await this.pool.query(sqlQuery, queryParams);
            console.log(`[RAG] Found ${result.rows.length} potential matches`);

            if (result.rows.length === 0) {
                console.log(`[RAG] ⚠️ No documents found for class_id: ${classId || 'none'}, subject: ${subject}`);
                return "";
            }

            // Print all extracted documents with details
            console.log(`[RAG] ========================================`);
            console.log(`[RAG] 📄 EXTRACTED DOCUMENTS (${result.rows.length} total):`);
            console.log(`[RAG] ========================================`);
            
            result.rows.forEach((row, index) => {
                const similarity = parseFloat(row.similarity);
                const similarityPercent = (similarity * 100).toFixed(1);
                console.log(`[RAG] ─────────────────────────────────────`);
                console.log(`[RAG] Document ${index + 1}:`);
                console.log(`[RAG]   Similarity: ${similarityPercent}%`);
                console.log(`[RAG]   Content Length: ${row.content.length} characters`);
                console.log(`[RAG]   Content Preview: ${row.content.substring(0, 200)}${row.content.length > 200 ? '...' : ''}`);
                console.log(`[RAG]   Full Content:`);
                console.log(`[RAG]   ${row.content}`);
                console.log(`[RAG] ─────────────────────────────────────`);
            });

            // Map results to chunks with similarity scores
            const chunksWithSimilarity = result.rows.map(row => ({
                content: row.content,
                similarity: parseFloat(row.similarity),
            }));

            // Log similarity for each chunk
            chunksWithSimilarity.forEach((chunk, index) => {
                const similarityPercent = (chunk.similarity * 100).toFixed(1);
                console.log(`[RAG] Chunk ${index + 1} similarity: ${similarityPercent}% ${chunk.similarity > 0.7 ? '✅ (above threshold)' : '❌ (below 70% threshold)'}`);
            });

            // Filter by similarity threshold (70%) with fallback logic
            const relevantChunks = this.filterBySimilarity(chunksWithSimilarity, 0.7);
            const usedFallback = relevantChunks.length === 1 && chunksWithSimilarity.length > 0 && 
                                 chunksWithSimilarity[0].similarity <= 0.7;

            console.log(`[RAG] ========================================`);
            const thresholdStatus = usedFallback 
                ? 'best available (below 70% threshold)' 
                : 'above 70% threshold';
            console.log(`[RAG] ✅ Retrieved ${relevantChunks.length} relevant document chunk(s) (${thresholdStatus})`);
            console.log(`[RAG] ========================================`);
            console.log(`[RAG] 📝 RELEVANT DOCUMENTS CONTENT:`);
            console.log(`[RAG] ========================================`);
            
            relevantChunks.forEach((chunk, index) => {
                console.log(`[RAG] ─────────────────────────────────────`);
                console.log(`[RAG] Relevant Chunk ${index + 1} (${chunk.length} chars):`);
                console.log(`[RAG] ${chunk}`);
                console.log(`[RAG] ─────────────────────────────────────`);
            });

            const combinedContent = relevantChunks.join('\n\n');
            console.log(`[RAG] ========================================`);
            console.log(`[RAG] 📋 COMBINED CONTENT (${combinedContent.length} characters):`);
            console.log(`[RAG] ========================================`);
            console.log(`[RAG] ${combinedContent}`);
            console.log(`[RAG] ========================================`);
            
            return combinedContent;
        } catch (error) {
            console.error(`[RAG] ❌ Database query failed:`, error);
            this.logger.error('RAG database query failed:', error);
            return ""; // Graceful degradation
        }
    }

    /**
     * Get list of subjects that have uploaded PDF files for a specific class
     * Used to populate AI Tutor subject dropdown with only subjects that have materials
     */
    async getSubjectsWithMaterials(classId: string): Promise<string[]> {
        console.log(`[RAG] Getting subjects with materials for class_id: ${classId}`);

        if (!this.isConnected) {
            console.warn('[RAG] Vector DB not connected. Returning empty array.');
            return [];
        }

        try {
            // Query database for distinct subjects that have documents for this class
            const query = `
                SELECT DISTINCT metadata->>'subject' as subject
                FROM documents
                WHERE metadata->>'class_id' = $1
                  AND metadata->>'subject' IS NOT NULL
                  AND metadata->>'subject' != ''
                ORDER BY subject ASC
            `;

            const result = await this.pool.query(query, [classId]);
            
            const subjects = result.rows
                .map(row => row.subject)
                .filter(subject => subject && subject.trim().length > 0);

            console.log(`[RAG] Found ${subjects.length} subjects with uploaded materials for class ${classId}:`, subjects);
            return subjects;
        } catch (error) {
            console.error(`[RAG] ❌ Error getting subjects with materials:`, error);
            this.logger.error('Failed to get subjects with materials:', error);
            return []; // Graceful degradation
        }
    }

    /**
     * Health check for RAG service database connection
     */
    async healthCheck(): Promise<boolean> {
        if (!this.isConnected || !this.pool) {
            return false;
        }
        try {
            await this.pool.query('SELECT 1');
            return true;
        } catch (error) {
            this.logger.error('RAG health check failed:', error);
            return false;
        }
    }
}
