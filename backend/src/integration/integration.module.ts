import { Module } from '@nestjs/common';
import { IntegrationController } from './integration.controller';
import { BankIntegrationModule } from '../bank-integration/bank-integration.module';

@Module({
  imports: [BankIntegrationModule],
  controllers: [IntegrationController],
})
export class IntegrationModule {}
