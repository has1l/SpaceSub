import { Module } from '@nestjs/common';
import { BankIntegrationController } from './bank-integration.controller';
import { BankIntegrationService } from './bank-integration.service';
import { FlexBankClient } from './clients/flex-bank.client';

@Module({
  controllers: [BankIntegrationController],
  providers: [BankIntegrationService, FlexBankClient],
  exports: [BankIntegrationService],
})
export class BankIntegrationModule {}
