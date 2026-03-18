import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

function makeSub(overrides: {
  merchant: string;
  normalizedMerchant?: string;
  amount: number;
  periodType: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  isActive?: boolean;
  nextExpectedCharge?: Date;
  transactionCount?: number;
  confidence?: number;
  lastChargeDate?: Date;
}) {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    userId: 'test-user',
    merchant: overrides.merchant,
    normalizedMerchant: overrides.normalizedMerchant ?? overrides.merchant.toLowerCase(),
    amount: new Prisma.Decimal(overrides.amount),
    currency: 'RUB',
    periodType: overrides.periodType,
    lastChargeDate: overrides.lastChargeDate ?? now,
    nextExpectedCharge: overrides.nextExpectedCharge ?? new Date(now.getTime() + 30 * 86400000),
    isActive: overrides.isActive ?? true,
    confidence: overrides.confidence ?? 0.9,
    transactionCount: overrides.transactionCount ?? 4,
    createdAt: now,
    updatedAt: now,
  };
}

// ─────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────

describe('AnalyticsService — getAnalytics (legacy)', () => {
  let service: AnalyticsService;
  let mockPrisma: {
    detectedSubscription: { findMany: jest.Mock };
    importedTransaction: { aggregate: jest.Mock; findMany: jest.Mock };
  };

  beforeEach(async () => {
    mockPrisma = {
      detectedSubscription: { findMany: jest.fn().mockResolvedValue([]) },
      importedTransaction: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: null } }),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  it('TEST 1: correctly sums two monthly subscriptions', async () => {
    mockPrisma.detectedSubscription.findMany.mockResolvedValue([
      makeSub({ merchant: 'Spotify', amount: 299, periodType: 'MONTHLY' }),
      makeSub({ merchant: 'Netflix', amount: 999, periodType: 'MONTHLY' }),
    ]);

    const result = await service.getAnalytics('test-user');

    expect(result.monthlyTotal).toBe(1298);
    expect(result.yearlyTotal).toBe(15576);
    expect(result.activeSubscriptions).toBe(2);

    console.log('TEST 1 PASSED:', { monthlyTotal: result.monthlyTotal, yearlyTotal: result.yearlyTotal });
  });

  it('TEST 2: normalizes weekly subscription correctly', async () => {
    mockPrisma.detectedSubscription.findMany.mockResolvedValue([
      makeSub({ merchant: 'Gym', amount: 500, periodType: 'WEEKLY' }),
    ]);

    const result = await service.getAnalytics('test-user');

    expect(result.monthlyTotal).toBe(2165);
    expect(result.yearlyTotal).toBe(26000);

    console.log('TEST 2 PASSED:', { monthlyTotal: result.monthlyTotal, yearlyTotal: result.yearlyTotal });
  });

  it('TEST 3: normalizes yearly subscription correctly', async () => {
    mockPrisma.detectedSubscription.findMany.mockResolvedValue([
      makeSub({ merchant: 'Adobe', amount: 7200, periodType: 'YEARLY' }),
    ]);

    const result = await service.getAnalytics('test-user');

    expect(result.monthlyTotal).toBe(600);
    expect(result.yearlyTotal).toBe(7200);

    console.log('TEST 3 PASSED:', { monthlyTotal: result.monthlyTotal, yearlyTotal: result.yearlyTotal });
  });

  it('TEST 4: includes subscriptions due within 7 days in upcomingCharges', async () => {
    const tomorrow = new Date(Date.now() + 86400000);
    mockPrisma.detectedSubscription.findMany.mockResolvedValue([
      makeSub({ merchant: 'Spotify', amount: 299, periodType: 'MONTHLY', nextExpectedCharge: tomorrow }),
    ]);

    const result = await service.getAnalytics('test-user');

    expect(result.upcomingCharges).toHaveLength(1);
    expect(result.upcomingCharges[0].merchant).toBe('Spotify');
    expect(result.upcomingCharges[0].amount).toBe(299);

    console.log('TEST 4 PASSED:', { upcomingCharges: result.upcomingCharges });
  });

  it('TEST 5: excludes inactive subscriptions from all totals', async () => {
    mockPrisma.detectedSubscription.findMany.mockResolvedValue([
      makeSub({ merchant: 'Spotify', amount: 299, periodType: 'MONTHLY' }),
    ]);

    const result = await service.getAnalytics('test-user');

    expect(result.monthlyTotal).toBe(299);
    expect(result.yearlyTotal).toBe(3588);
    expect(result.activeSubscriptions).toBe(1);
    expect(mockPrisma.detectedSubscription.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'test-user', isActive: true } }),
    );

    console.log('TEST 5 PASSED:', { monthlyTotal: result.monthlyTotal, activeSubscriptions: result.activeSubscriptions });
  });
});

// ─────────────────────────────────────────────────────────
// New analytics methods
// ─────────────────────────────────────────────────────────

describe('AnalyticsService — new endpoints', () => {
  let service: AnalyticsService;
  let mockPrisma: {
    detectedSubscription: { findMany: jest.Mock };
    importedTransaction: { aggregate: jest.Mock; findMany: jest.Mock };
  };

  beforeEach(async () => {
    mockPrisma = {
      detectedSubscription: { findMany: jest.fn().mockResolvedValue([]) },
      importedTransaction: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: null } }),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  // ── Overview ──────────────────────────────────────────

  it('TEST 6: getOverview — returns correct MRR/ARR from active subscriptions', async () => {
    mockPrisma.detectedSubscription.findMany.mockResolvedValue([
      makeSub({ merchant: 'Spotify', amount: 300, periodType: 'MONTHLY' }),
      makeSub({ merchant: 'Adobe', amount: 7200, periodType: 'YEARLY' }),
    ]);
    mockPrisma.importedTransaction.aggregate.mockResolvedValue({ _sum: { amount: null } });

    const result = await service.getOverview('test-user');

    // MRR = 300 + (7200/12) = 300 + 600 = 900
    expect(result.mrr).toBe(900);
    expect(result.arr).toBe(10800);
    expect(result.activeCount).toBe(2);

    console.log('TEST 6 PASSED:', { mrr: result.mrr, arr: result.arr });
  });

  it('TEST 7: getOverview — returns zero MRR when no subscriptions', async () => {
    mockPrisma.detectedSubscription.findMany.mockResolvedValue([]);

    const result = await service.getOverview('test-user');

    expect(result.mrr).toBe(0);
    expect(result.arr).toBe(0);
    expect(result.activeCount).toBe(0);

    console.log('TEST 7 PASSED: empty overview OK');
  });

  it('TEST 8: getOverview — trend changePct is 0 when no transactions', async () => {
    mockPrisma.detectedSubscription.findMany.mockResolvedValue([]);
    mockPrisma.importedTransaction.aggregate.mockResolvedValue({ _sum: { amount: null } });

    const result = await service.getOverview('test-user');

    expect(result.trend.changePct).toBe(0);
    expect(result.trend.currentMonth).toBe(0);
    expect(result.trend.prevMonth).toBe(0);

    console.log('TEST 8 PASSED: zero trend OK');
  });

  // ── By Category ──────────────────────────────────────

  it('TEST 9: getByCategory — categorizes Netflix as Развлечения', async () => {
    mockPrisma.detectedSubscription.findMany.mockResolvedValue([
      makeSub({ merchant: 'Netflix', amount: 999, periodType: 'MONTHLY' }),
      makeSub({ merchant: 'Spotify', amount: 299, periodType: 'MONTHLY' }),
    ]);

    const result = await service.getByCategory('test-user');

    expect(result.length).toBeGreaterThan(0);
    const entertainment = result.find((c) => c.category === 'Развлечения');
    const music = result.find((c) => c.category === 'Музыка');
    expect(entertainment).toBeDefined();
    expect(music).toBeDefined();
    expect(entertainment!.total).toBe(999);
    expect(music!.total).toBe(299);

    console.log('TEST 9 PASSED:', result.map((c) => `${c.category}: ${c.total}`).join(', '));
  });

  it('TEST 10: getByCategory — percents sum to 100', async () => {
    mockPrisma.detectedSubscription.findMany.mockResolvedValue([
      makeSub({ merchant: 'Netflix', amount: 1000, periodType: 'MONTHLY' }),
      makeSub({ merchant: 'Spotify', amount: 500, periodType: 'MONTHLY' }),
      makeSub({ merchant: 'Adobe', amount: 500, periodType: 'MONTHLY' }),
    ]);

    const result = await service.getByCategory('test-user');
    const totalPercent = result.reduce((s, c) => s + c.percent, 0);

    expect(totalPercent).toBeCloseTo(100, 0);

    console.log('TEST 10 PASSED: total percent =', totalPercent);
  });

  // ── By Service ────────────────────────────────────────

  it('TEST 11: getByService — returns services sorted by monthlyAmount desc', async () => {
    mockPrisma.detectedSubscription.findMany.mockResolvedValue([
      makeSub({ merchant: 'Cheap', amount: 100, periodType: 'MONTHLY' }),
      makeSub({ merchant: 'Expensive', amount: 1000, periodType: 'MONTHLY' }),
      makeSub({ merchant: 'Mid', amount: 500, periodType: 'MONTHLY' }),
    ]);

    const result = await service.getByService('test-user');

    expect(result[0].merchant).toBe('Expensive');
    expect(result[1].merchant).toBe('Mid');
    expect(result[2].merchant).toBe('Cheap');

    console.log('TEST 11 PASSED: order by monthly amount correct');
  });

  it('TEST 12: getByService — monthlyAmount is correct for yearly subscription', async () => {
    mockPrisma.detectedSubscription.findMany.mockResolvedValue([
      makeSub({ merchant: 'Adobe', amount: 12000, periodType: 'YEARLY' }),
    ]);

    const result = await service.getByService('test-user');

    expect(result[0].monthlyAmount).toBe(1000);
    expect(result[0].yearlyAmount).toBe(12000);

    console.log('TEST 12 PASSED: yearly normalization =', result[0].monthlyAmount, '/mo');
  });

  // ── Scores ────────────────────────────────────────────

  it('TEST 13: getScores — returns score items with correct shape', async () => {
    mockPrisma.detectedSubscription.findMany.mockResolvedValue([
      makeSub({ merchant: 'Netflix', amount: 999, periodType: 'MONTHLY', transactionCount: 6, confidence: 0.95 }),
    ]);

    const result = await service.getScores('test-user');

    expect(result).toHaveLength(1);
    expect(result[0].valueScore).toBeGreaterThanOrEqual(0);
    expect(result[0].valueScore).toBeLessThanOrEqual(100);
    expect(['LOW', 'MEDIUM', 'HIGH']).toContain(result[0].churnRisk);
    expect(['Essential', 'Valuable', 'Marginal', 'Low Value']).toContain(result[0].label);

    console.log('TEST 13 PASSED:', {
      merchant: result[0].merchant,
      score: result[0].valueScore,
      label: result[0].label,
      churnRisk: result[0].churnRisk,
    });
  });

  it('TEST 14: getScores — returns empty array for no subscriptions', async () => {
    mockPrisma.detectedSubscription.findMany.mockResolvedValue([]);

    const result = await service.getScores('test-user');

    expect(result).toHaveLength(0);

    console.log('TEST 14 PASSED: empty scores OK');
  });

  // ── Recommendations ───────────────────────────────────

  it('TEST 15: getRecommendations — generates DOWNGRADE for long-running monthly sub', async () => {
    mockPrisma.detectedSubscription.findMany.mockResolvedValue([
      makeSub({ merchant: 'Spotify', amount: 299, periodType: 'MONTHLY', transactionCount: 8 }),
    ]);

    const result = await service.getRecommendations('test-user');

    const downgrade = result.find((r) => r.type === 'DOWNGRADE');
    expect(downgrade).toBeDefined();
    expect(downgrade!.merchant).toBe('Spotify');
    expect(downgrade!.potentialSavings).toBeGreaterThan(0);

    console.log('TEST 15 PASSED:', downgrade);
  });

  it('TEST 16: getRecommendations — CANCEL for overdue subscription', async () => {
    const longAgo = new Date(Date.now() - 120 * 86400000); // 120 days ago
    mockPrisma.detectedSubscription.findMany.mockResolvedValue([
      makeSub({
        merchant: 'OldSub',
        amount: 500,
        periodType: 'MONTHLY',
        nextExpectedCharge: longAgo,
      }),
    ]);

    const result = await service.getRecommendations('test-user');

    const cancel = result.find((r) => r.type === 'CANCEL');
    expect(cancel).toBeDefined();
    expect(cancel!.merchant).toBe('OldSub');
    expect(cancel!.priority).toBe('HIGH');

    console.log('TEST 16 PASSED:', cancel);
  });

  it('TEST 17: getRecommendations — returns empty array when no subscriptions', async () => {
    mockPrisma.detectedSubscription.findMany.mockResolvedValue([]);

    const result = await service.getRecommendations('test-user');

    expect(result).toHaveLength(0);

    console.log('TEST 17 PASSED: empty recs OK');
  });

  // ── By Period ─────────────────────────────────────────

  it('TEST 18: getByPeriod — returns 12 months even with no transactions', async () => {
    mockPrisma.importedTransaction.findMany.mockResolvedValue([]);

    const result = await service.getByPeriod('test-user', 'month');

    expect(result).toHaveLength(12);
    expect(result.every((p) => p.total === 0)).toBe(true);

    console.log('TEST 18 PASSED: 12 empty months:', result.map((p) => p.period).join(', '));
  });

  it('TEST 19: getByPeriod — aggregates transactions by month', async () => {
    const thisMonth = new Date();
    const lastMonth = new Date(thisMonth.getFullYear(), thisMonth.getMonth() - 1, 15);

    mockPrisma.importedTransaction.findMany.mockResolvedValue([
      { occurredAt: thisMonth, amount: new Prisma.Decimal(500) },
      { occurredAt: thisMonth, amount: new Prisma.Decimal(300) },
      { occurredAt: lastMonth, amount: new Prisma.Decimal(700) },
    ]);

    const result = await service.getByPeriod('test-user', 'month');

    // This month: 500 + 300 = 800
    const currentKey = `${thisMonth.getFullYear()}-${String(thisMonth.getMonth() + 1).padStart(2, '0')}`;
    const currentPeriod = result.find((p) => p.period === currentKey);
    expect(currentPeriod?.total).toBe(800);

    console.log('TEST 19 PASSED: current month total =', currentPeriod?.total);
  });
});
