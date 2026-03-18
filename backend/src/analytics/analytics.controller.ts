import {
  Controller, Get, Query, UseGuards, Request,
  ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';

function parseDate(s: string | undefined): Date | undefined {
  if (!s) return undefined;
  const d = new Date(s);
  return isNaN(d.getTime()) ? undefined : d;
}

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get()
  @ApiOperation({ summary: 'Get subscription analytics (legacy)' })
  getAnalytics(@Request() req: { user: { id: string } }) {
    return this.analyticsService.getAnalytics(req.user.id);
  }

  @Get('overview')
  @ApiOperation({ summary: 'MRR, ARR, period total, trend' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  getOverview(
    @Request() req: { user: { id: string } },
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.analyticsService.getOverview(req.user.id, parseDate(from), parseDate(to));
  }

  @Get('by-category')
  @ApiOperation({ summary: 'Spending by category — donut chart data' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  getByCategory(
    @Request() req: { user: { id: string } },
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.analyticsService.getByCategory(req.user.id, parseDate(from), parseDate(to));
  }

  @Get('by-service')
  @ApiOperation({ summary: 'Top services by cost — bar chart data' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  getByService(
    @Request() req: { user: { id: string } },
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.analyticsService.getByService(req.user.id, limit, parseDate(from), parseDate(to));
  }

  @Get('by-period')
  @ApiOperation({ summary: 'Transaction totals over time — area chart data' })
  @ApiQuery({ name: 'granularity', required: false, enum: ['month', 'week'] })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  getByPeriod(
    @Request() req: { user: { id: string } },
    @Query('granularity') granularity: 'month' | 'week' = 'month',
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.analyticsService.getByPeriod(req.user.id, granularity, parseDate(from), parseDate(to));
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
