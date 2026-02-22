import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  @Get()
  @ApiOperation({ summary: 'Get notifications (stub)' })
  getNotifications(@Request() req: { user: { id: string } }) {
    return { message: 'Notifications not yet implemented', userId: req.user.id };
  }
}
