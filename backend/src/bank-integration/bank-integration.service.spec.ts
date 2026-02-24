import { Test, TestingModule } from '@nestjs/testing';
import { BankIntegrationService } from './bank-integration.service';
import { PrismaService } from '../prisma/prisma.service';
import { FlexBankClient } from './clients/flex-bank.client';
import { NotFoundException } from '@nestjs/common';

describe('BankIntegrationService', () => {
  let service: BankIntegrationService;
  let prisma: {
    bankConnection: {
      upsert: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    bankSyncLog: { create: jest.Mock };
    importedTransaction: { createMany: jest.Mock };
  };
  let flexClient: {
    getAccounts: jest.Mock;
    getTransactions: jest.Mock;
  };

  const mockConnection = {
    id: 'conn-1',
    userId: 'user-1',
    provider: 'FLEX',
    status: 'CONNECTED',
    accessToken: 'secret-token',
    refreshToken: 'secret-refresh',
    expiresAt: null,
    lastSyncAt: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(async () => {
    prisma = {
      bankConnection: {
        upsert: jest.fn().mockResolvedValue(mockConnection),
        findMany: jest.fn().mockResolvedValue([mockConnection]),
        findUnique: jest.fn().mockResolvedValue(mockConnection),
        update: jest.fn().mockResolvedValue(mockConnection),
      },
      bankSyncLog: {
        create: jest.fn().mockResolvedValue({ id: 'log-1' }),
      },
      importedTransaction: {
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };

    flexClient = {
      getAccounts: jest.fn().mockResolvedValue([]),
      getTransactions: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BankIntegrationService,
        { provide: PrismaService, useValue: prisma },
        { provide: FlexBankClient, useValue: flexClient },
      ],
    }).compile();

    service = module.get<BankIntegrationService>(BankIntegrationService);
  });

  describe('upsertConnection', () => {
    it('should create or update a connection', async () => {
      const result = await service.upsertConnection('user-1', {
        accessToken: 'new-token',
      });

      expect(result).toEqual(mockConnection);
      expect(prisma.bankConnection.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId_provider: { userId: 'user-1', provider: 'FLEX' },
          },
        }),
      );
    });

    it('should pass refreshToken and expiresAt when provided', async () => {
      await service.upsertConnection('user-1', {
        accessToken: 'tok',
        refreshToken: 'ref',
        expiresAt: '2026-12-31T00:00:00.000Z',
      });

      const call = prisma.bankConnection.upsert.mock.calls[0][0];
      expect(call.create.refreshToken).toBe('ref');
      expect(call.create.expiresAt).toEqual(
        new Date('2026-12-31T00:00:00.000Z'),
      );
    });
  });

  describe('listConnections', () => {
    it('should return connections without tokens', async () => {
      const result = await service.listConnections('user-1');

      expect(result).toHaveLength(1);
      expect(result[0]).not.toHaveProperty('accessToken');
      expect(result[0]).not.toHaveProperty('refreshToken');
      expect(result[0]).toHaveProperty('id', 'conn-1');
      expect(result[0]).toHaveProperty('provider', 'FLEX');
      expect(result[0]).toHaveProperty('status', 'CONNECTED');
    });
  });

  describe('getConnection', () => {
    it('should return connection when found', async () => {
      const result = await service.getConnection('user-1', 'FLEX' as any);
      expect(result).toEqual(mockConnection);
    });

    it('should throw NotFoundException when not found', async () => {
      prisma.bankConnection.findUnique.mockResolvedValue(null);
      await expect(
        service.getConnection('user-1', 'FLEX' as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('syncFlex', () => {
    const mockAccounts = [
      {
        id: 'acc-1',
        externalId: 'acc-1',
        name: 'Main',
        currency: 'RUB',
        balance: 50000,
      },
    ];

    const mockTransactions = [
      {
        id: 'tx-1',
        externalId: 'tx-1',
        accountExternalId: 'acc-1',
        postedAt: '2026-02-01T00:00:00.000Z',
        amount: -799,
        currency: 'RUB',
        description: 'NETFLIX.COM',
        type: 'DEBIT',
        merchant: null,
        mcc: null,
      },
      {
        id: 'tx-2',
        externalId: 'tx-2',
        accountExternalId: 'acc-1',
        postedAt: '2026-02-15T00:00:00.000Z',
        amount: -199,
        currency: 'RUB',
        description: 'SPOTIFY',
        type: 'DEBIT',
        merchant: null,
        mcc: null,
      },
    ];

    it('should fetch accounts and transactions, import them', async () => {
      flexClient.getAccounts.mockResolvedValue(mockAccounts);
      flexClient.getTransactions.mockResolvedValue(mockTransactions);
      prisma.importedTransaction.createMany.mockResolvedValue({ count: 2 });

      const result = await service.syncFlex('user-1');

      expect(result).toEqual({
        ok: true,
        provider: 'FLEX',
        imported: 2,
        accounts: 1,
      });

      // Verify FlexBankClient calls
      expect(flexClient.getAccounts).toHaveBeenCalledWith('secret-token');
      expect(flexClient.getTransactions).toHaveBeenCalledWith(
        'secret-token',
        'acc-1',
        expect.any(String),
        expect.any(String),
      );

      // Verify createMany was called with skipDuplicates
      expect(prisma.importedTransaction.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            externalId: 'tx-1',
            description: 'NETFLIX.COM',
            provider: 'FLEX',
          }),
        ]),
        skipDuplicates: true,
      });

      // Verify sync log written
      expect(prisma.bankSyncLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          connectionId: 'conn-1',
          status: 'SUCCESS',
          importedCount: 2,
        }),
      });

      // Verify lastSyncAt updated
      expect(prisma.bankConnection.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'conn-1' },
          data: { lastSyncAt: expect.any(Date) },
        }),
      );
    });

    it('should return imported:0 when no accounts', async () => {
      flexClient.getAccounts.mockResolvedValue([]);

      const result = await service.syncFlex('user-1');

      expect(result).toEqual({
        ok: true,
        provider: 'FLEX',
        imported: 0,
        accounts: 0,
      });
      expect(flexClient.getTransactions).not.toHaveBeenCalled();
    });

    it('should handle duplicate transactions with skipDuplicates (count=0)', async () => {
      flexClient.getAccounts.mockResolvedValue(mockAccounts);
      flexClient.getTransactions.mockResolvedValue(mockTransactions);
      // Simulate all duplicates — createMany returns count: 0
      prisma.importedTransaction.createMany.mockResolvedValue({ count: 0 });

      const result = await service.syncFlex('user-1');

      expect(result.imported).toBe(0);
      expect(prisma.bankSyncLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ importedCount: 0 }),
      });
    });

    it('should write FAILED log if FlexBank API throws', async () => {
      flexClient.getAccounts.mockRejectedValue(new Error('Network error'));

      await expect(service.syncFlex('user-1')).rejects.toThrow(
        'Network error',
      );

      expect(prisma.bankSyncLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          connectionId: 'conn-1',
          status: 'FAILED',
          errorMessage: 'Network error',
        }),
      });
    });

    it('should throw if no connection exists', async () => {
      prisma.bankConnection.findUnique.mockResolvedValue(null);
      await expect(service.syncFlex('user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('toSafeDto', () => {
    it('should strip sensitive fields', () => {
      const safe = service.toSafeDto(mockConnection);
      expect(safe).not.toHaveProperty('accessToken');
      expect(safe).not.toHaveProperty('refreshToken');
      expect(safe).toHaveProperty('id');
      expect(safe).toHaveProperty('provider');
      expect(safe).toHaveProperty('status');
    });
  });
});
