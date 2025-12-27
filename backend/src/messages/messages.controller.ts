import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { MessagesService } from './messages.service';
import { SendMessageDto, MarkAsReadDto } from './dto/messages.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Tenant } from '../auth/decorators/tenant.decorator';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post('send')
  async sendMessage(
    @Body() dto: SendMessageDto,
    @CurrentUser('id') userId: string,
    @Tenant() schoolId: string,
  ) {
    return this.messagesService.sendMessage(dto, userId, schoolId);
  }

  @Get('conversations')
  async getConversations(
    @CurrentUser('id') userId: string,
    @Tenant() schoolId: string,
  ) {
    return this.messagesService.getConversations(userId, schoolId);
  }

  @Get('conversation/:otherUserId')
  async getConversation(
    @CurrentUser('id') userId: string,
    @Param('otherUserId') otherUserId: string,
    @Tenant() schoolId: string,
  ) {
    return this.messagesService.getConversation(userId, otherUserId, schoolId);
  }

  @Patch(':messageId/read')
  async markAsRead(
    @Param('messageId') messageId: string,
    @CurrentUser('id') userId: string,
    @Tenant() schoolId: string,
  ) {
    return this.messagesService.markAsRead(messageId, userId, schoolId);
  }

  @Get('unread-count')
  async getUnreadCount(
    @CurrentUser('id') userId: string,
    @Tenant() schoolId: string,
  ) {
    const count = await this.messagesService.getUnreadCount(userId, schoolId);
    return { count };
  }
}
