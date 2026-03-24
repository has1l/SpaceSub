import { Module } from '@nestjs/common';
import { ApiV1Controller } from './api-v1.controller';
import { AccountsModule } from '../accounts/accounts.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { RecurringPaymentsModule } from '../recurring-payments/recurring-payments.module';
import { ServiceCatalogModule } from '../service-catalog/service-catalog.module';
import { UserSubscriptionsModule } from '../user-subscriptions/user-subscriptions.module';

@Module({
  imports: [
    AccountsModule,
    TransactionsModule,
    RecurringPaymentsModule,
    ServiceCatalogModule,
    UserSubscriptionsModule,
  ],
  controllers: [ApiV1Controller],
})
export class ApiV1Module {}
