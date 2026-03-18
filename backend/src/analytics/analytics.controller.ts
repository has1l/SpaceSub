import { Controller, Get, Query, UseGuards, Request, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  /** Legacy endpoint — keep for backward compat */
  @Get()
  @ApiOperation({ summary: 'Get subscription analytics (legacy)' })
  getAnalytics(@Request() req: { user: { id: string } }) {
    return this.analyticsService.getAnalytics(req.user.id);
  }

  @Get('overview')
  @ApiOperation({ summary: 'MRR, ARR, active count, monthly trend' })
  getOverview(@Request() req: { user: { id: string } }) {
    return this.analyticsService.getOverview(req.user.id);
  }

  @Get('by-category')
  @ApiOperation({ summary: 'Spending breakdown by category (for donut chart)' })
  getByCategory(@Request() req: { user: { id: string } }) {
    return this.analyticsService.getByCategory(req.user.id);
  }

  @Get('by-service')
  @ApiOperation({ summary: 'Top services by monthly cost (for bar chart)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max services to return (default 10)' })
  getByService(
    @Request() req: { user: { id: string } },
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.analyticsService.getByService(req.user.id, limit);
  }

  @Get('by-period')
  @ApiOperation({ summary: 'Transaction totals by month/week (for area chart)' })
  @ApiQuery({ name: 'granularity', required: false, enum: ['month', 'week'] })
  getByPeriod(
    @Request() req: { user: { id: string } },
    @Query('granularity') granularity: 'month' | 'week' = 'month',
  ) {
    return this.analyticsService.getByPeriod(req.user.id, granularity);
  }

  @Get('scores')
  @ApiOperation({ summary: 'Value score and churn risk per subscription' })
  getScores(@Request() req: { user: { id: string } }) {
    return this.analyticsService.getScores(req.user.id);
  }

  @Get('recommendations')
  @ApiOperation({ summary: 'Cost optimization recommendations' })
  getRecommendations(@Request() req: { user: { id: string } }) {
    return this.analyticsService.getRecommendations(req.user.id);
  }
}
