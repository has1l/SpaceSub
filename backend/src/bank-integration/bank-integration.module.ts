import { Module } from '@nestjs/common';
import { BankIntegrationController } from './bank-integration.controller';
import { BankIntegrationService } from './bank-integration.service';
import { FlexBankClient } from './clients/flex-bank.client';
import { BankOAuthService } from './services/bank-oauth.service';
import { BankOAuthStateStore } from './bank-oauth-state.store';
import { TokenEncryptionService } from './services/token-encryption.service';
import { SyncSchedulerService } from './services/sync-scheduler.service';
import { SubscriptionAnalyzerService } from './services/subscription-analyzer.service';

@Module({
  controllers: [BankIntegrationController],
  providers: [
    BankIntegrationService,
    FlexBankClient,
    BankOAuthService,
    BankOAuthStateStore,
    TokenEncryptionService,
    SyncSchedulerService,
    SubscriptionAnalyzerService,
  ],
  exports: [BankIntegrationService, SubscriptionAnalyzerService],
})
export class BankIntegrationModule {}
