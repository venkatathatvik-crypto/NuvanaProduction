import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { UploadVoiceNoteDto, UploadFileDto, UploadLifeCoachBookDto } from './dto';
import { IngestionService } from '../ai/rag/ingestion.service';
import { RagService } from '../ai/rag/rag.service';

const MAX_VOICE_NOTE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_PDF_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

const VALID_AUDIO_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/ogg',
  'audio/webm',
  'audio/mp4',
];

const VALID_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-ms-wmv',
];

@Injectable()
export class FileUploadService {
  private readonly logger = new Logger(FileUploadService.name);

  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private ingestionService: IngestionService,
    private ragService: RagService,
  ) {}

  /**
   * Upload a voice note
   */
  async uploadVoiceNote(
    file: Express.Multer.File,
    dto: UploadVoiceNoteDto,
    teacherId: string,
    schoolId: string,
  ) {
    // Validate file type
    if (!file.mimetype.startsWith('audio/') && !VALID_AUDIO_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Only audio files are allowed.');
    }

    // Validate file size
    if (file.size > MAX_VOICE_NOTE_SIZE) {
      throw new BadRequestException('File size must be 50MB or less.');
    }

    // Verify class belongs to school
    const classExists = await this.prisma.classes.findFirst({
      where: { id: dto.classId, school_id: schoolId },
    });

    if (!classExists) {
      throw new NotFoundException('Class not found');
    }

    // Verify grade subject belongs to school
    const gradeSubject = await this.prisma.grade_subjects.findFirst({
      where: { id: dto.gradeSubjectId, school_id: schoolId },
    });

    if (!gradeSubject) {
      throw new NotFoundException('Grade subject not found');
    }

    // Determine file extension
    const fileExtension = this.getFileExtension(file.originalname, file.mimetype);
    const fileName = `voice-${Date.now()}.${fileExtension}`;
    const filePath = `${teacherId}/${fileName}`;

    // Upload to Supabase storage
    const storageData = await this.storage.uploadFile(
      'voice_notes',
      filePath,
      file.buffer,
      file.mimetype,
    );

    // Convert durationSeconds from string to number
    const durationSeconds = typeof dto.durationSeconds === 'string' 
      ? parseInt(dto.durationSeconds, 10) 
      : dto.durationSeconds;

    // Save to database
    const voiceNote = await this.prisma.voice_notes.create({
      data: {
        title: dto.title,
        class_id: dto.classId,
        grade_subject_id: dto.gradeSubjectId,
        storage_url: storageData.path,
        duration_seconds: durationSeconds,
        file_size_bytes: BigInt(file.size),
        teacher_id: teacherId,
        school_id: schoolId,
      },
      include: {
        classes: {
          select: { id: true, name: true },
        },
        grade_subjects: {
          include: {
            subjects_master: {
              select: { name: true },
            },
          },
        },
      },
    });

    // Get public URL
    const publicUrl = this.storage.getPublicUrl('voice_notes', storageData.path);

    return {
      id: voiceNote.id,
      title: voiceNote.title,
      storageUrl: publicUrl,
      storagePath: storageData.path,
      durationSeconds: voiceNote.duration_seconds,
      createdAt: voiceNote.created_at,
      className: voiceNote.classes.name,
      subject: voiceNote.grade_subjects.subjects_master?.name || 'Unknown',
      size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
    };
  }

  /**
   * Get all voice notes for a teacher
   */
  async getTeacherVoiceNotes(teacherId: string, schoolId: string) {
    const voiceNotes = await this.prisma.voice_notes.findMany({
      where: {
        teacher_id: teacherId,
        school_id: schoolId,
      },
      include: {
        classes: {
          select: { id: true, name: true },
        },
        grade_subjects: {
          include: {
            subjects_master: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return voiceNotes.map((vn) => {
      const publicUrl = this.storage.getPublicUrl('voice_notes', vn.storage_url);
      return {
        id: vn.id,
        title: vn.title,
        storageUrl: publicUrl,
        storagePath: vn.storage_url,
        durationSeconds: vn.duration_seconds,
        createdAt: vn.created_at,
        className: vn.classes.name,
        subject: vn.grade_subjects.subjects_master?.name || 'Unknown',
        size: `${(Number(vn.file_size_bytes) / (1024 * 1024)).toFixed(2)} MB`,
      };
    });
  }

  /**
   * Delete a voice note
   */
  async deleteVoiceNote(voiceNoteId: string, teacherId: string, schoolId: string) {
    // Verify the voice note belongs to the teacher
    const voiceNote = await this.prisma.voice_notes.findFirst({
      where: {
        id: voiceNoteId,
        teacher_id: teacherId,
        school_id: schoolId,
      },
    });

    if (!voiceNote) {
      throw new NotFoundException('Voice note not found or access denied');
    }

    // Delete from storage
    try {
      await this.storage.deleteFile('voice_notes', voiceNote.storage_url);
    } catch (error) {
      this.logger.error('Error deleting from storage:', error);
      // Continue with database deletion even if storage deletion fails
    }

    // Delete from database
    await this.prisma.voice_notes.delete({
      where: { id: voiceNoteId },
    });

    return { message: 'Voice note deleted successfully' };
  }

  /**
   * Upload a file (PDF or video)
   */
  async uploadFile(
    file: Express.Multer.File,
    dto: UploadFileDto,
    teacherId: string,
    schoolId: string,
  ) {
    // Validate file type
    if (dto.fileType === 'pdf') {
      if (file.mimetype !== 'application/pdf') {
        throw new BadRequestException('Only PDF files are allowed for documents.');
      }
      if (file.size > MAX_PDF_SIZE) {
        throw new BadRequestException('PDF file size must be 10MB or less.');
      }
    } else if (dto.fileType === 'video') {
      if (!VALID_VIDEO_TYPES.includes(file.mimetype)) {
        throw new BadRequestException(
          'Only video files (MP4, WebM, OGG, MOV, AVI, WMV) are allowed.',
        );
      }
      if (file.size > MAX_VIDEO_SIZE) {
        throw new BadRequestException('Video file size must be 100MB or less.');
      }
    }

    // Verify class belongs to school - now REQUIRED
    if (!dto.classId) {
      throw new BadRequestException('Class ID is required');
    }
    
    const classExists = await this.prisma.classes.findFirst({
      where: { id: dto.classId, school_id: schoolId },
    });

    if (!classExists) {
      throw new NotFoundException('Class not found');
    }

    // Verify grade subject belongs to school
    const gradeSubject = await this.prisma.grade_subjects.findFirst({
      where: { id: dto.gradeSubjectId, school_id: schoolId },
    });

    if (!gradeSubject) {
      throw new NotFoundException('Grade subject not found');
    }

    // Verify category if provided
    const categoryId = typeof dto.categoryId === 'string' ? parseInt(dto.categoryId, 10) : dto.categoryId;
    if (categoryId) {
      const category = await this.prisma.file_categories.findFirst({
        where: { id: categoryId, school_id: schoolId },
      });

      if (!category) {
        throw new NotFoundException('File category not found');
      }
    }

    // === Deduplication: Replace on Re-upload ===
    // Check if a file with the same title + teacher + subject already exists
    const existingFile = await this.prisma.files.findFirst({
      where: {
        file_title: dto.title,
        teacher_id: teacherId,
        grade_subject_id: dto.gradeSubjectId,
        school_id: schoolId,
      },
    });

    if (existingFile) {
      this.logger.log(`[Dedup] 🔄 Found existing file "${dto.title}" (id: ${existingFile.id}). Replacing...`);

      // 1. Delete old RAG vectors
      try {
        const deletedVectors = await this.ragService.deleteByFileId(existingFile.id);
        this.logger.log(`[Dedup] 🗑️ Cleaned up ${deletedVectors} old RAG vectors`);
      } catch (error) {
        this.logger.warn(`[Dedup] ⚠️ Failed to clean old RAG vectors, continuing anyway:`, error);
      }

      // 2. Delete old file from storage
      try {
        await this.storage.deleteFile('files', existingFile.storage_url);
      } catch (error) {
        this.logger.warn(`[Dedup] ⚠️ Failed to delete old storage file, continuing:`, error);
      }

      // 3. Delete old file record from DB
      await this.prisma.files.delete({ where: { id: existingFile.id } });
      this.logger.log(`[Dedup] ✅ Old file replaced successfully`);
    }

    // Generate file path
    const fileName = `${Date.now()}-${file.originalname}`;
    const filePath = `${teacherId}/${fileName}`;

    // Upload to Supabase storage
    const storageData = await this.storage.uploadFile(
      'files',
      filePath,
      file.buffer,
      file.mimetype,
    );

    // Save to database
    const fileRecord = await this.prisma.files.create({
      data: {
        file_title: dto.title,
        category_id: categoryId || null,
        class_id: dto.classId,
        grade_subject_id: dto.gradeSubjectId,
        storage_url: storageData.path,
        teacher_id: teacherId,
        school_id: schoolId,
        file_type: dto.fileType,
        rag_status: dto.fileType === 'pdf' ? 'processing' : null,
      },
      include: {
        file_categories: {
          select: { id: true, name: true },
        },
        classes: {
          select: { id: true, name: true },
        },
        grade_subjects: {
          include: {
            subjects_master: {
              select: { name: true },
            },
          },
        },
      },
    });

    // Get public URL
    const publicUrl = this.storage.getPublicUrl('files', storageData.path);

    const response = {
      id: fileRecord.id,
      name: fileRecord.file_title,
      class: fileRecord.classes?.name || 'All Classes',
      classId: fileRecord.class_id,
      subject: fileRecord.grade_subjects.subjects_master?.name || 'Unknown',
      gradeSubjectId: fileRecord.grade_subject_id,
      category: fileRecord.file_categories?.name || 'Uncategorized',
      storageUrl: publicUrl,
      storagePath: storageData.path,
      downloads: fileRecord.download_count || 0,
      uploadDate: fileRecord.created_at,
      fileType: fileRecord.file_type || 'pdf',
      size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
    };

    // Process PDF for RAG asynchronously (non-blocking)
    if (dto.fileType === 'pdf' && file.buffer) {
      this.logger.log(`[File Upload] 📄 PDF detected, scheduling RAG processing (file_id: ${fileRecord.id})...`);
      
      // Process in background (don't await - non-blocking)
      this.processPdfForRag(file.buffer, {
        file_id: fileRecord.id,
        class_id: dto.classId || 'all',
        subject: fileRecord.grade_subjects.subjects_master?.name || 'Unknown',
        classBand: fileRecord.classes?.name ? this.inferClassBand(fileRecord.classes.name) : 'middle',
        school_id: schoolId,
      }).catch((error) => {
        this.logger.error(`[File Upload] ❌ Background PDF processing failed for file_id: ${fileRecord.id}`, error);
        this.logger.error('Background PDF processing failed', error);
        // Don't throw - file upload succeeded, processing failed separately
      });
    }

    return response;
  }

  /**
   * Process PDF for RAG in background (async, non-blocking)
   * This runs after file upload completes to avoid blocking the upload response
   */
  private async processPdfForRag(
    buffer: Buffer,
    metadata: {
      file_id: string;
      class_id?: string;
      subject?: string;
      classBand?: string;
      school_id: string;
      source?: string;
      category?: string;
    },
  ): Promise<void> {
    this.logger.log(`[File Upload] 🚀 Starting background PDF processing for RAG...`);
    this.logger.log(`[File Upload] File ID: ${metadata.file_id}, Class: ${metadata.class_id}, Subject: ${metadata.subject}`);

    try {
      const result = await this.ingestionService.processFile(buffer, metadata);
      this.logger.log(`[File Upload] ✅ PDF processing complete: ${result.chunksProcessed}/${result.totalChunks} chunks stored`);
      this.logger.log(`PDF processed for RAG: ${result.chunksProcessed} chunks stored for file ${metadata.file_id}`);
    } catch (error) {
      this.logger.error(`[File Upload] ❌ PDF processing error:`, error);
      this.logger.error(`Failed to process PDF for RAG (file_id: ${metadata.file_id})`, error);
      throw error;
    }
  }

  /**
   * Infer class band from class name (e.g., "Class 8B" -> "middle")
   */
  private inferClassBand(className: string): string {
    const lower = className.toLowerCase();
    if (lower.includes('1') || lower.includes('2') || lower.includes('3') || 
        lower.includes('4') || lower.includes('5') || lower.includes('kg') || lower.includes('nursery')) {
      return 'primary';
    } else if (lower.includes('6') || lower.includes('7') || lower.includes('8')) {
      return 'middle';
    } else if (lower.includes('9') || lower.includes('10') || lower.includes('11') || lower.includes('12')) {
      return 'high';
    }
    return 'middle'; // Default
  }

  /**
   * Get all files for a teacher
   */
  async getTeacherFiles(teacherId: string, schoolId: string) {
    const files = await this.prisma.files.findMany({
      where: {
        teacher_id: teacherId,
        school_id: schoolId,
      },
      include: {
        file_categories: {
          select: { id: true, name: true },
        },
        classes: {
          select: { id: true, name: true },
        },
        grade_subjects: {
          include: {
            subjects_master: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return files.map((file) => {
      const publicUrl = this.storage.getPublicUrl('files', file.storage_url);
      return {
        id: file.id,
        name: file.file_title,
        class: file.classes?.name || 'All Classes',
        classId: file.class_id,
        subject: file.grade_subjects.subjects_master?.name || 'Unknown',
        gradeSubjectId: file.grade_subject_id,
        category: file.file_categories?.name || 'Uncategorized',
        storageUrl: publicUrl,
        storagePath: file.storage_url,
        downloads: file.download_count || 0,
        uploadDate: file.created_at,
        fileType: file.file_type || 'pdf',
      };
    });
  }

  /**
   * Delete a file
   */
  async deleteFile(fileId: string, teacherId: string, schoolId: string) {
    // Verify the file belongs to the teacher
    const file = await this.prisma.files.findFirst({
      where: {
        id: fileId,
        teacher_id: teacherId,
        school_id: schoolId,
      },
    });

    if (!file) {
      throw new NotFoundException('File not found or access denied');
    }

    // Delete from storage
    try {
      await this.storage.deleteFile('files', file.storage_url);
    } catch (error) {
      this.logger.error('Error deleting from storage:', error);
      // Continue with database deletion even if storage deletion fails
    }

    // Delete RAG vectors
    try {
      await this.ragService.deleteByFileId(fileId);
    } catch (error) {
      this.logger.warn(`[Delete] ⚠️ Failed to clean RAG vectors for file ${fileId}, continuing:`, error);
    }

    // Delete from database
    await this.prisma.files.delete({
      where: { id: fileId },
    });

    return { message: 'File deleted successfully' };
  }

  /**
   * Get all files for a class (for students)
   * Filters by class_id and school_id to ensure proper access control
   */
  async getFilesByClass(classId: string, schoolId: string) {
    // Verify class belongs to school for security and get grade level
    const classExists = await this.prisma.classes.findFirst({
      where: {
        id: classId,
        school_id: schoolId,
      },
      include: {
        grade_levels: {
          select: { id: true },
        },
      },
    });

    if (!classExists) {
      throw new NotFoundException('Class not found or access denied');
    }

    const gradeLevelId = classExists.grade_level_id;

    // Get files specifically assigned to this class
    const files = await this.prisma.files.findMany({
      where: {
        school_id: schoolId,
        class_id: classId,
      },
      include: {
        file_categories: {
          select: { id: true, name: true },
        },
        classes: {
          select: { id: true, name: true },
        },
        grade_subjects: {
          include: {
            subjects_master: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return files.map((file) => {
      const publicUrl = this.storage.getPublicUrl('files', file.storage_url);
      return {
        id: file.id,
        name: file.file_title,
        class: file.classes?.name || 'All Classes',
        classId: file.class_id,
        subject: file.grade_subjects.subjects_master?.name || 'Unknown',
        gradeSubjectId: file.grade_subject_id,
        category: file.file_categories?.name || 'Uncategorized',
        storageUrl: publicUrl,
        storagePath: file.storage_url,
        downloads: file.download_count || 0,
        uploadDate: file.created_at,
        fileType: file.file_type || 'pdf',
        size: 'N/A', // File size not stored in files table
      };
    });
  }

  /**
   * Get all voice notes for a class (for students)
   * Filters by class_id and school_id to ensure proper access control
   */
  async getVoiceNotesByClass(classId: string, schoolId: string) {
    // Verify class belongs to school for security
    const classExists = await this.prisma.classes.findFirst({
      where: {
        id: classId,
        school_id: schoolId,
      },
    });

    if (!classExists) {
      throw new NotFoundException('Class not found or access denied');
    }

    const voiceNotes = await this.prisma.voice_notes.findMany({
      where: {
        class_id: classId,
        school_id: schoolId,
      },
      include: {
        classes: {
          select: { id: true, name: true },
        },
        grade_subjects: {
          include: {
            subjects_master: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return voiceNotes.map((vn) => {
      const publicUrl = this.storage.getPublicUrl('voice_notes', vn.storage_url);
      // Ensure created_at is never null - use current date as fallback
      const createdAt = vn.created_at || new Date();
      // Format as ISO string for consistent frontend handling
      const uploadDate = createdAt instanceof Date 
        ? createdAt.toISOString() 
        : new Date(createdAt).toISOString();
      
      return {
        id: vn.id,
        title: vn.title,
        storageUrl: publicUrl,
        storagePath: vn.storage_url,
        durationSeconds: vn.duration_seconds,
        duration: vn.duration_seconds, // For compatibility
        fileSizeBytes: Number(vn.file_size_bytes),
        fileSize: Number(vn.file_size_bytes), // For compatibility
        subject: vn.grade_subjects?.subjects_master?.name || 'Unknown',
        uploadDate: uploadDate,
        createdAt: uploadDate, // For compatibility
      };
    });
  }

  /**
   * Increment download count for a file
   */
  async incrementFileDownload(fileId: string, schoolId: string) {
    const file = await this.prisma.files.findFirst({
      where: {
        id: fileId,
        school_id: schoolId,
      },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    const updated = await this.prisma.files.update({
      where: { id: fileId },
      data: {
        download_count: (file.download_count || 0) + 1,
      },
    });

    return updated.download_count || 0;
  }

  // ==================== LIFE COACH BOOKS ====================

  async uploadLifeCoachBook(
    file: Express.Multer.File,
    dto: UploadLifeCoachBookDto,
    uploaderId: string,
    schoolId: string,
  ) {
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Only PDF files are allowed for life coach books.');
    }
    if (file.size > MAX_PDF_SIZE) {
      throw new BadRequestException('PDF file size must be 10MB or less.');
    }

    const categoryId = parseInt(dto.categoryId, 10);
    const category = await this.prisma.life_coach_categories.findFirst({
      where: { id: categoryId, school_id: schoolId },
    });
    if (!category) throw new NotFoundException('Life coach category not found');

    // Deduplication
    const existing = await this.prisma.life_coach_books.findFirst({
      where: { title: dto.title, category_id: categoryId, school_id: schoolId },
    });
    if (existing) {
      this.logger.log(`[Life Coach] Replacing existing book "${dto.title}"`);
      try { await this.ragService.deleteByFileId(existing.id); } catch (e) {}
      try { await this.storage.deleteFile('files', existing.storage_url); } catch (e) {}
      await this.prisma.life_coach_books.delete({ where: { id: existing.id } });
    }

    const fileName = `${Date.now()}-${file.originalname}`;
    const filePath = `life-coach/${schoolId}/${fileName}`;
    const storageData = await this.storage.uploadFile('files', filePath, file.buffer, file.mimetype);

    const bookRecord = await this.prisma.life_coach_books.create({
      data: {
        title: dto.title,
        category_id: categoryId,
        storage_url: storageData.path,
        uploaded_by: uploaderId,
        school_id: schoolId,
        file_type: 'pdf',
        rag_status: 'processing',
      },
      include: { life_coach_categories: { select: { id: true, name: true } } },
    });

    this.processPdfForRag(file.buffer, {
      file_id: bookRecord.id,
      school_id: schoolId,
      source: 'life_coach',
      category: category.name,
    }).then(() => {
      this.prisma.life_coach_books.update({
        where: { id: bookRecord.id },
        data: { rag_status: 'completed' },
      }).catch(() => {});
    }).catch((error) => {
      this.logger.error(`[Life Coach] PDF processing failed for book ${bookRecord.id}`, error);
      this.prisma.life_coach_books.update({
        where: { id: bookRecord.id },
        data: { rag_status: 'failed', rag_error: (error?.message || 'Unknown error').substring(0, 500) },
      }).catch(() => {});
    });

    return {
      id: bookRecord.id,
      title: bookRecord.title,
      category: bookRecord.life_coach_categories?.name || 'Unknown',
      categoryId: bookRecord.category_id,
      uploadDate: bookRecord.created_at,
      ragStatus: bookRecord.rag_status,
      size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
    };
  }

  async getLifeCoachBooks(schoolId: string, skip = 0, take = 100) {
    const books = await this.prisma.life_coach_books.findMany({
      where: { school_id: schoolId },
      include: {
        life_coach_categories: { select: { id: true, name: true } },
        profiles: { select: { name: true } },
      },
      orderBy: { created_at: 'desc' },
      skip,
      take,
    });
    return books.map((book) => ({
      id: book.id,
      title: book.title,
      category: book.life_coach_categories?.name || 'Unknown',
      categoryId: book.category_id,
      uploadedBy: book.profiles?.name || 'Unknown (deleted)',
      uploadDate: book.created_at,
      ragStatus: book.rag_status,
      ragError: book.rag_error,
    }));
  }

  async deleteLifeCoachBook(bookId: string, schoolId: string) {
    const book = await this.prisma.life_coach_books.findFirst({
      where: { id: bookId, school_id: schoolId },
    });
    if (!book) throw new NotFoundException('Life coach book not found');
    try { await this.storage.deleteFile('files', book.storage_url); } catch (e) {}
    try { await this.ragService.deleteByFileId(bookId); } catch (e) {}
    await this.prisma.life_coach_books.delete({ where: { id: bookId } });
    return { message: 'Life coach book deleted successfully' };
  }

  /**
   * Helper to get file extension from filename or mimetype
   */
  private getFileExtension(filename: string, mimetype: string): string {
    // Try to get extension from filename
    const parts = filename.split('.');
    if (parts.length > 1) {
      return parts[parts.length - 1].toLowerCase();
    }

    // Fallback to mimetype
    if (mimetype.includes('mp4')) return 'mp4';
    if (mimetype.includes('webm')) return 'webm';
    if (mimetype.includes('ogg')) return 'ogg';
    if (mimetype.includes('mpeg') || mimetype.includes('mp3')) return 'mp3';
    if (mimetype.includes('wav')) return 'wav';

    return 'webm'; // Default
  }
}

