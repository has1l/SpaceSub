import { Module } from '@nestjs/common';
import { ApiV1Controller } from './api-v1.controller';
import { AccountsModule } from '../accounts/accounts.module';
import { TransactionsModule } from '../transactions/transactions.module';

@Module({
  imports: [AccountsModule, TransactionsModule],
  controllers: [ApiV1Controller],
})
export class ApiV1Module {}
