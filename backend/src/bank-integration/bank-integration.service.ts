import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConnectFlexDto } from './dto/connect-flex.dto';
import { BankProvider } from '@prisma/client';

@Injectable()
export class BankIntegrationService {
  constructor(private prisma: PrismaService) {}

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

  async syncStub(userId: string) {
    const connection = await this.getConnection(userId, BankProvider.FLEX);

    const now = new Date();

    await this.prisma.bankSyncLog.create({
      data: {
        connectionId: connection.id,
        status: 'SUCCESS',
        importedCount: 0,
      },
    });

    await this.prisma.bankConnection.update({
      where: { id: connection.id },
      data: { lastSyncAt: now },
    });

    return { ok: true, imported: 0, suggestionsCreated: 0 };
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
