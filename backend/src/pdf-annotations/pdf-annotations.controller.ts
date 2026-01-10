import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from "@nestjs/common";
import { PdfAnnotationsService } from "./pdf-annotations.service";
import { Roles } from "../auth/decorators/roles.decorator";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Tenant } from "../auth/decorators/tenant.decorator";
import { SaveAnnotationDto } from "./dto/save-annotation.dto";

@Controller("pdf-annotations")
@UseGuards(RolesGuard)
export class PdfAnnotationsController {
  constructor(private readonly pdfAnnotationsService: PdfAnnotationsService) {}

  @Post()
  @Roles("teacher")
  saveAnnotation(
    @Body() dto: SaveAnnotationDto,
    @Tenant() schoolId: string
  ) {
    return this.pdfAnnotationsService.saveAnnotation(dto, schoolId);
  }

  @Get(":fileId")
  @Roles("teacher", "student")
  getAnnotations(
    @Param("fileId") fileId: string,
    @Tenant() schoolId: string
  ) {
    return this.pdfAnnotationsService.getAnnotationsByFile(fileId, schoolId);
  }

  @Delete(":fileId")
  @Roles("teacher")
  deleteAnnotations(
    @Param("fileId") fileId: string,
    @Tenant() schoolId: string
  ) {
    return this.pdfAnnotationsService.deleteAnnotationsByFile(fileId, schoolId);
  }
}
