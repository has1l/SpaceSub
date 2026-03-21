import { Module } from '@nestjs/common';
import { AnalyticsModule } from '../analytics/analytics.module';
import { AiInsightController } from './ai-insight.controller';
import { AiInsightService } from './ai-insight.service';

@Module({
  imports: [AnalyticsModule],
  controllers: [AiInsightController],
  providers: [AiInsightService],
})
export class AiInsightModule {}
