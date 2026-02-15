import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SaveAnnotationDto } from './dto/save-annotation.dto';

@Injectable()
export class PdfAnnotationsService {
  constructor(private readonly prisma: PrismaService) {}

  async saveAnnotation(dto: SaveAnnotationDto, schoolId: string, profileId: string) {
    const { file_id, page_number, annotation_data, note_type } = dto;

    // Check if annotation already exists for this file, page, user, and type
    const existingAnnotation = await this.prisma.pdf_annotations.findFirst({
      where: {
        file_id,
        school_id: schoolId,
        page_number,
        profile_id: profileId,
        note_type,
      },
    });

    if (existingAnnotation) {
      return this.prisma.pdf_annotations.update({
        where: { id: existingAnnotation.id },
        data: {
          annotation_data,
          updated_at: new Date(),
        },
      });
    }

    return this.prisma.pdf_annotations.create({
      data: {
        file_id,
        school_id: schoolId,
        page_number,
        profile_id: profileId,
        note_type,
        annotation_data,
      },
    });
  }

  async getAnnotationsByFile(fileId: string, schoolId: string, profileId: string) {
    // 1. Identify the file and its assigned teacher
    const file = await this.prisma.files.findUnique({
      where: { id: fileId },
      select: { teacher_id: true }
    });

    const assignedTeacherId = file?.teacher_id;
    const isOwnerTeacher = assignedTeacherId === profileId;

    // 2. Fetch annotations based on user context
    // We'll use a safer approach:
    // If the viewing user is the assigned teacher, they ONLY get their own notes.
    if (isOwnerTeacher) {
      return this.prisma.pdf_annotations.findMany({
        where: {
          file_id: fileId,
          school_id: schoolId,
          profile_id: profileId,
        },
        orderBy: { page_number: 'asc' },
      });
    }

    // If the viewer is NOT the assigned teacher (likely a student),
    // they get their own notes OR the assigned teacher's SCRATCHPAD notes.
    return this.prisma.pdf_annotations.findMany({
      where: {
        file_id: fileId,
        school_id: schoolId,
        OR: [
          { profile_id: profileId },
          { 
            profile_id: assignedTeacherId, 
            note_type: 'SCRATCHPAD' 
          }
        ],
      },
      orderBy: { page_number: 'asc' },
    });
  }



  async deleteAnnotationsByFile(fileId: string, schoolId: string, profileId: string) {
    return this.prisma.pdf_annotations.deleteMany({
      where: {
        file_id: fileId,
        school_id: schoolId,
        profile_id: profileId,
      },
    });
  }
}
