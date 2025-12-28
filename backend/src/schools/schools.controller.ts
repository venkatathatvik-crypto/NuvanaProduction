import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SchoolsService } from './schools.service';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { OnboardSchoolDto } from './dto/onboard-school.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { StorageService } from '../storage/storage.service';

@Controller('schools')
@UseGuards(RolesGuard)
@Roles('super_admin')
export class SchoolsController {
  constructor(
    private readonly schoolsService: SchoolsService,
    private readonly storageService: StorageService,
  ) {}

  @Post()
  create(@Body() createSchoolDto: CreateSchoolDto) {
    return this.schoolsService.create(createSchoolDto);
  }

  @Post('onboard')
  onboard(@Body() onboardSchoolDto: OnboardSchoolDto) {
    return this.schoolsService.onboardSchool(onboardSchoolDto);
  }

  @Get()
  findAll() {
    return this.schoolsService.findAll();
  }

  @Get(':id')
  @Roles('school_admin', 'teacher', 'super_admin')
  findOne(@Param('id') id: string) {
    return this.schoolsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSchoolDto: UpdateSchoolDto) {
    return this.schoolsService.update(id, updateSchoolDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.schoolsService.remove(id);
  }

  @Post(':id/logo')
  @Roles('school_admin', 'super_admin')
  @UseInterceptors(FileInterceptor('logo'))
  async uploadLogo(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate file type
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Only image files (JPEG, PNG, WebP) are allowed');
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size must be less than 5MB');
    }

    try {
      // Generate unique filename
      const timestamp = Date.now();
      const extension = file.originalname.split('.').pop();
      const filename = `school-logos/${id}/${timestamp}.${extension}`;

      // Upload to Supabase
      const { path } = await this.storageService.uploadFile(
        'files',
        filename,
        file.buffer,
        file.mimetype,
        { upsert: true },
      );

      // Get public URL
      const publicUrl = this.storageService.getPublicUrl('files', path);

      // Update school logo_url in database
      const updatedSchool = await this.schoolsService.updateLogo(id, publicUrl);

      return {
        message: 'Logo uploaded successfully',
        logo_url: publicUrl,
        school: updatedSchool,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to upload logo: ${error.message}`);
    }
  }
}
