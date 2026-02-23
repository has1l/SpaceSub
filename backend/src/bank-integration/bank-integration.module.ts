import { Module } from '@nestjs/common';
import { BankIntegrationController } from './bank-integration.controller';
import { BankIntegrationService } from './bank-integration.service';

@Module({
  controllers: [BankIntegrationController],
  providers: [BankIntegrationService],
  exports: [BankIntegrationService],
})
export class BankIntegrationModule {}
