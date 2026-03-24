import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { ConnectFlexDto } from './dto/connect-flex.dto';
import { BankProvider, Prisma } from '@prisma/client';
import { FlexBankClient } from './clients/flex-bank.client';
import { TokenEncryptionService } from './services/token-encryption.service';
import { SubscriptionAnalyzerService } from './services/subscription-analyzer.service';
import type { FlexBankTransaction } from './types/flex-bank.types';
import { createHash } from 'crypto';

@Injectable()
export class BankIntegrationService {
  private readonly logger = new Logger(BankIntegrationService.name);

  constructor(
    private prisma: PrismaService,
    private flexBankClient: FlexBankClient,
    private tokenEncryption: TokenEncryptionService,
    private configService: ConfigService,
    private subscriptionAnalyzer: SubscriptionAnalyzerService,
  ) {}

  async upsertConnection(userId: string, dto: ConnectFlexDto) {
    return this.prisma.bankConnection.upsert({
      where: {
        userId_provider: { userId, provider: BankProvider.FLEX },
      },
      update: {
        accessToken: dto.accessToken,
        refreshToken: dto.refreshToken || null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        status: 'CONNECTED',
      },
      create: {
        userId,
        provider: BankProvider.FLEX,
        accessToken: dto.accessToken,
        refreshToken: dto.refreshToken || null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        status: 'CONNECTED',
      },
    });
  }

  async listConnections(userId: string) {
    const connections = await this.prisma.bankConnection.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return connections.map((c) => ({
      id: c.id,
      provider: c.provider,
      status: c.status,
      lastSyncAt: c.lastSyncAt,
      expiresAt: c.expiresAt,
      createdAt: c.createdAt,
    }));
  }

  async getConnection(userId: string, provider: BankProvider) {
    const connection = await this.prisma.bankConnection.findUnique({
      where: { userId_provider: { userId, provider } },
    });
    if (!connection) {
      throw new NotFoundException(
        `No ${provider} connection found. Connect first.`,
      );
    }
    return connection;
  }

  async syncFlex(userId: string) {
    const connection = await this.getConnection(userId, BankProvider.FLEX);

    // Prefer encrypted token, fall back to plaintext for backward compatibility
    let token: string;
    if (connection.encryptedAccessToken) {
      token = this.tokenEncryption.decrypt(connection.encryptedAccessToken);
    } else {
      token = connection.accessToken;
    }

    try {
      // 1. Fetch accounts from Flex Bank
      const accounts = await this.flexBankClient.getAccounts(token);
      this.logger.log(
        `Flex sync: fetched ${accounts.length} accounts for user ${userId}`,
      );

      // 2. Fetch transactions per account (last 180 days)
      const now = new Date();
      const from = new Date(now);
      from.setDate(from.getDate() - 180);
      const fromStr = from.toISOString().slice(0, 10);
      const toStr = now.toISOString().slice(0, 10);

      let totalImported = 0;

      for (const account of accounts) {
        const transactions = await this.flexBankClient.getTransactions(
          token,
          account.id,
          fromStr,
          toStr,
        );

        if (transactions.length === 0) continue;

        // 3. Upsert into ImportedTransaction (skipDuplicates by connectionId+externalId)
        const data = transactions.map((t: FlexBankTransaction) => ({
          userId,
          connectionId: connection.id,
          provider: BankProvider.FLEX,
          externalId: t.externalId,
          occurredAt: new Date(t.postedAt),
          amount: t.amount,
          currency: t.currency,
          description: t.description,
          merchant: t.merchant,
          accountExternalId: t.accountExternalId,
          raw: t as unknown as Prisma.InputJsonValue,
        }));

        const result = await this.prisma.importedTransaction.createMany({
          data,
          skipDuplicates: true,
        });

        totalImported += result.count;
      }

      // 4. Write sync log + update lastSyncAt
      await this.prisma.bankSyncLog.create({
        data: {
          connectionId: connection.id,
          status: 'SUCCESS',
          importedCount: totalImported,
        },
      });

      await this.prisma.bankConnection.update({
        where: { id: connection.id },
        data: { lastSyncAt: now },
      });

      this.logger.log(
        `Flex sync complete: ${totalImported} new transactions from ${accounts.length} accounts`,
      );

      // 5. Run subscription analysis after successful import
      this.logger.log(`Analyzing subscriptions for user: ${userId}`);
      try {
        const detected =
          await this.subscriptionAnalyzer.analyzeForUser(userId);
        const deactivated =
          await this.subscriptionAnalyzer.markInactiveSubscriptions(userId);
        this.logger.log(
          `Subscription analysis complete: detected=${detected} deactivated=${deactivated} for user=${userId}`,
        );
      } catch (analyzerError) {
        this.logger.error(
          `Subscription analysis failed for user=${userId}: ${analyzerError instanceof Error ? analyzerError.message : 'Unknown error'}`,
        );
        // Don't fail the sync if analyzer fails — transactions are already saved
      }

      // 6. Import bank recurring payments as confidence=1.0
      try {
        const recurringPayments =
          await this.flexBankClient.getRecurringPayments(token);
        const normalize = (s: string) =>
          s.toLowerCase().replace(/[^a-zа-яё0-9]/gi, '');

        let bankImported = 0;
        let bankDeactivated = 0;

        for (const rp of recurringPayments.filter(
          (r) => r.status === 'ACTIVE',
        )) {
          const normalizedMerchant = normalize(rp.merchant);
          const absAmount = Math.abs(rp.amount);
          const periodType =
            rp.periodDays <= 8
              ? 'WEEKLY'
              : rp.periodDays <= 35
                ? 'MONTHLY'
                : rp.periodDays <= 100
                  ? 'QUARTERLY'
                  : 'YEARLY';

          await this.prisma.detectedSubscription.upsert({
            where: {
              userId_normalizedMerchant_amount_currency: {
                userId,
                normalizedMerchant,
                amount: absAmount,
                currency: rp.currency,
              },
            },
            update: {
              confidence: 1.0,
              isActive: true,
              nextExpectedCharge: new Date(rp.nextChargeDate),
              merchant: rp.merchant,
            },
            create: {
              userId,
              merchant: rp.merchant,
              normalizedMerchant,
              amount: absAmount,
              currency: rp.currency,
              periodType,
              lastChargeDate: new Date(),
              nextExpectedCharge: new Date(rp.nextChargeDate),
              confidence: 1.0,
              transactionCount: 0,
              isActive: true,
            },
          });
          bankImported++;
        }

        // Deactivate cancelled bank subscriptions
        for (const rp of recurringPayments.filter(
          (r) => r.status === 'CANCELLED',
        )) {
          const result = await this.prisma.detectedSubscription.updateMany({
            where: {
              userId,
              normalizedMerchant: normalize(rp.merchant),
              isActive: true,
              confidence: 1.0,
            },
            data: { isActive: false },
          });
          bankDeactivated += result.count;
        }

        this.logger.log(
          `Bank subscriptions: imported=${bankImported} deactivated=${bankDeactivated} for user=${userId}`,
        );
      } catch (bankSubError) {
        this.logger.error(
          `Bank subscription import failed for user=${userId}: ${bankSubError instanceof Error ? bankSubError.message : 'Unknown error'}`,
        );
      }

      return {
        ok: true,
        provider: 'FLEX',
        imported: totalImported,
        accounts: accounts.length,
      };
    } catch (error) {
      // Write FAILED sync log
      await this.prisma.bankSyncLog.create({
        data: {
          connectionId: connection.id,
          status: 'FAILED',
          importedCount: 0,
          errorMessage:
            error instanceof Error ? error.message : 'Unknown error',
        },
      });

      // If it's an auth error from Flex Bank, mark connection as expired
      if (
        error instanceof Error &&
        'response' in error &&
        (error as any).response?.status === 401
      ) {
        await this.prisma.bankConnection.update({
          where: { id: connection.id },
          data: { status: 'EXPIRED' },
        });
      }

      throw error;
    }
  }

  async connectByCode(userId: string, code: string) {
    const codeHash = createHash('sha256').update(code).digest('hex');

    // Call Flex Bank's redeem endpoint (server-to-server)
    const baseUrl =
      this.configService.get('FLEX_BANK_BASE_URL') || 'http://localhost:3001';

    const response = await fetch(`${baseUrl}/connection-code/redeem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codeHash }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const msg = (body as any)?.message || 'Invalid connection code';
      this.logger.warn(`Code redeem failed: ${response.status} — ${msg}`);

      if (response.status === 403) {
        throw new ForbiddenException(msg);
      }
      throw new UnauthorizedException(msg);
    }

    const { accessToken: flexJwt } = (await response.json()) as {
      accessToken: string;
    };

    // Encrypt the Flex Bank JWT with SpaceSub's key
    const encrypted = this.tokenEncryption.encrypt(flexJwt);
    const fingerprint = this.tokenEncryption.fingerprint(flexJwt);

    const connection = await this.prisma.bankConnection.upsert({
      where: {
        userId_provider: { userId, provider: BankProvider.FLEX },
      },
      update: {
        accessToken: '[code-connected]',
        encryptedAccessToken: encrypted,
        tokenFingerprint: fingerprint,
        status: 'CONNECTED',
      },
      create: {
        userId,
        provider: BankProvider.FLEX,
        accessToken: '[code-connected]',
        encryptedAccessToken: encrypted,
        tokenFingerprint: fingerprint,
        status: 'CONNECTED',
      },
    });

    this.logger.log(`Flex Bank connected via code for user ${userId}`);
    return this.toSafeDto(connection);
  }

  async cancelBankRecurringPayment(
    userId: string,
    merchant: string,
    amount: number,
  ): Promise<string | null> {
    const connection = await this.prisma.bankConnection.findUnique({
      where: {
        userId_provider: { userId, provider: BankProvider.FLEX },
      },
    });

    if (!connection || connection.status !== 'CONNECTED') return null;

    let token: string;
    if (connection.encryptedAccessToken) {
      token = this.tokenEncryption.decrypt(connection.encryptedAccessToken);
    } else {
      token = connection.accessToken;
    }

    try {
      const payments =
        await this.flexBankClient.getRecurringPayments(token);

      // Normalize for matching
      const normalize = (s: string) =>
        s.toLowerCase().replace(/[^a-zа-яё0-9]/gi, '');
      const normalizedMerchant = normalize(merchant);
      const absAmount = Math.abs(amount);

      // Find matching recurring payment
      const match = payments
        .filter((rp) => rp.status === 'ACTIVE')
        .filter((rp) => normalize(rp.merchant) === normalizedMerchant)
        .filter((rp) => {
          const rpAbs = Math.abs(rp.amount);
          return Math.abs(rpAbs - absAmount) / absAmount <= 0.03;
        })
        .sort((a, b) => {
          // Tie-break: closest amount
          const diffA = Math.abs(Math.abs(a.amount) - absAmount);
          const diffB = Math.abs(Math.abs(b.amount) - absAmount);
          return diffA - diffB;
        })[0];

      if (!match) {
        this.logger.warn(
          `No matching recurring payment found for merchant="${merchant}" amount=${amount}`,
        );
        return null;
      }

      const result = await this.flexBankClient.cancelRecurringPayment(
        token,
        match.id,
      );
      this.logger.log(
        `Cancelled recurring payment ${result.id} for merchant="${merchant}"`,
      );
      return result.id;
    } catch (error) {
      this.logger.error(
        `Failed to cancel recurring payment: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return null;
    }
  }

  toSafeDto(connection: {
    id: string;
    provider: BankProvider;
    status: string;
    lastSyncAt: Date | null;
    expiresAt: Date | null;
    createdAt: Date;
  }) {
    return {
      id: connection.id,
      provider: connection.provider,
      status: connection.status,
      lastSyncAt: connection.lastSyncAt,
      expiresAt: connection.expiresAt,
      createdAt: connection.createdAt,
    };
  }
}
