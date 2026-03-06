import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BillingCycle, Prisma } from '@prisma/client';

interface GroupedTransaction {
  id: string;
  amount: number;
  currency: string;
  description: string;
  merchant: string | null;
  occurredAt: Date;
}

interface DetectedPattern {
  merchant: string;
  normalizedMerchant: string;
  amount: number;
  currency: string;
  periodType: BillingCycle;
  lastChargeDate: Date;
  nextExpectedCharge: Date;
  confidence: number;
  transactionCount: number;
}

const PERIOD_RANGES: {
  type: BillingCycle;
  minDays: number;
  maxDays: number;
  expectedDays: number;
}[] = [
  { type: 'WEEKLY', minDays: 6, maxDays: 8, expectedDays: 7 },
  { type: 'MONTHLY', minDays: 25, maxDays: 35, expectedDays: 30 },
  { type: 'YEARLY', minDays: 350, maxDays: 380, expectedDays: 365 },
];

const MIN_REPETITIONS = 2;
const AMOUNT_TOLERANCE = 0.03; // ±3%

@Injectable()
export class SubscriptionAnalyzerService {
  private readonly logger = new Logger(SubscriptionAnalyzerService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Main entry point: analyze imported transactions for a user
   * and upsert detected subscriptions.
   */
  async analyzeForUser(userId: string): Promise<number> {
    const transactions = await this.prisma.importedTransaction.findMany({
      where: { userId, amount: { lt: 0 } }, // only debits (negative amounts)
      orderBy: { occurredAt: 'asc' },
    });

    if (transactions.length === 0) {
      this.logger.log(`Analyzer: no debit transactions for user=${userId}`);
      return 0;
    }

    const rows: GroupedTransaction[] = transactions.map((t) => ({
      id: t.id,
      amount: Math.abs(
        t.amount instanceof Prisma.Decimal
          ? t.amount.toNumber()
          : Number(t.amount),
      ),
      currency: t.currency,
      description: t.description,
      merchant: t.merchant,
      occurredAt: t.occurredAt,
    }));

    const groups = this.groupByMerchantAndAmount(rows);
    const patterns = this.detectPatterns(groups);

    if (patterns.length === 0) {
      this.logger.log(`Analyzer: no subscription patterns found for user=${userId}`);
      return 0;
    }

    // Upsert detected subscriptions
    let upsertCount = 0;
    for (const p of patterns) {
      await this.prisma.detectedSubscription.upsert({
        where: {
          userId_normalizedMerchant_amount_currency: {
            userId,
            normalizedMerchant: p.normalizedMerchant,
            amount: new Prisma.Decimal(p.amount),
            currency: p.currency,
          },
        },
        update: {
          merchant: p.merchant,
          periodType: p.periodType,
          lastChargeDate: p.lastChargeDate,
          nextExpectedCharge: p.nextExpectedCharge,
          confidence: p.confidence,
          transactionCount: p.transactionCount,
          isActive: true,
        },
        create: {
          userId,
          merchant: p.merchant,
          normalizedMerchant: p.normalizedMerchant,
          amount: new Prisma.Decimal(p.amount),
          currency: p.currency,
          periodType: p.periodType,
          lastChargeDate: p.lastChargeDate,
          nextExpectedCharge: p.nextExpectedCharge,
          confidence: p.confidence,
          transactionCount: p.transactionCount,
          isActive: true,
        },
      });
      upsertCount++;
    }

    this.logger.log(
      `Analyzer: user=${userId} detected=${patterns.length} subscriptions from ${transactions.length} transactions`,
    );
    return upsertCount;
  }

  /**
   * Mark subscriptions as inactive if nextExpectedCharge + 7 days
   * has passed without a new matching payment.
   */
  async markInactiveSubscriptions(userId: string): Promise<number> {
    const gracePeriodMs = 7 * 24 * 60 * 60 * 1000;
    const now = new Date();

    const activeSubs = await this.prisma.detectedSubscription.findMany({
      where: { userId, isActive: true },
    });

    let deactivatedCount = 0;

    for (const sub of activeSubs) {
      const deadline = new Date(sub.nextExpectedCharge.getTime() + gracePeriodMs);

      if (now <= deadline) continue; // not yet overdue

      // Check if a matching transaction appeared after lastChargeDate
      const recentMatch = await this.prisma.importedTransaction.findFirst({
        where: {
          userId,
          occurredAt: { gt: sub.lastChargeDate },
          amount: {
            gte: new Prisma.Decimal(
              -sub.amount.toNumber() * (1 + AMOUNT_TOLERANCE),
            ),
            lte: new Prisma.Decimal(
              -sub.amount.toNumber() * (1 - AMOUNT_TOLERANCE),
            ),
          },
          description: {
            contains: sub.normalizedMerchant.split(' ')[0],
            mode: 'insensitive',
          },
        },
      });

      if (!recentMatch) {
        await this.prisma.detectedSubscription.update({
          where: { id: sub.id },
          data: { isActive: false },
        });
        deactivatedCount++;
        this.logger.log(
          `Analyzer: deactivated subscription merchant="${sub.merchant}" for user=${userId}`,
        );
      }
    }

    return deactivatedCount;
  }

  /**
   * Group transactions by normalizedMerchant + rounded amount (±3%)
   */
  groupByMerchantAndAmount(
    transactions: GroupedTransaction[],
  ): Map<string, GroupedTransaction[]> {
    const groups = new Map<string, GroupedTransaction[]>();

    for (const tx of transactions) {
      const normMerchant = this.normalizeMerchant(tx.merchant || tx.description);
      // Round amount to nearest integer for grouping key
      const roundedAmount = Math.round(tx.amount);
      const key = `${normMerchant}|${roundedAmount}|${tx.currency}`;

      const existing = groups.get(key);
      if (existing) {
        // Check actual ±3% tolerance before adding
        const refAmount = existing[0].amount;
        if (this.amountsMatch(tx.amount, refAmount)) {
          existing.push(tx);
        }
      } else {
        groups.set(key, [tx]);
      }
    }

    return groups;
  }

  /**
   * Detect subscription patterns from grouped transactions.
   */
  detectPatterns(
    groups: Map<string, GroupedTransaction[]>,
  ): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];

    for (const [, group] of groups) {
      if (group.length < MIN_REPETITIONS) continue;

      // Sort by date
      const sorted = [...group].sort(
        (a, b) => a.occurredAt.getTime() - b.occurredAt.getTime(),
      );

      const intervals = this.computeIntervals(sorted);
      if (intervals.length === 0) continue;

      const detected = this.classifyPeriod(intervals);
      if (!detected) continue;

      const confidence = this.computeConfidence(intervals, detected.expectedDays);
      if (confidence < 0.5) continue;

      const lastTx = sorted[sorted.length - 1];
      const nextExpectedCharge = new Date(lastTx.occurredAt);
      nextExpectedCharge.setDate(
        nextExpectedCharge.getDate() + detected.expectedDays,
      );

      const avgAmount =
        sorted.reduce((sum, t) => sum + t.amount, 0) / sorted.length;

      patterns.push({
        merchant: this.pickBestName(sorted),
        normalizedMerchant: this.normalizeMerchant(
          lastTx.merchant || lastTx.description,
        ),
        amount: Math.round(avgAmount * 100) / 100,
        currency: sorted[0].currency,
        periodType: detected.type,
        lastChargeDate: lastTx.occurredAt,
        nextExpectedCharge,
        confidence: Math.round(confidence * 100) / 100,
        transactionCount: sorted.length,
      });
    }

    return patterns.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Compute day intervals between consecutive transactions.
   */
  computeIntervals(sorted: GroupedTransaction[]): number[] {
    const intervals: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const diffMs =
        sorted[i].occurredAt.getTime() - sorted[i - 1].occurredAt.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      intervals.push(diffDays);
    }
    return intervals;
  }

  /**
   * Classify interval array into a BillingCycle type.
   */
  classifyPeriod(
    intervals: number[],
  ): { type: BillingCycle; expectedDays: number } | null {
    const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;

    for (const range of PERIOD_RANGES) {
      if (avg >= range.minDays && avg <= range.maxDays) {
        // Verify that at least 60% of intervals fall within the range
        const matchCount = intervals.filter(
          (i) => i >= range.minDays && i <= range.maxDays,
        ).length;
        if (matchCount / intervals.length >= 0.6) {
          return { type: range.type, expectedDays: range.expectedDays };
        }
      }
    }

    return null;
  }

  /**
   * Compute confidence score based on interval regularity.
   */
  computeConfidence(intervals: number[], expectedDays: number): number {
    if (intervals.length === 0) return 0;

    const deviations = intervals.map(
      (i) => Math.abs(i - expectedDays) / expectedDays,
    );
    const avgDeviation =
      deviations.reduce((a, b) => a + b, 0) / deviations.length;

    const regularityScore = Math.max(0, 1 - avgDeviation * 2);
    const countBonus = Math.min(1, intervals.length / 6);

    return regularityScore * 0.7 + countBonus * 0.3;
  }

  /**
   * Normalize merchant name for grouping.
   */
  normalizeMerchant(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-zа-яё0-9]/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Check if two amounts are within ±3% of each other.
   */
  amountsMatch(a: number, b: number): boolean {
    if (b === 0) return a === 0;
    return Math.abs(a - b) / b <= AMOUNT_TOLERANCE;
  }

  /**
   * Pick the most common raw merchant/description as display name.
   */
  private pickBestName(transactions: GroupedTransaction[]): string {
    const freq = new Map<string, number>();
    for (const tx of transactions) {
      const name = tx.merchant || tx.description;
      freq.set(name, (freq.get(name) || 0) + 1);
    }
    let best = transactions[0].merchant || transactions[0].description;
    let maxCount = 0;
    for (const [name, count] of freq) {
      if (count > maxCount) {
        maxCount = count;
        best = name;
      }
    }
    return best;
  }
}
