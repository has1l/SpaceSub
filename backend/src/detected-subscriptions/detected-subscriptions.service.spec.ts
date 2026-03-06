import { Test, TestingModule } from '@nestjs/testing';
import { DetectedSubscriptionsService } from './detected-subscriptions.service';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

function makeSub(overrides: Partial<{
  id: string;
  merchant: string;
  normalizedMerchant: string;
  amount: number;
  currency: string;
  periodType: string;
  lastChargeDate: Date;
  nextExpectedCharge: Date;
  isActive: boolean;
  confidence: number;
  transactionCount: number;
}> = {}) {
  return {
    id: overrides.id ?? 'sub-1',
    userId: 'user-1',
    merchant: overrides.merchant ?? 'Netflix',
    normalizedMerchant: overrides.normalizedMerchant ?? 'netflix',
    amount: new Prisma.Decimal(overrides.amount ?? 799),
    currency: overrides.currency ?? 'RUB',
    periodType: overrides.periodType ?? 'MONTHLY',
    lastChargeDate: overrides.lastChargeDate ?? new Date('2026-02-01'),
    nextExpectedCharge: overrides.nextExpectedCharge ?? new Date('2026-03-01'),
    isActive: overrides.isActive ?? true,
    confidence: overrides.confidence ?? 0.92,
    transactionCount: overrides.transactionCount ?? 5,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('DetectedSubscriptionsService', () => {
  let service: DetectedSubscriptionsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      detectedSubscription: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DetectedSubscriptionsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(DetectedSubscriptionsService);
  });

  // ──────────────────────────────────────────
  // findAll
  // ──────────────────────────────────────────

  describe('findAll', () => {
    it('should return all subscriptions sorted by nextExpectedCharge', async () => {
      const subs = [
        makeSub({ id: 's1', merchant: 'Spotify', nextExpectedCharge: new Date('2026-03-10') }),
        makeSub({ id: 's2', merchant: 'Netflix', nextExpectedCharge: new Date('2026-03-01') }),
      ];
      prisma.detectedSubscription.findMany.mockResolvedValue(subs);

      const result = await service.findAll('user-1');

      expect(result).toHaveLength(2);
      expect(prisma.detectedSubscription.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { nextExpectedCharge: 'asc' },
      });
    });

    it('should return empty array for user with no subscriptions', async () => {
      prisma.detectedSubscription.findMany.mockResolvedValue([]);
      const result = await service.findAll('user-1');
      expect(result).toEqual([]);
    });

    it('should strip internal fields from response', async () => {
      prisma.detectedSubscription.findMany.mockResolvedValue([makeSub()]);
      const result = await service.findAll('user-1');

      expect(result[0]).not.toHaveProperty('normalizedMerchant');
      expect(result[0]).not.toHaveProperty('userId');
      expect(result[0]).not.toHaveProperty('createdAt');
      expect(result[0]).not.toHaveProperty('updatedAt');
    });

    it('should convert amount from Decimal to number', async () => {
      prisma.detectedSubscription.findMany.mockResolvedValue([makeSub({ amount: 799 })]);
      const result = await service.findAll('user-1');
      expect(typeof result[0].amount).toBe('number');
      expect(result[0].amount).toBe(799);
    });

    it('should convert dates to ISO strings', async () => {
      prisma.detectedSubscription.findMany.mockResolvedValue([makeSub()]);
      const result = await service.findAll('user-1');
      expect(typeof result[0].lastChargeDate).toBe('string');
      expect(typeof result[0].nextExpectedCharge).toBe('string');
    });
  });

  // ──────────────────────────────────────────
  // findActive
  // ──────────────────────────────────────────

  describe('findActive', () => {
    it('should query with isActive=true filter', async () => {
      prisma.detectedSubscription.findMany.mockResolvedValue([]);
      await service.findActive('user-1');

      expect(prisma.detectedSubscription.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isActive: true },
        orderBy: { nextExpectedCharge: 'asc' },
      });
    });

    it('should not return inactive subscriptions', async () => {
      const active = makeSub({ id: 's1', isActive: true });
      prisma.detectedSubscription.findMany.mockResolvedValue([active]);

      const result = await service.findActive('user-1');
      expect(result).toHaveLength(1);
      expect(result[0].isActive).toBe(true);
    });
  });

  // ──────────────────────────────────────────
  // findUpcoming
  // ──────────────────────────────────────────

  describe('findUpcoming', () => {
    it('should filter for nextExpectedCharge within 7 days from now', async () => {
      prisma.detectedSubscription.findMany.mockResolvedValue([]);

      await service.findUpcoming('user-1');

      const call = prisma.detectedSubscription.findMany.mock.calls[0][0];
      expect(call.where.userId).toBe('user-1');
      expect(call.where.isActive).toBe(true);
      expect(call.where.nextExpectedCharge).toHaveProperty('gte');
      expect(call.where.nextExpectedCharge).toHaveProperty('lte');

      const gte = new Date(call.where.nextExpectedCharge.gte);
      const lte = new Date(call.where.nextExpectedCharge.lte);
      const diffDays = (lte.getTime() - gte.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeCloseTo(7, 0);
    });

    it('should return empty when no upcoming subscriptions', async () => {
      prisma.detectedSubscription.findMany.mockResolvedValue([]);
      const result = await service.findUpcoming('user-1');
      expect(result).toEqual([]);
    });
  });

  // ──────────────────────────────────────────
  // getSummary
  // ──────────────────────────────────────────

  describe('getSummary', () => {
    it('should calculate activeCount correctly', async () => {
      prisma.detectedSubscription.findMany.mockResolvedValue([
        makeSub({ id: 's1' }),
        makeSub({ id: 's2' }),
        makeSub({ id: 's3' }),
      ]);

      const result = await service.getSummary('user-1');
      expect(result.activeCount).toBe(3);
    });

    it('should sum monthly totals for MONTHLY subscriptions', async () => {
      prisma.detectedSubscription.findMany.mockResolvedValue([
        makeSub({ id: 's1', amount: 799, periodType: 'MONTHLY' }),
        makeSub({ id: 's2', amount: 199, periodType: 'MONTHLY' }),
      ]);

      const result = await service.getSummary('user-1');
      expect(result.monthlyTotal).toBe(998);
    });

    it('should sum yearly totals for YEARLY subscriptions', async () => {
      prisma.detectedSubscription.findMany.mockResolvedValue([
        makeSub({ id: 's1', amount: 3990, periodType: 'YEARLY' }),
        makeSub({ id: 's2', amount: 2990, periodType: 'YEARLY' }),
      ]);

      const result = await service.getSummary('user-1');
      expect(result.yearlyTotal).toBe(6980);
      expect(result.monthlyTotal).toBe(0);
    });

    it('should normalize WEEKLY to monthly (×4.33)', async () => {
      prisma.detectedSubscription.findMany.mockResolvedValue([
        makeSub({ id: 's1', amount: 100, periodType: 'WEEKLY' }),
      ]);

      const result = await service.getSummary('user-1');
      expect(result.monthlyTotal).toBe(433); // 100 * 4.33 = 433
    });

    it('should include upcoming subscriptions in upcomingNext7Days', async () => {
      const now = new Date();
      const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      const in10Days = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);

      prisma.detectedSubscription.findMany.mockResolvedValue([
        makeSub({ id: 's1', nextExpectedCharge: in3Days }),
        makeSub({ id: 's2', nextExpectedCharge: in10Days }),
      ]);

      const result = await service.getSummary('user-1');
      expect(result.upcomingNext7Days).toHaveLength(1);
      expect(result.upcomingNext7Days[0].id).toBe('s1');
    });

    it('should return zeros for empty subscriptions', async () => {
      prisma.detectedSubscription.findMany.mockResolvedValue([]);

      const result = await service.getSummary('user-1');
      expect(result.activeCount).toBe(0);
      expect(result.monthlyTotal).toBe(0);
      expect(result.yearlyTotal).toBe(0);
      expect(result.upcomingNext7Days).toEqual([]);
    });

    it('should not count past nextExpectedCharge as upcoming', async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      prisma.detectedSubscription.findMany.mockResolvedValue([
        makeSub({ id: 's1', nextExpectedCharge: yesterday }),
      ]);

      const result = await service.getSummary('user-1');
      expect(result.upcomingNext7Days).toHaveLength(0);
    });

    it('should use single query (no N+1)', async () => {
      prisma.detectedSubscription.findMany.mockResolvedValue([
        makeSub({ id: 's1' }),
        makeSub({ id: 's2' }),
      ]);

      await service.getSummary('user-1');

      // Only one DB call for the entire summary
      expect(prisma.detectedSubscription.findMany).toHaveBeenCalledTimes(1);
    });
  });
});
