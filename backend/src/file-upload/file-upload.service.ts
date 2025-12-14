import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { UploadVoiceNoteDto, UploadFileDto } from './dto';

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
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
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
      console.error('Error deleting from storage:', error);
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

    return {
      id: fileRecord.id,
      name: fileRecord.file_title,
      class: fileRecord.classes.name,
      subject: fileRecord.grade_subjects.subjects_master?.name || 'Unknown',
      category: fileRecord.file_categories?.name || 'Uncategorized',
      storageUrl: publicUrl,
      storagePath: storageData.path,
      downloads: fileRecord.download_count || 0,
      uploadDate: fileRecord.created_at,
      fileType: fileRecord.file_type || 'pdf',
      size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
    };
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
        class: file.classes.name,
        subject: file.grade_subjects.subjects_master?.name || 'Unknown',
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
      console.error('Error deleting from storage:', error);
      // Continue with database deletion even if storage deletion fails
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

    const files = await this.prisma.files.findMany({
      where: {
        class_id: classId,
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
        class: file.classes.name,
        subject: file.grade_subjects.subjects_master?.name || 'Unknown',
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
      return {
        id: vn.id,
        title: vn.title,
        storageUrl: publicUrl,
        storagePath: vn.storage_url,
        durationSeconds: vn.duration_seconds,
        duration: vn.duration_seconds, // For compatibility
        fileSizeBytes: Number(vn.file_size_bytes),
        fileSize: Number(vn.file_size_bytes), // For compatibility
        subject: vn.grade_subjects.subjects_master?.name || 'Unknown',
        uploadDate: vn.created_at,
        createdAt: vn.created_at, // For compatibility
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

