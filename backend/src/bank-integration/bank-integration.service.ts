import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConnectFlexDto } from './dto/connect-flex.dto';
import { BankProvider, Prisma } from '@prisma/client';
import { FlexBankClient } from './clients/flex-bank.client';
import type { FlexBankTransaction } from './types/flex-bank.types';

@Injectable()
export class BankIntegrationService {
  private readonly logger = new Logger(BankIntegrationService.name);

  constructor(
    private prisma: PrismaService,
    private flexBankClient: FlexBankClient,
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
    const token = connection.accessToken;

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
