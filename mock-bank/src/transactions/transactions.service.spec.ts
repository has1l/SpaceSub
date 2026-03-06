import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsService } from './transactions.service';
import { PrismaService } from '../prisma/prisma.service';

describe('TransactionsService', () => {
  let service: TransactionsService;
  let prisma: {
    transaction: {
      create: jest.Mock;
      findMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      transaction: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
  });

  describe('create', () => {
    it('should create a transaction with negative amount for expense', async () => {
      const tx = { id: '1', accountId: 'a1', amount: -799, description: 'NETFLIX', type: 'EXPENSE' };
      prisma.transaction.create.mockResolvedValue(tx);

      const result = await service.create('a1', {
        date: '2026-01-15T00:00:00.000Z',
        amount: -799,
        description: 'NETFLIX',
      });
      expect(result).toEqual(tx);
      expect(prisma.transaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ amount: -799, type: 'EXPENSE' }),
      });
    });

    it('should auto-convert positive amount to negative for EXPENSE type', async () => {
      prisma.transaction.create.mockResolvedValue({ id: '1' });

      await service.create('a1', {
        date: '2026-01-15T00:00:00.000Z',
        amount: 799,
        description: 'NETFLIX',
        type: 'EXPENSE',
      });
      expect(prisma.transaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ amount: -799 }),
      });
    });

    it('should auto-convert negative amount to positive for INCOME type', async () => {
      prisma.transaction.create.mockResolvedValue({ id: '1' });

      await service.create('a1', {
        date: '2026-01-15T00:00:00.000Z',
        amount: -5000,
        description: 'Salary',
        type: 'INCOME',
      });
      expect(prisma.transaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ amount: 5000, type: 'INCOME' }),
      });
    });

    it('should infer INCOME type for positive amount without explicit type', async () => {
      prisma.transaction.create.mockResolvedValue({ id: '1' });

      await service.create('a1', {
        date: '2026-01-15T00:00:00.000Z',
        amount: 50000,
        description: 'Salary',
      });
      expect(prisma.transaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ amount: 50000, type: 'INCOME' }),
      });
    });

    it('should pass merchant and category', async () => {
      prisma.transaction.create.mockResolvedValue({ id: '1' });

      await service.create('a1', {
        date: '2026-01-15T00:00:00.000Z',
        amount: -799,
        description: 'NETFLIX.COM',
        merchant: 'Netflix',
        category: 'SUBSCRIPTIONS',
      });
      expect(prisma.transaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          merchant: 'Netflix',
          category: 'SUBSCRIPTIONS',
        }),
      });
    });
  });

  describe('findByAccount', () => {
    it('should find transactions without date filter', async () => {
      prisma.transaction.findMany.mockResolvedValue([]);
      await service.findByAccount('a1');
      expect(prisma.transaction.findMany).toHaveBeenCalledWith({
        where: { accountId: 'a1' },
        orderBy: { date: 'desc' },
      });
    });

    it('should apply date filters', async () => {
      prisma.transaction.findMany.mockResolvedValue([]);
      await service.findByAccount('a1', '2025-01-01', '2025-12-31');
      expect(prisma.transaction.findMany).toHaveBeenCalledWith({
        where: {
          accountId: 'a1',
          date: { gte: new Date('2025-01-01'), lte: new Date('2025-12-31') },
        },
        orderBy: { date: 'desc' },
      });
    });
  });

  describe('findAllByUser', () => {
    it('should find all transactions with account info', async () => {
      prisma.transaction.findMany.mockResolvedValue([]);
      await service.findAllByUser('u1');
      expect(prisma.transaction.findMany).toHaveBeenCalledWith({
        where: { account: { userId: 'u1' } },
        orderBy: { date: 'desc' },
        include: { account: { select: { id: true, name: true } } },
      });
    });
  });
});
