import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SaveAnnotationDto } from './dto/save-annotation.dto';

@Injectable()
export class PdfAnnotationsService {
  constructor(private readonly prisma: PrismaService) {}

  async saveAnnotation(dto: SaveAnnotationDto, schoolId: string) {
    const { file_id, page_number, annotation_data } = dto;

    // Check if annotation already exists for this file and page
    const existingAnnotation = await this.prisma.pdf_annotations.findFirst({
      where: {
        file_id,
        school_id: schoolId,
        page_number,
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
        annotation_data,
      },
    });
  }

  async getAnnotationsByFile(fileId: string, schoolId: string) {
    return this.prisma.pdf_annotations.findMany({
      where: {
        file_id: fileId,
        school_id: schoolId,
      },
      orderBy: {
        page_number: 'asc',
      },
    });
  }

  async deleteAnnotationsByFile(fileId: string, schoolId: string) {
    return this.prisma.pdf_annotations.deleteMany({
      where: {
        file_id: fileId,
        school_id: schoolId,
      },
    });
  }
}
