import { Module } from '@nestjs/common';
import { DetectedSubscriptionsController } from './detected-subscriptions.controller';
import { DetectedSubscriptionsService } from './detected-subscriptions.service';
import { BankIntegrationModule } from '../bank-integration/bank-integration.module';

@Module({
  imports: [BankIntegrationModule],
  controllers: [DetectedSubscriptionsController],
  providers: [DetectedSubscriptionsService],
  exports: [DetectedSubscriptionsService],
})
export class DetectedSubscriptionsModule {}
