import { Test, TestingModule } from '@nestjs/testing';
import { AccountsService } from './accounts.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('AccountsService', () => {
  let service: AccountsService;
  let prisma: {
    account: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      account: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AccountsService>(AccountsService);
  });

  describe('create', () => {
    it('should create an account with defaults', async () => {
      const created = { id: '1', userId: 'u1', name: 'Test', currency: 'RUB', initialBalance: 0 };
      prisma.account.create.mockResolvedValue(created);

      const result = await service.create('u1', { name: 'Test' });
      expect(result).toEqual(created);
      expect(prisma.account.create).toHaveBeenCalledWith({
        data: { userId: 'u1', name: 'Test', currency: 'RUB', initialBalance: 0 },
      });
    });

    it('should use provided initialBalance', async () => {
      const created = { id: '1', userId: 'u1', name: 'Test', currency: 'USD', initialBalance: 5000 };
      prisma.account.create.mockResolvedValue(created);

      await service.create('u1', { name: 'Test', currency: 'USD', initialBalance: 5000 });
      expect(prisma.account.create).toHaveBeenCalledWith({
        data: { userId: 'u1', name: 'Test', currency: 'USD', initialBalance: 5000 },
      });
    });
  });

  describe('findAllByUser', () => {
    it('should return accounts with computed balance', async () => {
      prisma.account.findMany.mockResolvedValue([
        {
          id: '1',
          userId: 'u1',
          name: 'Main',
          currency: 'RUB',
          initialBalance: 50000,
          createdAt: new Date(),
          transactions: [
            { amount: -1000 },
            { amount: -500 },
            { amount: 3000 },
          ],
        },
      ]);

      const result = await service.findAllByUser('u1');
      expect(result).toHaveLength(1);
      expect(result[0].balance).toBe(51500); // 50000 + (-1000 + -500 + 3000)
      expect(result[0].initialBalance).toBe(50000);
    });

    it('should return empty balance for no transactions', async () => {
      prisma.account.findMany.mockResolvedValue([
        {
          id: '1',
          userId: 'u1',
          name: 'Empty',
          currency: 'RUB',
          initialBalance: 1000,
          createdAt: new Date(),
          transactions: [],
        },
      ]);

      const result = await service.findAllByUser('u1');
      expect(result[0].balance).toBe(1000);
    });
  });

  describe('findOneOwned', () => {
    it('should return account with computed balance if owned', async () => {
      prisma.account.findUnique.mockResolvedValue({
        id: '1',
        userId: 'u1',
        initialBalance: 10000,
        transactions: [{ amount: -500 }],
      });

      const result = await service.findOneOwned('1', 'u1');
      expect(result.balance).toBe(9500);
    });

    it('should throw NotFoundException if not found', async () => {
      prisma.account.findUnique.mockResolvedValue(null);
      await expect(service.findOneOwned('1', 'u1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if not owned', async () => {
      prisma.account.findUnique.mockResolvedValue({
        id: '1',
        userId: 'other',
        initialBalance: 0,
        transactions: [],
      });
      await expect(service.findOneOwned('1', 'u1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getAccountSummary', () => {
    it('should compute income, expense and category breakdown', async () => {
      prisma.account.findUnique.mockResolvedValue({
        id: '1',
        userId: 'u1',
        name: 'Main',
        currency: 'RUB',
        initialBalance: 100000,
        transactions: [
          { amount: -799, category: 'SUBSCRIPTIONS' },
          { amount: -5000, category: 'SUPERMARKETS' },
          { amount: -799, category: 'SUBSCRIPTIONS' },
          { amount: 50000, category: 'OTHER' },
        ],
      });

      const result = await service.getAccountSummary('1', 'u1');
      expect(result.totalIncome).toBe(50000);
      expect(result.totalExpense).toBe(6598);
      expect(result.transactionCount).toBe(4);
      expect(result.balance).toBe(143402); // 100000 + (-799 -5000 -799 +50000)
      expect(result.expenseByCategory).toEqual({
        SUBSCRIPTIONS: 1598,
        SUPERMARKETS: 5000,
      });
    });

    it('should throw NotFoundException for missing account', async () => {
      prisma.account.findUnique.mockResolvedValue(null);
      await expect(service.getAccountSummary('1', 'u1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for unowned account', async () => {
      prisma.account.findUnique.mockResolvedValue({
        id: '1',
        userId: 'other',
        name: 'X',
        currency: 'RUB',
        initialBalance: 0,
        transactions: [],
      });
      await expect(service.getAccountSummary('1', 'u1')).rejects.toThrow(ForbiddenException);
    });
  });
});
