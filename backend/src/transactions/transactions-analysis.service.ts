import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

export interface SubscriptionSuggestion {
  suggestionId: string;
  name: string;
  amount: number;
  currency: string;
  billingCycle: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  nextBilling: string;
  score: number;
  transactionIds: string[];
  transactionCount: number;
}

interface TransactionRow {
  id: string;
  amount: { toNumber(): number } | number;
  currency: string;
  description: string;
  transactionDate: Date;
  subscriptionId: string | null;
}

@Injectable()
export class TransactionsAnalysisService {
  private suggestionsCache = new Map<string, SubscriptionSuggestion[]>();

  constructor(private prisma: PrismaService) {}

  async analyze(userId: string): Promise<SubscriptionSuggestion[]> {
    const transactions = await this.prisma.transaction.findMany({
      where: { userId, subscriptionId: null },
      orderBy: { transactionDate: 'asc' },
    });

    const groups = this.groupTransactions(transactions);
    const suggestions: SubscriptionSuggestion[] = [];

    for (const group of groups) {
      if (group.length < 3) continue;

      const intervals = this.computeIntervals(group);
      if (intervals.length < 2) continue;

      const cycle = this.detectCycle(intervals);
      if (!cycle) continue;

      const score = this.computeScore(intervals, cycle.expectedDays);
      if (score < 0.5) continue;

      const lastDate = group[group.length - 1].transactionDate;
      const nextBilling = new Date(lastDate);
      nextBilling.setDate(nextBilling.getDate() + cycle.expectedDays);

      const amount =
        typeof group[0].amount === 'number'
          ? group[0].amount
          : (group[0].amount as { toNumber(): number }).toNumber();

      suggestions.push({
        suggestionId: randomUUID(),
        name: this.pickBestName(group.map((t) => t.description)),
        amount,
        currency: group[0].currency,
        billingCycle: cycle.billingCycle,
        nextBilling: nextBilling.toISOString(),
        score: Math.round(score * 100) / 100,
        transactionIds: group.map((t) => t.id),
        transactionCount: group.length,
      });
    }

    const sorted = suggestions.sort((a, b) => b.score - a.score);
    this.suggestionsCache.set(userId, sorted);
    return sorted;
  }

  getSuggestionById(
    userId: string,
    suggestionId: string,
  ): SubscriptionSuggestion | undefined {
    const cached = this.suggestionsCache.get(userId);
    if (!cached) return undefined;
    return cached.find((s) => s.suggestionId === suggestionId);
  }

  removeSuggestion(userId: string, suggestionId: string): void {
    const cached = this.suggestionsCache.get(userId);
    if (!cached) return;
    this.suggestionsCache.set(
      userId,
      cached.filter((s) => s.suggestionId !== suggestionId),
    );
  }

  groupTransactions(transactions: TransactionRow[]): TransactionRow[][] {
    const groups = new Map<string, TransactionRow[]>();

    for (const tx of transactions) {
      const amount =
        typeof tx.amount === 'number'
          ? tx.amount
          : (tx.amount as { toNumber(): number }).toNumber();
      const key = `${amount}_${tx.currency}_${this.normalizeDescription(tx.description)}`;

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(tx);
    }

    return Array.from(groups.values());
  }

  normalizeDescription(desc: string): string {
    return desc
      .toLowerCase()
      .replace(/[^a-zа-яё0-9]/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  computeIntervals(group: TransactionRow[]): number[] {
    const sorted = [...group].sort(
      (a, b) => a.transactionDate.getTime() - b.transactionDate.getTime(),
    );
    const intervals: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const diff =
        (sorted[i].transactionDate.getTime() -
          sorted[i - 1].transactionDate.getTime()) /
        (1000 * 60 * 60 * 24);
      intervals.push(Math.round(diff));
    }
    return intervals;
  }

  detectCycle(
    intervals: number[],
  ): {
    billingCycle: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
    expectedDays: number;
  } | null {
    const avgInterval =
      intervals.reduce((a, b) => a + b, 0) / intervals.length;

    const cycles: {
      billingCycle: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
      expectedDays: number;
      tolerance: number;
    }[] = [
      { billingCycle: 'WEEKLY', expectedDays: 7, tolerance: 3 },
      { billingCycle: 'MONTHLY', expectedDays: 30, tolerance: 5 },
      { billingCycle: 'QUARTERLY', expectedDays: 90, tolerance: 10 },
      { billingCycle: 'YEARLY', expectedDays: 365, tolerance: 20 },
    ];

    for (const cycle of cycles) {
      if (Math.abs(avgInterval - cycle.expectedDays) <= cycle.tolerance) {
        const matchCount = intervals.filter(
          (i) => Math.abs(i - cycle.expectedDays) <= cycle.tolerance,
        ).length;
        if (matchCount / intervals.length >= 0.6) {
          return {
            billingCycle: cycle.billingCycle,
            expectedDays: cycle.expectedDays,
          };
        }
      }
    }

    return null;
  }

  computeScore(intervals: number[], expectedDays: number): number {
    if (intervals.length === 0) return 0;

    const deviations = intervals.map(
      (i) => Math.abs(i - expectedDays) / expectedDays,
    );
    const avgDeviation =
      deviations.reduce((a, b) => a + b, 0) / deviations.length;

    const regularityScore = Math.max(0, 1 - avgDeviation);
    const countBonus = Math.min(1, intervals.length / 6);

    return regularityScore * 0.7 + countBonus * 0.3;
  }

  pickBestName(descriptions: string[]): string {
    const freq = new Map<string, number>();
    for (const d of descriptions) {
      const normalized = d.trim();
      freq.set(normalized, (freq.get(normalized) || 0) + 1);
    }
    let best = descriptions[0];
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
