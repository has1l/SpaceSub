import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

/**
 * Helper to build a DetectedSubscription row matching Prisma's return type.
 */
function makeSub(overrides: {
  merchant: string;
  amount: number;
  periodType: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  isActive?: boolean;
  nextExpectedCharge?: Date;
}) {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    userId: 'test-user',
    merchant: overrides.merchant,
    normalizedMerchant: overrides.merchant.toLowerCase(),
    amount: new Prisma.Decimal(overrides.amount),
    currency: 'RUB',
    periodType: overrides.periodType,
    lastChargeDate: now,
    nextExpectedCharge: overrides.nextExpectedCharge ?? new Date(now.getTime() + 30 * 86400000),
    isActive: overrides.isActive ?? true,
    confidence: 0.9,
    transactionCount: 4,
    createdAt: now,
    updatedAt: now,
  };
}

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let mockPrisma: { detectedSubscription: { findMany: jest.Mock } };

  beforeEach(async () => {
    mockPrisma = {
      detectedSubscription: {
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

  // ─────────────────────────────────────────────────────
  // TEST 1: Two monthly subscriptions
  // Spotify 299/mo + Netflix 999/mo
  // Expected: monthly=1298, yearly=15576
  // ─────────────────────────────────────────────────────
  it('TEST 1: correctly sums two monthly subscriptions', async () => {
    mockPrisma.detectedSubscription.findMany.mockResolvedValue([
      makeSub({ merchant: 'Spotify', amount: 299, periodType: 'MONTHLY' }),
      makeSub({ merchant: 'Netflix', amount: 999, periodType: 'MONTHLY' }),
    ]);

    const result = await service.getAnalytics('test-user');

    expect(result.monthlyTotal).toBe(1298);
    expect(result.yearlyTotal).toBe(15576);
    expect(result.activeSubscriptions).toBe(2);

    console.log('TEST 1 PASSED:', {
      monthlyTotal: result.monthlyTotal,
      yearlyTotal: result.yearlyTotal,
    });
  });

  // ─────────────────────────────────────────────────────
  // TEST 2: Weekly subscription
  // Gym 500/week
  // Expected: monthly≈2165, yearly=26000
  // ─────────────────────────────────────────────────────
  it('TEST 2: normalizes weekly subscription correctly', async () => {
    mockPrisma.detectedSubscription.findMany.mockResolvedValue([
      makeSub({ merchant: 'Gym', amount: 500, periodType: 'WEEKLY' }),
    ]);

    const result = await service.getAnalytics('test-user');

    expect(result.monthlyTotal).toBe(2165);
    expect(result.yearlyTotal).toBe(26000);

    console.log('TEST 2 PASSED:', {
      monthlyTotal: result.monthlyTotal,
      yearlyTotal: result.yearlyTotal,
    });
  });

  // ─────────────────────────────────────────────────────
  // TEST 3: Yearly subscription
  // Adobe 7200/year
  // Expected: monthly=600, yearly=7200
  // ─────────────────────────────────────────────────────
  it('TEST 3: normalizes yearly subscription correctly', async () => {
    mockPrisma.detectedSubscription.findMany.mockResolvedValue([
      makeSub({ merchant: 'Adobe', amount: 7200, periodType: 'YEARLY' }),
    ]);

    const result = await service.getAnalytics('test-user');

    expect(result.monthlyTotal).toBe(600);
    expect(result.yearlyTotal).toBe(7200);

    console.log('TEST 3 PASSED:', {
      monthlyTotal: result.monthlyTotal,
      yearlyTotal: result.yearlyTotal,
    });
  });

  // ─────────────────────────────────────────────────────
  // TEST 4: Upcoming charges within 7 days
  // Spotify billing tomorrow
  // Expected: appears in upcomingCharges
  // ─────────────────────────────────────────────────────
  it('TEST 4: includes subscriptions due within 7 days in upcomingCharges', async () => {
    const tomorrow = new Date(Date.now() + 86400000);

    mockPrisma.detectedSubscription.findMany.mockResolvedValue([
      makeSub({
        merchant: 'Spotify',
        amount: 299,
        periodType: 'MONTHLY',
        nextExpectedCharge: tomorrow,
      }),
    ]);

    const result = await service.getAnalytics('test-user');

    expect(result.upcomingCharges).toHaveLength(1);
    expect(result.upcomingCharges[0].merchant).toBe('Spotify');
    expect(result.upcomingCharges[0].amount).toBe(299);

    console.log('TEST 4 PASSED:', { upcomingCharges: result.upcomingCharges });
  });

  // ─────────────────────────────────────────────────────
  // TEST 5: Inactive subscription excluded
  // isActive=false must NOT appear in totals
  // ─────────────────────────────────────────────────────
  it('TEST 5: excludes inactive subscriptions from all totals', async () => {
    // The Prisma query uses where: { isActive: true }, so inactive
    // rows are never returned. We simulate this by returning only
    // the active one.
    mockPrisma.detectedSubscription.findMany.mockResolvedValue([
      makeSub({ merchant: 'Spotify', amount: 299, periodType: 'MONTHLY' }),
      // The inactive subscription is NOT returned by Prisma (filtered at DB level)
    ]);

    const result = await service.getAnalytics('test-user');

    expect(result.monthlyTotal).toBe(299);
    expect(result.yearlyTotal).toBe(3588);
    expect(result.activeSubscriptions).toBe(1);

    // Verify the findMany was called with isActive: true
    expect(mockPrisma.detectedSubscription.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'test-user', isActive: true },
      }),
    );

    console.log('TEST 5 PASSED:', {
      monthlyTotal: result.monthlyTotal,
      activeSubscriptions: result.activeSubscriptions,
      queryFilter: 'isActive: true confirmed',
    });
  });
});
