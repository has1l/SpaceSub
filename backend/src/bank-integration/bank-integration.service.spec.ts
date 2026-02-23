import { Test, TestingModule } from '@nestjs/testing';
import { BankIntegrationService } from './bank-integration.service';
import { PrismaService } from '../prisma/prisma.service';
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
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BankIntegrationService,
        { provide: PrismaService, useValue: prisma },
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
      expect(call.create.expiresAt).toEqual(new Date('2026-12-31T00:00:00.000Z'));
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

  describe('syncStub', () => {
    it('should create sync log and update lastSyncAt', async () => {
      const result = await service.syncStub('user-1');

      expect(result).toEqual({ ok: true, imported: 0, suggestionsCreated: 0 });
      expect(prisma.bankSyncLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            connectionId: 'conn-1',
            status: 'SUCCESS',
            importedCount: 0,
          }),
        }),
      );
      expect(prisma.bankConnection.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'conn-1' },
          data: { lastSyncAt: expect.any(Date) },
        }),
      );
    });

    it('should throw if no connection exists', async () => {
      prisma.bankConnection.findUnique.mockResolvedValue(null);
      await expect(service.syncStub('user-1')).rejects.toThrow(
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
