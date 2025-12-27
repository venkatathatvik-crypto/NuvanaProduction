import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  BadRequestException,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileUploadService } from './file-upload.service';
import { UploadVoiceNoteDto, UploadFileDto } from './dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Tenant } from '../auth/decorators/tenant.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

const MAX_VOICE_NOTE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_PDF_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

@Controller('file-upload')
@UseGuards(RolesGuard)
export class FileUploadController {
  constructor(private readonly fileUploadService: FileUploadService) {}

  // ==================== VOICE NOTES ====================

  @Post('voice-notes')
  @Roles('teacher', 'school_admin', 'super_admin')
  @UseInterceptors(FileInterceptor('file'))
  @UsePipes(
    new ValidationPipe({
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      skipMissingProperties: false,
      whitelist: true,
      forbidNonWhitelisted: false, // Allow extra fields from FormData
    }),
  )
  async uploadVoiceNote(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_VOICE_NOTE_SIZE }),
          // File type validation is handled in the service layer
          // This allows all file types to pass through, service will validate
        ],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
    @Body() dto: UploadVoiceNoteDto,
    @CurrentUser() user: any,
    @Tenant() schoolId: string,
  ) {
    return this.fileUploadService.uploadVoiceNote(
      file,
      dto,
      user.sub,
      schoolId,
    );
  }

  @Get('voice-notes')
  @Roles('teacher', 'school_admin', 'super_admin')
  async getTeacherVoiceNotes(
    @CurrentUser() user: any,
    @Tenant() schoolId: string,
  ) {
    return this.fileUploadService.getTeacherVoiceNotes(user.sub, schoolId);
  }

  @Delete('voice-notes/:id')
  @Roles('teacher', 'school_admin', 'super_admin')
  async deleteVoiceNote(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Tenant() schoolId: string,
  ) {
    return this.fileUploadService.deleteVoiceNote(id, user.sub, schoolId);
  }

  // ==================== FILES (PDF/VIDEO) ====================

  @Post('files')
  @Roles('teacher', 'school_admin', 'super_admin')
  @UseInterceptors(FileInterceptor('file'))
  @UsePipes(
    new ValidationPipe({
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      skipMissingProperties: false,
      whitelist: true,
      forbidNonWhitelisted: false, // Allow extra fields from FormData
    }),
  )
  async uploadFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_VIDEO_SIZE }), // Use max video size for validation
          new FileTypeValidator({
            fileType: /^(application\/pdf|video\/.+)$/,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body() dto: UploadFileDto,
    @CurrentUser() user: any,
    @Tenant() schoolId: string,
  ) {
    // Additional validation based on fileType
    if (dto.fileType === 'pdf' && file.size > MAX_PDF_SIZE) {
      throw new BadRequestException('PDF file size must be 10MB or less.');
    }
    if (dto.fileType === 'video' && file.size > MAX_VIDEO_SIZE) {
      throw new BadRequestException('Video file size must be 100MB or less.');
    }

    // Validate teacherId and schoolId match authenticated user
    // JWT payload uses 'sub' for user ID
    if (dto.teacherId !== user.sub) {
      throw new BadRequestException('Teacher ID in body must match authenticated user ID.');
    }
    if (dto.schoolId !== schoolId) {
      throw new BadRequestException('School ID in body must match authenticated user school ID.');
    }

    return this.fileUploadService.uploadFile(file, dto, user.sub, schoolId);
  }

  @Get('files')
  @Roles('teacher', 'school_admin', 'super_admin')
  async getTeacherFiles(
    @CurrentUser() user: any,
    @Tenant() schoolId: string,
  ) {
    return this.fileUploadService.getTeacherFiles(user.sub, schoolId);
  }

  @Delete('files/:id')
  @Roles('teacher', 'school_admin', 'super_admin')
  async deleteFile(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Tenant() schoolId: string,
  ) {
    return this.fileUploadService.deleteFile(id, user.sub, schoolId);
  }

  @Get('files/class/:classId')
  @Roles('teacher', 'school_admin', 'super_admin', 'student')
  async getFilesByClass(
    @Param('classId') classId: string,
    @Tenant() schoolId: string,
  ) {
    return this.fileUploadService.getFilesByClass(classId, schoolId);
  }

  @Get('voice-notes/class/:classId')
  @Roles('teacher', 'school_admin', 'super_admin', 'student')
  async getVoiceNotesByClass(
    @Param('classId') classId: string,
    @Tenant() schoolId: string,
  ) {
    return this.fileUploadService.getVoiceNotesByClass(classId, schoolId);
  }

  @Post('files/:id/download')
  @Roles('teacher', 'school_admin', 'super_admin', 'student')
  async incrementFileDownload(
    @Param('id') id: string,
    @Tenant() schoolId: string,
  ) {
    const count = await this.fileUploadService.incrementFileDownload(id, schoolId);
    return { downloadCount: count };
  }
}

