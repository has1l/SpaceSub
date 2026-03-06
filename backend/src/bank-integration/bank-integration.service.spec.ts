import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BankIntegrationService } from './bank-integration.service';
import { PrismaService } from '../prisma/prisma.service';
import { FlexBankClient } from './clients/flex-bank.client';
import { TokenEncryptionService } from './services/token-encryption.service';
import { SubscriptionAnalyzerService } from './services/subscription-analyzer.service';
import {
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { createHash } from 'crypto';

// Mock global fetch
const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

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
  let subscriptionAnalyzer: {
    analyzeForUser: jest.Mock;
    markInactiveSubscriptions: jest.Mock;
  };

  const mockConnection = {
    id: 'conn-1',
    userId: 'user-1',
    provider: 'FLEX',
    status: 'CONNECTED',
    accessToken: 'secret-token',
    encryptedAccessToken: null,
    tokenFingerprint: null,
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

    subscriptionAnalyzer = {
      analyzeForUser: jest.fn().mockResolvedValue(0),
      markInactiveSubscriptions: jest.fn().mockResolvedValue(0),
    };

    const mockTokenEncryption = {
      encrypt: jest.fn((v: string) => `encrypted:${v}`),
      decrypt: jest.fn((v: string) => v.replace('encrypted:', '')),
      fingerprint: jest.fn((v: string) => `fp:${v}`),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BankIntegrationService,
        { provide: PrismaService, useValue: prisma },
        { provide: FlexBankClient, useValue: flexClient },
        { provide: TokenEncryptionService, useValue: mockTokenEncryption },
        {
          provide: SubscriptionAnalyzerService,
          useValue: subscriptionAnalyzer,
        },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              if (key === 'FLEX_BANK_BASE_URL') return 'http://localhost:3001';
              return undefined;
            },
          },
        },
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

    it('should call subscriptionAnalyzer.analyzeForUser after successful sync', async () => {
      flexClient.getAccounts.mockResolvedValue(mockAccounts);
      flexClient.getTransactions.mockResolvedValue(mockTransactions);
      prisma.importedTransaction.createMany.mockResolvedValue({ count: 2 });

      await service.syncFlex('user-1');

      expect(subscriptionAnalyzer.analyzeForUser).toHaveBeenCalledTimes(1);
      expect(subscriptionAnalyzer.analyzeForUser).toHaveBeenCalledWith(
        'user-1',
      );
      expect(
        subscriptionAnalyzer.markInactiveSubscriptions,
      ).toHaveBeenCalledTimes(1);
      expect(
        subscriptionAnalyzer.markInactiveSubscriptions,
      ).toHaveBeenCalledWith('user-1');
    });

    it('should not fail sync if analyzer throws', async () => {
      flexClient.getAccounts.mockResolvedValue(mockAccounts);
      flexClient.getTransactions.mockResolvedValue(mockTransactions);
      prisma.importedTransaction.createMany.mockResolvedValue({ count: 2 });
      subscriptionAnalyzer.analyzeForUser.mockRejectedValue(
        new Error('Analyzer DB error'),
      );

      // Sync should still succeed even if analyzer fails
      const result = await service.syncFlex('user-1');
      expect(result.ok).toBe(true);
      expect(result.imported).toBe(2);
    });

    it('should not call analyzer if sync fails (FlexBank API error)', async () => {
      flexClient.getAccounts.mockRejectedValue(new Error('Network error'));

      await expect(service.syncFlex('user-1')).rejects.toThrow(
        'Network error',
      );

      expect(subscriptionAnalyzer.analyzeForUser).not.toHaveBeenCalled();
      expect(
        subscriptionAnalyzer.markInactiveSubscriptions,
      ).not.toHaveBeenCalled();
    });
  });

  describe('connectByCode', () => {
    beforeEach(() => {
      mockFetch.mockReset();
    });

    it('should hash code with SHA-256 and call Flex Bank redeem', async () => {
      const code = 'FB-ABC123';
      const expectedHash = createHash('sha256').update(code).digest('hex');

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ accessToken: 'flex-jwt' }),
      });

      await service.connectByCode('user-1', code);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/connection-code/redeem',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ codeHash: expectedHash }),
        }),
      );
    });

    it('should encrypt received JWT and store in DB', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ accessToken: 'flex-jwt-token' }),
      });

      await service.connectByCode('user-1', 'FB-XYZ789');

      const call = prisma.bankConnection.upsert.mock.calls[0][0] as any;
      expect(call.update.accessToken).toBe('[code-connected]');
      expect(call.update.encryptedAccessToken).toBe('encrypted:flex-jwt-token');
      expect(call.update.tokenFingerprint).toBe('fp:flex-jwt-token');
      expect(call.update.status).toBe('CONNECTED');
    });

    it('should return safe DTO without tokens', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ accessToken: 'flex-jwt' }),
      });

      const result = await service.connectByCode('user-1', 'FB-ABC123');

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('provider');
      expect(result).toHaveProperty('status');
      expect(result).not.toHaveProperty('accessToken');
      expect(result).not.toHaveProperty('encryptedAccessToken');
    });

    it('should throw UnauthorizedException for invalid code', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Invalid connection code' }),
      });

      await expect(
        service.connectByCode('user-1', 'FB-WRONG1'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw ForbiddenException when code is blocked (403)', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({ message: 'Too many attempts. Code is blocked.' }),
      });

      await expect(
        service.connectByCode('user-1', 'FB-BLOCK1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw UnauthorizedException for other errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({}),
      });

      await expect(
        service.connectByCode('user-1', 'FB-BADREQ'),
      ).rejects.toThrow(UnauthorizedException);
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
