import { Module } from '@nestjs/common';
import { BankIntegrationController } from './bank-integration.controller';
import { BankIntegrationService } from './bank-integration.service';
import { FlexBankClient } from './clients/flex-bank.client';
import { BankOAuthService } from './services/bank-oauth.service';
import { BankOAuthStateStore } from './bank-oauth-state.store';
import { TokenEncryptionService } from './services/token-encryption.service';

@Module({
  controllers: [BankIntegrationController],
  providers: [
    BankIntegrationService,
    FlexBankClient,
    BankOAuthService,
    BankOAuthStateStore,
    TokenEncryptionService,
  ],
  exports: [BankIntegrationService],
})
export class BankIntegrationModule {}
