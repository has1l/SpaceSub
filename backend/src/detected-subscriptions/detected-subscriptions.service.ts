import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { DetectedSubscription } from '@prisma/client';
import type {
  SubscriptionResponseDto,
  SubscriptionSummaryDto,
} from './dto/subscription-response.dto';

@Injectable()
export class DetectedSubscriptionsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string): Promise<SubscriptionResponseDto[]> {
    const subs = await this.prisma.detectedSubscription.findMany({
      where: { userId },
      orderBy: { nextExpectedCharge: 'asc' },
    });
    return subs.map(this.toDto);
  }

  async findActive(userId: string): Promise<SubscriptionResponseDto[]> {
    const subs = await this.prisma.detectedSubscription.findMany({
      where: { userId, isActive: true },
      orderBy: { nextExpectedCharge: 'asc' },
    });
    return subs.map(this.toDto);
  }

  async findUpcoming(userId: string): Promise<SubscriptionResponseDto[]> {
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const subs = await this.prisma.detectedSubscription.findMany({
      where: {
        userId,
        isActive: true,
        nextExpectedCharge: { gte: now, lte: in7Days },
      },
      orderBy: { nextExpectedCharge: 'asc' },
    });
    return subs.map(this.toDto);
  }

  async getSummary(userId: string): Promise<SubscriptionSummaryDto> {
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Single query: get all active subscriptions
    const activeSubs = await this.prisma.detectedSubscription.findMany({
      where: { userId, isActive: true },
      select: {
        id: true,
        merchant: true,
        amount: true,
        currency: true,
        periodType: true,
        lastChargeDate: true,
        nextExpectedCharge: true,
        isActive: true,
        confidence: true,
        transactionCount: true,
      },
    });

    let monthlyTotal = 0;
    let yearlyTotal = 0;
    const upcoming: SubscriptionResponseDto[] = [];

    for (const sub of activeSubs) {
      const amount = sub.amount.toNumber();

      if (sub.periodType === 'MONTHLY') {
        monthlyTotal += amount;
      } else if (sub.periodType === 'YEARLY') {
        yearlyTotal += amount;
      } else if (sub.periodType === 'WEEKLY') {
        // Normalize weekly to monthly for summary
        monthlyTotal += amount * 4.33;
      }

      if (sub.nextExpectedCharge >= now && sub.nextExpectedCharge <= in7Days) {
        upcoming.push(this.toDto(sub as any));
      }
    }

    return {
      activeCount: activeSubs.length,
      monthlyTotal: Math.round(monthlyTotal * 100) / 100,
      yearlyTotal: Math.round(yearlyTotal * 100) / 100,
      upcomingNext7Days: upcoming,
    };
  }

  private toDto(sub: DetectedSubscription): SubscriptionResponseDto {
    return {
      id: sub.id,
      merchant: sub.merchant,
      amount: sub.amount.toNumber(),
      currency: sub.currency,
      periodType: sub.periodType,
      lastChargeDate: sub.lastChargeDate.toISOString(),
      nextExpectedCharge: sub.nextExpectedCharge.toISOString(),
      isActive: sub.isActive,
      confidence: sub.confidence,
      transactionCount: sub.transactionCount,
    };
  }
}
