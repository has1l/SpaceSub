import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiInsightService } from './ai-insight.service';

function parseDate(s: string | undefined): Date | undefined {
  if (!s) return undefined;
  const d = new Date(s);
  return isNaN(d.getTime()) ? undefined : d;
}

@ApiTags('AI Insight')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AiInsightController {
  constructor(private readonly aiInsight: AiInsightService) {}

  @Get('ai-insight')
  @ApiOperation({ summary: 'AI-powered spending analysis' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  getInsight(
    @Request() req: { user: { id: string } },
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.aiInsight.getInsight(
      req.user.id,
      parseDate(from),
      parseDate(to),
    );
  }
}
