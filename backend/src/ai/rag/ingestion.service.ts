import { Injectable, Logger } from '@nestjs/common';
import * as pdf from 'pdf-parse';
import { RecursiveCharacterTextSplitter } from '@langchain/classic/text_splitter';
import { Document } from '@langchain/core/documents';
import { EmbeddingService } from './embedding.service';
import { RagService } from './rag.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class IngestionService {
    private readonly logger = new Logger(IngestionService.name);
    private readonly CHUNK_SIZE_WORDS = 500; // Words per chunk
    private readonly CHUNK_OVERLAP_WORDS = 100; // Overlap between chunks
    // Approximate characters per word: ~4-5 chars, so 500 words ≈ 2000-2500 chars
    private readonly CHUNK_SIZE_CHARS = 2000; // Characters per chunk (approximate to 500 words)
    private readonly CHUNK_OVERLAP_CHARS = 400; // Characters overlap (approximate to 100 words)
    private textSplitter: RecursiveCharacterTextSplitter;

    constructor(
        private embeddingService: EmbeddingService,
        private ragService: RagService,
        private prisma: PrismaService,
    ) {
        // Initialize LangChain text splitter with similar chunking behavior
        // Using character-based splitting with overlap to approximate word-based chunking
        this.textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: this.CHUNK_SIZE_CHARS,
            chunkOverlap: this.CHUNK_OVERLAP_CHARS,
            separators: ['\n\n', '\n', '. ', ' ', ''], // Try to split on paragraph, line, sentence, word boundaries
        });
    }

    /**
     * Process PDF file: Extract text, chunk, generate embeddings, store in vector DB
     * This is called asynchronously after file upload to avoid blocking
     */
    async processFile(buffer: Buffer, metadata: {
        file_id: string;
        class_id?: string;
        subject?: string;
        classBand?: string;
        school_id: string;
        source?: string;
        category?: string;
    }): Promise<{ chunksProcessed: number; totalChunks: number; skipped: number }> {
        const startTime = Date.now();
        this.logger.log(`[PDF Processing] Starting processing for file_id: ${metadata.file_id}`);
        this.logger.log(`[PDF Processing] Metadata:`, JSON.stringify(metadata, null, 2));

        try {
            // 1. Extract Text from PDF
            this.logger.log(`[PDF Processing] Step 1: Extracting text from PDF...`);
        const data = await pdf(buffer);
            let fullText = data.text.trim();

            // Clean text: Remove null bytes and other invalid UTF-8 characters
            fullText = fullText.replace(/\0/g, ''); // Remove null bytes
            fullText = fullText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ''); // Remove other control characters
            fullText = fullText.trim();
            
            if (!fullText || fullText.length === 0) {
                this.logger.warn(`[PDF Processing] No text extracted from PDF (file_id: ${metadata.file_id})`);
                return { chunksProcessed: 0, totalChunks: 0, skipped: 0 };
            }

            this.logger.log(`[PDF Processing] Extracted ${fullText.length} characters from PDF (cleaned)`);

            // 2. Chunk Text using LangChain text splitter
            this.logger.log(`[PDF Processing] Step 2: Chunking text with LangChain...`);
            // Create LangChain Document with metadata
            const document = new Document({
                pageContent: fullText,
                metadata: {
                    file_id: metadata.file_id,
                    class_id: metadata.class_id,
                    subject: metadata.subject,
                    classBand: metadata.classBand,
                    school_id: metadata.school_id,
                }
            });
            // Use LangChain's text splitter for better semantic boundaries
            const langchainChunks = await this.textSplitter.splitDocuments([document]);
            this.logger.log(`[PDF Processing] Created ${langchainChunks.length} chunks using LangChain text splitter`);

            if (langchainChunks.length === 0) {
                this.logger.warn(`[PDF Processing] No chunks created from text`);
                return { chunksProcessed: 0, totalChunks: 0, skipped: 0 };
            }

            // 3. Generate Embeddings & Store
            this.logger.log(`[PDF Processing] Step 3: Generating embeddings and storing chunks...`);
        let processedCount = 0;
            let skippedCount = 0;

            for (let i = 0; i < langchainChunks.length; i++) {
                const chunkDoc = langchainChunks[i];
                const chunkContent = chunkDoc.pageContent;
                this.logger.log(`[PDF Processing] Processing chunk ${i + 1}/${langchainChunks.length} (${chunkContent.length} chars)...`);

                try {
                    // Generate embedding
                    const vector = await this.embeddingService.generateEmbedding(chunkContent);

                    // Graceful degradation: Skip if embeddings unavailable
                    if (!vector || vector.length === 0) {
                        this.logger.warn(`[PDF Processing] Embedding unavailable for chunk ${i + 1}, skipping...`);
                        skippedCount++;
                        continue;
                    }

                    this.logger.log(`[PDF Processing] Generated embedding (${vector.length} dimensions) for chunk ${i + 1}`);

                    // Store in vector database with metadata
                    // Merge chunk document metadata with file metadata
                    const chunkMetadata = {
                        ...metadata,
                        ...chunkDoc.metadata, // Preserve any metadata from the chunk
                        chunk_index: i,
                        chunk_total: langchainChunks.length,
                        chunk_length: chunkContent.length,
                    };

                    await this.ragService.storeVector(vector, chunkContent, chunkMetadata);
                    processedCount++;

                    this.logger.log(`[PDF Processing] Stored chunk ${i + 1}/${langchainChunks.length} in vector database`);

                    // Small delay to avoid rate limiting
                    if (i < langchainChunks.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                } catch (error) {
                    this.logger.error(`[PDF Processing] Error processing chunk ${i + 1}:`, error);
                    skippedCount++;
                    // Continue with next chunk
                }
            }

            const duration = Date.now() - startTime;
            this.logger.log(`[PDF Processing] Processing complete!`);
            this.logger.log(`[PDF Processing] Summary: ${processedCount} processed, ${skippedCount} skipped, ${langchainChunks.length} total`);
            this.logger.log(`[PDF Processing] Duration: ${duration}ms`);

            // Update RAG status to completed
            await this.prisma.files.update({
                where: { id: metadata.file_id },
                data: { rag_status: 'completed' },
            }).catch(e => this.logger.error(`Failed to update RAG status for ${metadata.file_id}`, e));

            return {
                chunksProcessed: processedCount,
                totalChunks: langchainChunks.length,
                skipped: skippedCount,
            };
        } catch (error: any) {
            this.logger.error(`[PDF Processing] Fatal error processing PDF (file_id: ${metadata.file_id}):`, error);
            this.logger.error('PDF processing failed', error);

            // Update RAG status to failed
            await this.prisma.files.update({
                where: { id: metadata.file_id },
                data: { 
                    rag_status: 'failed',
                    rag_error: error.message || 'Unknown error during PDF processing'
                },
            }).catch(e => this.logger.error(`Failed to update RAG error status for ${metadata.file_id}`, e));

            throw error;
        }
    }

}
