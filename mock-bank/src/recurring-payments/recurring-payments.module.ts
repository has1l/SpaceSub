import { Module } from '@nestjs/common';
import { RecurringPaymentsService } from './recurring-payments.service';

@Module({
  providers: [RecurringPaymentsService],
  exports: [RecurringPaymentsService],
})
export class RecurringPaymentsModule {}
