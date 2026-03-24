import { Module } from '@nestjs/common';
import { UserSubscriptionsService } from './user-subscriptions.service';

@Module({
  providers: [UserSubscriptionsService],
  exports: [UserSubscriptionsService],
})
export class UserSubscriptionsModule {}
