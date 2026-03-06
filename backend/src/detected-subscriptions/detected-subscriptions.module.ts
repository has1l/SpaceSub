import { Module } from '@nestjs/common';
import { DetectedSubscriptionsController } from './detected-subscriptions.controller';
import { DetectedSubscriptionsService } from './detected-subscriptions.service';

@Module({
  controllers: [DetectedSubscriptionsController],
  providers: [DetectedSubscriptionsService],
  exports: [DetectedSubscriptionsService],
})
export class DetectedSubscriptionsModule {}
