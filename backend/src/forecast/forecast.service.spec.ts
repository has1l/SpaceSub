import { Test, TestingModule } from '@nestjs/testing';
import { ForecastService } from './forecast.service';
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

describe('ForecastService', () => {
  let service: ForecastService;
  let mockPrisma: { detectedSubscription: { findMany: jest.Mock } };

  beforeEach(async () => {
    mockPrisma = {
      detectedSubscription: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ForecastService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ForecastService>(ForecastService);
  });

  // ─────────────────────────────────────────────────────
  // TEST 1: Spotify 299/mo, nextExpectedCharge = tomorrow
  // Expected: next7DaysTotal = 299
  // ─────────────────────────────────────────────────────
  it('TEST 1: monthly sub due tomorrow appears in next7DaysTotal', async () => {
    const tomorrow = new Date(Date.now() + 86400000);

    mockPrisma.detectedSubscription.findMany.mockResolvedValue([
      makeSub({
        merchant: 'Spotify',
        amount: 299,
        periodType: 'MONTHLY',
        nextExpectedCharge: tomorrow,
      }),
    ]);

    const result = await service.getForecast('test-user');

    expect(result.next7DaysTotal).toBe(299);
    expect(result.upcomingTimeline.length).toBeGreaterThanOrEqual(1);
    expect(result.upcomingTimeline[0].merchant).toBe('Spotify');

    console.log('TEST 1 PASSED:', {
      next7DaysTotal: result.next7DaysTotal,
      firstTimelineEntry: result.upcomingTimeline[0],
    });
  });

  // ─────────────────────────────────────────────────────
  // TEST 2: Netflix 999/mo, nextExpectedCharge = 20 days
  // Expected: next30DaysTotal = 999
  // ─────────────────────────────────────────────────────
  it('TEST 2: monthly sub due in 20 days appears in next30DaysTotal', async () => {
    const in20Days = new Date(Date.now() + 20 * 86400000);

    mockPrisma.detectedSubscription.findMany.mockResolvedValue([
      makeSub({
        merchant: 'Netflix',
        amount: 999,
        periodType: 'MONTHLY',
        nextExpectedCharge: in20Days,
      }),
    ]);

    const result = await service.getForecast('test-user');

    expect(result.next30DaysTotal).toBe(999);
    // Should NOT be in 7-day total
    expect(result.next7DaysTotal).toBe(0);

    console.log('TEST 2 PASSED:', {
      next7DaysTotal: result.next7DaysTotal,
      next30DaysTotal: result.next30DaysTotal,
    });
  });

  // ─────────────────────────────────────────────────────
  // TEST 3: Gym 500/week
  // Expected: next30DaysTotal ≈ 2000 (4 weekly charges in 30 days)
  // ─────────────────────────────────────────────────────
  it('TEST 3: weekly sub generates ~4 charges in 30-day window', async () => {
    const in3Days = new Date(Date.now() + 3 * 86400000);

    mockPrisma.detectedSubscription.findMany.mockResolvedValue([
      makeSub({
        merchant: 'Gym',
        amount: 500,
        periodType: 'WEEKLY',
        nextExpectedCharge: in3Days,
      }),
    ]);

    const result = await service.getForecast('test-user');

    // With nextExpectedCharge in 3 days: charges at day 3, 10, 17, 24 = 4 charges = 2000
    expect(result.next30DaysTotal).toBe(2000);
    expect(result.next7DaysTotal).toBe(500);

    console.log('TEST 3 PASSED:', {
      next7DaysTotal: result.next7DaysTotal,
      next30DaysTotal: result.next30DaysTotal,
      next12MonthsTotal: result.next12MonthsTotal,
    });
  });

  // ─────────────────────────────────────────────────────
  // TEST 4: Adobe 7200/year
  // Expected: next12MonthsTotal = 7200
  // ─────────────────────────────────────────────────────
  it('TEST 4: yearly sub appears in next12MonthsTotal', async () => {
    const in60Days = new Date(Date.now() + 60 * 86400000);

    mockPrisma.detectedSubscription.findMany.mockResolvedValue([
      makeSub({
        merchant: 'Adobe',
        amount: 7200,
        periodType: 'YEARLY',
        nextExpectedCharge: in60Days,
      }),
    ]);

    const result = await service.getForecast('test-user');

    expect(result.next12MonthsTotal).toBe(7200);
    // Not within 30 days
    expect(result.next30DaysTotal).toBe(0);

    console.log('TEST 4 PASSED:', {
      next12MonthsTotal: result.next12MonthsTotal,
      next30DaysTotal: result.next30DaysTotal,
    });
  });

  // ─────────────────────────────────────────────────────
  // TEST 5: Inactive subscription excluded
  // isActive=false must NOT appear in any totals
  // ─────────────────────────────────────────────────────
  it('TEST 5: inactive subscriptions are excluded (filtered at DB level)', async () => {
    // Prisma query uses where: { isActive: true }, so inactive
    // rows are never returned. We simulate by returning only active ones.
    mockPrisma.detectedSubscription.findMany.mockResolvedValue([
      makeSub({
        merchant: 'Spotify',
        amount: 299,
        periodType: 'MONTHLY',
        nextExpectedCharge: new Date(Date.now() + 86400000),
      }),
    ]);

    const result = await service.getForecast('test-user');

    expect(result.next7DaysTotal).toBe(299);
    expect(result.next12MonthsTotal).toBeGreaterThan(0);

    // Verify the query filtered by isActive: true
    expect(mockPrisma.detectedSubscription.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'test-user', isActive: true },
      }),
    );

    console.log('TEST 5 PASSED:', {
      next7DaysTotal: result.next7DaysTotal,
      queryFilter: 'isActive: true confirmed',
    });
  });
});
