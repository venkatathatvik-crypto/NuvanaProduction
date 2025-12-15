import { Injectable, Logger } from '@nestjs/common';
import * as pdf from 'pdf-parse';
import { EmbeddingService } from './embedding.service';
import { RagService } from './rag.service';

@Injectable()
export class IngestionService {
    private readonly logger = new Logger(IngestionService.name);
    private readonly CHUNK_SIZE_WORDS = 500; // Words per chunk
    private readonly CHUNK_OVERLAP_WORDS = 100; // Overlap between chunks

    constructor(
        private embeddingService: EmbeddingService,
        private ragService: RagService,
    ) { }

    /**
     * Process PDF file: Extract text, chunk, generate embeddings, store in vector DB
     * This is called asynchronously after file upload to avoid blocking
     */
    async processFile(buffer: Buffer, metadata: {
        file_id: string;
        class_id: string;
        subject: string;
        classBand?: string;
        school_id: string;
    }): Promise<{ chunksProcessed: number; totalChunks: number; skipped: number }> {
        const startTime = Date.now();
        console.log(`[PDF Processing] Starting processing for file_id: ${metadata.file_id}`);
        console.log(`[PDF Processing] Metadata:`, JSON.stringify(metadata, null, 2));

        try {
            // 1. Extract Text from PDF
            console.log(`[PDF Processing] Step 1: Extracting text from PDF...`);
        const data = await pdf(buffer);
            let fullText = data.text.trim();

            // Clean text: Remove null bytes and other invalid UTF-8 characters
            fullText = fullText.replace(/\0/g, ''); // Remove null bytes
            fullText = fullText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ''); // Remove other control characters
            fullText = fullText.trim();
            
            if (!fullText || fullText.length === 0) {
                console.warn(`[PDF Processing] ⚠️ No text extracted from PDF (file_id: ${metadata.file_id})`);
                return { chunksProcessed: 0, totalChunks: 0, skipped: 0 };
            }

            console.log(`[PDF Processing] ✓ Extracted ${fullText.length} characters from PDF (cleaned)`);

            // 2. Chunk Text (word-based with overlap)
            console.log(`[PDF Processing] Step 2: Chunking text...`);
            const chunks = this.chunkText(fullText, this.CHUNK_SIZE_WORDS, this.CHUNK_OVERLAP_WORDS);
            console.log(`[PDF Processing] ✓ Created ${chunks.length} chunks`);

            if (chunks.length === 0) {
                console.warn(`[PDF Processing] ⚠️ No chunks created from text`);
                return { chunksProcessed: 0, totalChunks: 0, skipped: 0 };
            }

            // 3. Generate Embeddings & Store
            console.log(`[PDF Processing] Step 3: Generating embeddings and storing chunks...`);
        let processedCount = 0;
            let skippedCount = 0;

            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                console.log(`[PDF Processing] Processing chunk ${i + 1}/${chunks.length} (${chunk.length} chars)...`);

                try {
                    // Generate embedding
            const vector = await this.embeddingService.generateEmbedding(chunk);

                    // Graceful degradation: Skip if embeddings unavailable
            if (!vector || vector.length === 0) {
                        console.warn(`[PDF Processing] ⚠️ Embedding unavailable for chunk ${i + 1}, skipping...`);
                        skippedCount++;
                continue;
            }

                    console.log(`[PDF Processing] ✓ Generated embedding (${vector.length} dimensions) for chunk ${i + 1}`);

                    // Store in vector database with metadata
                    const chunkMetadata = {
                        ...metadata,
                        chunk_index: i,
                        chunk_total: chunks.length,
                        chunk_length: chunk.length,
                    };

                    await this.ragService.storeVector(vector, chunk, chunkMetadata);
            processedCount++;

                    console.log(`[PDF Processing] ✓ Stored chunk ${i + 1}/${chunks.length} in vector database`);

                    // Small delay to avoid rate limiting
                    if (i < chunks.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                } catch (error) {
                    console.error(`[PDF Processing] ❌ Error processing chunk ${i + 1}:`, error);
                    skippedCount++;
                    // Continue with next chunk
                }
            }

            const duration = Date.now() - startTime;
            console.log(`[PDF Processing] ✅ Processing complete!`);
            console.log(`[PDF Processing] Summary: ${processedCount} processed, ${skippedCount} skipped, ${chunks.length} total`);
            console.log(`[PDF Processing] Duration: ${duration}ms`);

        return {
            chunksProcessed: processedCount,
            totalChunks: chunks.length,
                skipped: skippedCount,
            };
        } catch (error) {
            console.error(`[PDF Processing] ❌ Fatal error processing PDF (file_id: ${metadata.file_id}):`, error);
            this.logger.error('PDF processing failed', error);
            throw error;
        }
    }

    /**
     * Chunk text by words (not characters) for better semantic boundaries
     * Uses overlap to preserve context between chunks
     */
    private chunkText(text: string, chunkSizeWords: number, overlapWords: number): string[] {
        console.log(`[PDF Processing] Chunking text: ${text.length} chars, target: ${chunkSizeWords} words/chunk, overlap: ${overlapWords} words`);

        // Split text into words
        const words = text.split(/\s+/).filter(w => w.length > 0);
        const totalWords = words.length;
        console.log(`[PDF Processing] Total words: ${totalWords}`);

        if (totalWords === 0) {
            return [];
        }

        const chunks: string[] = [];
        const stepSize = chunkSizeWords - overlapWords; // How many new words per chunk

        for (let i = 0; i < totalWords; i += stepSize) {
            const chunkWords = words.slice(i, i + chunkSizeWords);
            const chunkText = chunkWords.join(' ').trim();

            if (chunkText.length > 0) {
                chunks.push(chunkText);
            }

            // Stop if we've covered all words
            if (i + chunkSizeWords >= totalWords) {
                break;
        }
        }

        console.log(`[PDF Processing] Created ${chunks.length} chunks from ${totalWords} words`);
        return chunks;
    }
}
