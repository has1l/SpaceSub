import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { BillingCycle } from '@prisma/client';

interface TimelineEntry {
  merchant: string;
  amount: number;
  chargeDate: string;
  periodType: BillingCycle;
}

export interface ForecastResponseDto {
  next7DaysTotal: number;
  next30DaysTotal: number;
  next12MonthsTotal: number;
  upcomingTimeline: TimelineEntry[];
}

@Injectable()
export class ForecastService {
  constructor(private prisma: PrismaService) {}

  async getForecast(userId: string): Promise<ForecastResponseDto> {
    const subs = await this.prisma.detectedSubscription.findMany({
      where: { userId, isActive: true },
    });

    const now = new Date();
    const horizon7 = addDays(now, 7);
    const horizon30 = addDays(now, 30);
    const horizon365 = addDays(now, 365);

    let next7DaysTotal = 0;
    let next30DaysTotal = 0;
    let next12MonthsTotal = 0;
    const timeline: TimelineEntry[] = [];

    for (const sub of subs) {
      const amount = sub.amount.toNumber();
      let cursor = new Date(sub.nextExpectedCharge);

      // If nextExpectedCharge is in the past, advance to the first
      // future occurrence before generating the forecast.
      while (cursor <= now) {
        cursor = advanceCursor(cursor, sub.periodType);
      }

      // Generate charges from cursor until beyond the 365-day horizon
      while (cursor <= horizon365) {
        if (cursor <= horizon7) next7DaysTotal += amount;
        if (cursor <= horizon30) next30DaysTotal += amount;
        next12MonthsTotal += amount;

        if (cursor <= horizon30) {
          timeline.push({
            merchant: sub.merchant,
            amount,
            chargeDate: cursor.toISOString(),
            periodType: sub.periodType,
          });
        }

        cursor = advanceCursor(cursor, sub.periodType);
      }
    }

    timeline.sort(
      (a, b) => new Date(a.chargeDate).getTime() - new Date(b.chargeDate).getTime(),
    );

    return {
      next7DaysTotal: round2(next7DaysTotal),
      next30DaysTotal: round2(next30DaysTotal),
      next12MonthsTotal: round2(next12MonthsTotal),
      upcomingTimeline: timeline,
    };
  }
}

/**
 * Advance a date by one billing period.
 */
function advanceCursor(date: Date, period: BillingCycle): Date {
  const next = new Date(date);
  switch (period) {
    case 'WEEKLY':
      next.setDate(next.getDate() + 7);
      break;
    case 'MONTHLY':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'QUARTERLY':
      next.setMonth(next.getMonth() + 3);
      break;
    case 'YEARLY':
      next.setFullYear(next.getFullYear() + 1);
      break;
  }
  return next;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
