import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DetectedSubscriptionsService } from './detected-subscriptions.service';

@ApiTags('Detected Subscriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('detected-subscriptions')
export class DetectedSubscriptionsController {
  constructor(private service: DetectedSubscriptionsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all detected subscriptions' })
  findAll(@Request() req: { user: { id: string } }) {
    return this.service.findAll(req.user.id);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get active detected subscriptions only' })
  findActive(@Request() req: { user: { id: string } }) {
    return this.service.findActive(req.user.id);
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'Get subscriptions due in next 7 days' })
  findUpcoming(@Request() req: { user: { id: string } }) {
    return this.service.findUpcoming(req.user.id);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get subscription summary (totals, counts, upcoming)' })
  getSummary(@Request() req: { user: { id: string } }) {
    return this.service.getSummary(req.user.id);
  }
}
