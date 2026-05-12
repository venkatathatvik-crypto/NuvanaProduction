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
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { SaveAnnotationDto } from "./dto/save-annotation.dto";

@Controller("pdf-annotations")
@UseGuards(RolesGuard)
export class PdfAnnotationsController {
  constructor(private readonly pdfAnnotationsService: PdfAnnotationsService) {}

  @Post()
  @Roles("teacher", "student")
  saveAnnotation(
    @Body() dto: SaveAnnotationDto,
    @Tenant() schoolId: string,
    @CurrentUser("id") profileId: string
  ) {
    return this.pdfAnnotationsService.saveAnnotation(dto, schoolId, profileId);
  }

  @Get(":fileId")
  @Roles("teacher", "student")
  getAnnotations(
    @Param("fileId") fileId: string,
    @Tenant() schoolId: string,
    @CurrentUser("id") profileId: string
  ) {
    return this.pdfAnnotationsService.getAnnotationsByFile(fileId, schoolId, profileId);
  }

  @Delete(":fileId")
  @Roles("teacher", "student")
  deleteAnnotations(
    @Param("fileId") fileId: string,
    @Tenant() schoolId: string,
    @CurrentUser("id") profileId: string
  ) {
    return this.pdfAnnotationsService.deleteAnnotationsByFile(fileId, schoolId, profileId);
  }
}
