import { Module } from '@nestjs/common';
import { PdfAnnotationsController } from './pdf-annotations.controller';
import { PdfAnnotationsService } from './pdf-annotations.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PdfAnnotationsController],
  providers: [PdfAnnotationsService],
  exports: [PdfAnnotationsService],
})
export class PdfAnnotationsModule {}
