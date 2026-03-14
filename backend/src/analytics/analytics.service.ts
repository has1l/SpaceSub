import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { BillingCycle } from '@prisma/client';

interface TopSubscriptionDto {
  merchant: string;
  amount: number;
  periodType: BillingCycle;
  monthlyEquivalent: number;
}

interface UpcomingChargeDto {
  merchant: string;
  amount: number;
  nextExpectedCharge: string;
  periodType: BillingCycle;
}

export interface AnalyticsResponseDto {
  monthlyTotal: number;
  yearlyTotal: number;
  activeSubscriptions: number;
  topSubscriptions: TopSubscriptionDto[];
  upcomingCharges: UpcomingChargeDto[];
}

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getAnalytics(userId: string): Promise<AnalyticsResponseDto> {
    const activeSubs = await this.prisma.detectedSubscription.findMany({
      where: { userId, isActive: true },
      orderBy: { amount: 'desc' },
    });

    let monthlyTotal = 0;
    let yearlyTotal = 0;

    const scored: TopSubscriptionDto[] = [];

    for (const sub of activeSubs) {
      const amount = sub.amount.toNumber();
      const monthly = toMonthly(amount, sub.periodType);
      const yearly = toYearly(amount, sub.periodType);

      monthlyTotal += monthly;
      yearlyTotal += yearly;

      scored.push({
        merchant: sub.merchant,
        amount,
        periodType: sub.periodType,
        monthlyEquivalent: round2(monthly),
      });
    }

    // Top 5 by monthly equivalent (already sorted desc by amount but
    // re-sort by normalized monthly cost for correctness)
    scored.sort((a, b) => b.monthlyEquivalent - a.monthlyEquivalent);
    const topSubscriptions = scored.slice(0, 5);

    // Upcoming charges: nextExpectedCharge within the next 7 days
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const upcoming = activeSubs
      .filter(
        (s) => s.nextExpectedCharge >= now && s.nextExpectedCharge <= in7Days,
      )
      .map((s) => ({
        merchant: s.merchant,
        amount: s.amount.toNumber(),
        nextExpectedCharge: s.nextExpectedCharge.toISOString(),
        periodType: s.periodType,
      }));

    return {
      monthlyTotal: round2(monthlyTotal),
      yearlyTotal: round2(yearlyTotal),
      activeSubscriptions: activeSubs.length,
      topSubscriptions,
      upcomingCharges: upcoming,
    };
  }
}

function toMonthly(amount: number, period: BillingCycle): number {
  switch (period) {
    case 'WEEKLY':
      return amount * 4.33;
    case 'MONTHLY':
      return amount;
    case 'QUARTERLY':
      return amount / 3;
    case 'YEARLY':
      return amount / 12;
  }
}

function toYearly(amount: number, period: BillingCycle): number {
  switch (period) {
    case 'WEEKLY':
      return amount * 52;
    case 'MONTHLY':
      return amount * 12;
    case 'QUARTERLY':
      return amount * 4;
    case 'YEARLY':
      return amount;
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
