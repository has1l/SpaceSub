import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import { NotificationType } from '@prisma/client';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all notifications' })
  getNotifications(@Request() req: { user: { id: string } }) {
    return this.notificationsService.findAll(req.user.id);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  async getUnreadCount(@Request() req: { user: { id: string } }) {
    const count = await this.notificationsService.findUnreadCount(req.user.id);
    return { count };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  markAsRead(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    return this.notificationsService.markAsRead(req.user.id, id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@Request() req: { user: { id: string } }) {
    await this.notificationsService.markAllAsRead(req.user.id);
    return { success: true };
  }

  @Post('test')
  @ApiOperation({ summary: 'Create a test notification' })
  async createTest(@Request() req: { user: { id: string } }) {
    return this.notificationsService.create({
      userId: req.user.id,
      type: NotificationType.BILLING_REMINDER,
      title: 'Тестовое уведомление',
      message: 'Это тестовое уведомление для проверки системы',
    });
  }

  @Get('settings')
  @ApiOperation({ summary: 'Get notification settings' })
  getSettings(@Request() req: { user: { id: string } }) {
    return this.notificationsService.getSettings(req.user.id);
  }

  @Put('settings')
  @ApiOperation({ summary: 'Update notification settings' })
  updateSettings(
    @Request() req: { user: { id: string } },
    @Body() dto: { emailNotifications?: boolean; pushNotifications?: boolean; daysBefore?: number },
  ) {
    return this.notificationsService.updateSettings(req.user.id, dto);
  }
}
