import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { BankIntegrationService } from '../bank-integration.service';
import { SubscriptionAnalyzerService } from './subscription-analyzer.service';

@Injectable()
export class SyncSchedulerService {
  private readonly logger = new Logger(SyncSchedulerService.name);
  private running = false;

  constructor(
    private prisma: PrismaService,
    private bankIntegrationService: BankIntegrationService,
    private subscriptionAnalyzer: SubscriptionAnalyzerService,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleSyncCron() {
    if (this.running) {
      this.logger.warn('Sync cron: previous run still in progress, skipping');
      return;
    }

    this.running = true;
    const startTime = Date.now();
    this.logger.log('Sync cron: starting scheduled sync for all active connections');

    try {
      const connections = await this.prisma.bankConnection.findMany({
        where: { status: 'CONNECTED' },
        select: { id: true, userId: true, provider: true, lastSyncAt: true },
      });

      if (connections.length === 0) {
        this.logger.log('Sync cron: no active connections found');
        return;
      }

      this.logger.log(`Sync cron: found ${connections.length} active connection(s)`);

      let successCount = 0;
      let failCount = 0;
      const syncedUserIds = new Set<string>();

      for (const conn of connections) {
        try {
          const result = await this.bankIntegrationService.syncFlex(conn.userId);
          successCount++;
          syncedUserIds.add(conn.userId);
          this.logger.log(
            `Sync cron: user=${conn.userId} provider=${conn.provider} ` +
              `imported=${result.imported} accounts=${result.accounts}`,
          );
        } catch (error) {
          failCount++;
          this.logger.error(
            `Sync cron: failed for user=${conn.userId} provider=${conn.provider}: ` +
              `${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      // After sync, run subscription analysis for each successfully synced user
      for (const userId of syncedUserIds) {
        try {
          const detected = await this.subscriptionAnalyzer.analyzeForUser(userId);
          const deactivated =
            await this.subscriptionAnalyzer.markInactiveSubscriptions(userId);
          this.logger.log(
            `Sync cron: analyzer user=${userId} detected=${detected} deactivated=${deactivated}`,
          );
        } catch (error) {
          this.logger.error(
            `Sync cron: analyzer failed for user=${userId}: ` +
              `${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      const elapsed = Date.now() - startTime;
      this.logger.log(
        `Sync cron: completed in ${elapsed}ms — ` +
          `success=${successCount} failed=${failCount} total=${connections.length}`,
      );
    } catch (error) {
      this.logger.error(
        `Sync cron: fatal error — ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    } finally {
      this.running = false;
    }
  }
}
