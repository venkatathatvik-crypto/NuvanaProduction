import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto, UpdateAnnouncementDto } from './dto';
import { Tenant } from '../auth/decorators/tenant.decorator';

@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Post()
  async createAnnouncement(
    @Body() dto: CreateAnnouncementDto,
    @Tenant() schoolId: string,
  ) {
    return this.announcementsService.createAnnouncement(dto, schoolId);
  }

  @Get('teacher/:teacherId')
  async getTeacherAnnouncements(
    @Param('teacherId') teacherId: string,
    @Tenant() schoolId: string,
  ) {
    return this.announcementsService.getTeacherAnnouncements(
      teacherId,
      schoolId,
    );
  }

  @Get('student/class/:classId')
  async getStudentAnnouncements(
    @Param('classId') classId: string,
    @Tenant() schoolId: string,
  ) {
    return this.announcementsService.getStudentAnnouncements(
      classId,
      schoolId,
    );
  }

  @Get(':id')
  async getAnnouncementById(
    @Param('id') id: string,
    @Tenant() schoolId: string,
  ) {
    return this.announcementsService.getAnnouncementById(id, schoolId);
  }

  @Patch(':id')
  async updateAnnouncement(
    @Param('id') id: string,
    @Body() dto: UpdateAnnouncementDto,
    @Tenant() schoolId: string,
  ) {
    return this.announcementsService.updateAnnouncement(id, dto, schoolId);
  }

  @Delete(':id')
  async deleteAnnouncement(
    @Param('id') id: string,
    @Tenant() schoolId: string,
  ) {
    await this.announcementsService.deleteAnnouncement(id, schoolId);
    return { message: 'Announcement deleted successfully' };
  }
}
