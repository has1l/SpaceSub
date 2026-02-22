import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  @Get()
  @ApiOperation({ summary: 'Get analytics (stub)' })
  getAnalytics(@Request() req: { user: { id: string } }) {
    return { message: 'Analytics not yet implemented', userId: req.user.id };
  }
}
