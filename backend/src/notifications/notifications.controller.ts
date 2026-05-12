import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto, CreateBatchNotificationDto } from './dto';
import { Tenant } from '../auth/decorators/tenant.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  async createNotification(
    @Body() dto: CreateNotificationDto,
    @Tenant() schoolId: string,
  ) {
    return this.notificationsService.createNotification(dto, schoolId);
  }

  @Post('batch')
  async createBatchNotifications(
    @Body() dto: CreateBatchNotificationDto,
    @Tenant() schoolId: string,
  ) {
    return this.notificationsService.createBatchNotifications(dto, schoolId);
  }

  @Get('recipient/:recipientId')
  async getNotifications(
    @Param('recipientId') recipientId: string,
    @Query('limit') limit: string,
    @Tenant() schoolId: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.notificationsService.getNotifications(recipientId, schoolId, limitNum);
  }

  @Get('recipient/:recipientId/unread-count')
  async getUnreadCount(
    @Param('recipientId') recipientId: string,
    @Tenant() schoolId: string,
  ) {
    return this.notificationsService.getUnreadCount(recipientId, schoolId);
  }

  @Patch(':id/read/recipient/:recipientId')
  async markAsRead(
    @Param('id') id: string,
    @Param('recipientId') recipientId: string,
    @Tenant() schoolId: string,
  ) {
    return this.notificationsService.markAsRead(id, recipientId, schoolId);
  }

  @Patch('recipient/:recipientId/read-all')
  async markAllAsRead(
    @Param('recipientId') recipientId: string,
    @Tenant() schoolId: string,
  ) {
    return this.notificationsService.markAllAsRead(recipientId, schoolId);
  }

  @Get('class/:classId/student-ids')
  async getStudentIdsInClass(
    @Param('classId') classId: string,
    @Tenant() schoolId: string,
  ) {
    const studentIds = await this.notificationsService.getStudentIdsInClass(classId, schoolId);
    return { student_ids: studentIds };
  }
}

