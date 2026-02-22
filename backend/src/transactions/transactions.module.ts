import { Module } from '@nestjs/common';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { TransactionsAnalysisService } from './transactions-analysis.service';

@Module({
  controllers: [TransactionsController],
  providers: [TransactionsService, TransactionsAnalysisService],
  exports: [TransactionsService, TransactionsAnalysisService],
})
export class TransactionsModule {}
