import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { BillingCycle } from '@prisma/client';
import { categorize, type SubscriptionCategory } from './utils/category.utils';
import { toMonthly, toYearly, periodToDays, round2, toMonthKey } from './utils/period.utils';

// ─────────────────────────────────────────────────────────
// Existing DTO (keep for backward compat)
// ─────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────
// New DTOs
// ─────────────────────────────────────────────────────────

export interface OverviewDto {
  mrr: number;
  arr: number;
  activeCount: number;
  upcomingCount: number;
  trend: {
    currentMonth: number;
    prevMonth: number;
    changePct: number;
  };
}

export interface CategoryItemDto {
  category: SubscriptionCategory;
  total: number;
  count: number;
  percent: number;
}

export interface ServiceItemDto {
  merchant: string;
  monthlyAmount: number;
  yearlyAmount: number;
  periodType: BillingCycle;
  category: SubscriptionCategory;
}

export interface PeriodItemDto {
  period: string;
  total: number;
  count: number;
  momGrowthPct: number | null;
}

export interface ScoreItemDto {
  subscriptionId: string;
  merchant: string;
  valueScore: number;
  churnRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  label: 'Essential' | 'Valuable' | 'Marginal' | 'Low Value';
  monthlyAmount: number;
  periodType: BillingCycle;
  lastChargeDate: string;
}

export interface RecommendationDto {
  type: 'CANCEL' | 'REVIEW' | 'DOWNGRADE' | 'CONSOLIDATE';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  merchant: string;
  currentCost: number;
  potentialSavings: number;
  reason: string;
}

// ─────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  // ── Existing endpoint (backward compat) ──────────────────

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

    scored.sort((a, b) => b.monthlyEquivalent - a.monthlyEquivalent);
    const topSubscriptions = scored.slice(0, 5);

    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const upcoming = activeSubs
      .filter((s) => s.nextExpectedCharge >= now && s.nextExpectedCharge <= in7Days)
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

  // ── Overview ─────────────────────────────────────────────

  async getOverview(userId: string): Promise<OverviewDto> {
    const activeSubs = await this.prisma.detectedSubscription.findMany({
      where: { userId, isActive: true },
    });

    let mrr = 0;
    for (const s of activeSubs) {
      mrr += toMonthly(s.amount.toNumber(), s.periodType);
    }
    mrr = round2(mrr);

    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const upcomingCount = activeSubs.filter(
      (s) => s.nextExpectedCharge >= now && s.nextExpectedCharge <= in7Days,
    ).length;

    // Trend: sum of imported transactions this month vs previous month
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [thisMonthTxs, lastMonthTxs] = await Promise.all([
      this.prisma.importedTransaction.aggregate({
        where: { userId, occurredAt: { gte: startOfThisMonth } },
        _sum: { amount: true },
      }),
      this.prisma.importedTransaction.aggregate({
        where: {
          userId,
          occurredAt: { gte: startOfLastMonth, lt: startOfThisMonth },
        },
        _sum: { amount: true },
      }),
    ]);

    const currentMonth = round2(Number(thisMonthTxs._sum.amount ?? 0));
    const prevMonth = round2(Number(lastMonthTxs._sum.amount ?? 0));
    const changePct =
      prevMonth === 0
        ? 0
        : round2(((currentMonth - prevMonth) / prevMonth) * 100);

    return {
      mrr,
      arr: round2(mrr * 12),
      activeCount: activeSubs.length,
      upcomingCount,
      trend: { currentMonth, prevMonth, changePct },
    };
  }

  // ── By Category ──────────────────────────────────────────

  async getByCategory(userId: string): Promise<CategoryItemDto[]> {
    const activeSubs = await this.prisma.detectedSubscription.findMany({
      where: { userId, isActive: true },
    });

    const categoryMap = new Map<SubscriptionCategory, { total: number; count: number }>();

    for (const sub of activeSubs) {
      const cat = categorize(sub.merchant);
      const monthly = toMonthly(sub.amount.toNumber(), sub.periodType);
      const existing = categoryMap.get(cat) ?? { total: 0, count: 0 };
      categoryMap.set(cat, { total: existing.total + monthly, count: existing.count + 1 });
    }

    const totalAll = Array.from(categoryMap.values()).reduce((s, v) => s + v.total, 0);

    return Array.from(categoryMap.entries())
      .map(([category, { total, count }]) => ({
        category,
        total: round2(total),
        count,
        percent: totalAll > 0 ? round2((total / totalAll) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }

  // ── By Service ───────────────────────────────────────────

  async getByService(userId: string, limit = 10): Promise<ServiceItemDto[]> {
    const activeSubs = await this.prisma.detectedSubscription.findMany({
      where: { userId, isActive: true },
      orderBy: { amount: 'desc' },
    });

    return activeSubs
      .map((sub) => {
        const amount = sub.amount.toNumber();
        return {
          merchant: sub.merchant,
          monthlyAmount: round2(toMonthly(amount, sub.periodType)),
          yearlyAmount: round2(toYearly(amount, sub.periodType)),
          periodType: sub.periodType,
          category: categorize(sub.merchant),
        };
      })
      .sort((a, b) => b.monthlyAmount - a.monthlyAmount)
      .slice(0, limit);
  }

  // ── By Period (12 months) ────────────────────────────────

  async getByPeriod(userId: string, granularity: 'month' | 'week' = 'month'): Promise<PeriodItemDto[]> {
    const now = new Date();
    const from = new Date(now.getFullYear() - 1, now.getMonth(), 1);

    const txs = await this.prisma.importedTransaction.findMany({
      where: { userId, occurredAt: { gte: from } },
      select: { occurredAt: true, amount: true },
      orderBy: { occurredAt: 'asc' },
    });

    // Group by period key
    const periodMap = new Map<string, { total: number; count: number }>();

    for (const tx of txs) {
      const key =
        granularity === 'month'
          ? toMonthKey(tx.occurredAt)
          : `${tx.occurredAt.getFullYear()}-W${getISOWeek(tx.occurredAt)}`;

      const existing = periodMap.get(key) ?? { total: 0, count: 0 };
      periodMap.set(key, {
        total: existing.total + Number(tx.amount),
        count: existing.count + 1,
      });
    }

    // Fill missing months (so chart doesn't have gaps)
    if (granularity === 'month') {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = toMonthKey(d);
        if (!periodMap.has(key)) periodMap.set(key, { total: 0, count: 0 });
      }
    }

    const sorted = Array.from(periodMap.entries()).sort(([a], [b]) => a.localeCompare(b));

    return sorted.map(([period, { total, count }], idx) => {
      const prev = idx > 0 ? sorted[idx - 1][1].total : null;
      const momGrowthPct =
        prev !== null && prev > 0
          ? round2(((total - prev) / prev) * 100)
          : null;

      return { period, total: round2(total), count, momGrowthPct };
    });
  }

  // ── Scores ───────────────────────────────────────────────

  async getScores(userId: string): Promise<ScoreItemDto[]> {
    const activeSubs = await this.prisma.detectedSubscription.findMany({
      where: { userId, isActive: true },
    });

    if (activeSubs.length === 0) return [];

    const avgMonthly =
      activeSubs.reduce((s, sub) => s + toMonthly(sub.amount.toNumber(), sub.periodType), 0) /
      activeSubs.length;

    const now = new Date();

    return activeSubs.map((sub) => {
      const amount = sub.amount.toNumber();
      const monthly = toMonthly(amount, sub.periodType);
      const expectedDays = periodToDays(sub.periodType);

      // Recency: how recent is the last charge compared to expected period
      const daysSinceCharge = (now.getTime() - sub.lastChargeDate.getTime()) / 86400000;
      const recencyRatio = Math.max(0, 1 - daysSinceCharge / expectedDays);
      const recencyScore = Math.round(recencyRatio * 30);

      // Frequency: how many transactions
      const freqScore = Math.min(30, sub.transactionCount * 5);

      // Cost efficiency: cheaper subs score higher (inverse cost share)
      const costShare = avgMonthly > 0 ? monthly / (avgMonthly * activeSubs.length) : 0;
      const costScore = Math.round(Math.max(0, 20 - costShare * 20));

      // Confidence
      const confidenceScore = Math.round(sub.confidence * 20);

      const valueScore = Math.min(100, recencyScore + freqScore + costScore + confidenceScore);

      let label: ScoreItemDto['label'];
      if (valueScore >= 75) label = 'Essential';
      else if (valueScore >= 50) label = 'Valuable';
      else if (valueScore >= 25) label = 'Marginal';
      else label = 'Low Value';

      // Churn risk: how overdue is the next charge
      const daysOverdue = (now.getTime() - sub.nextExpectedCharge.getTime()) / 86400000;
      const overdueRatio = Math.max(0, daysOverdue / expectedDays);
      let churnScore = Math.round(overdueRatio * 50);
      if (sub.transactionCount < 3) churnScore += 20;
      if (sub.confidence < 0.6) churnScore += 15;
      churnScore = Math.min(100, churnScore);

      let churnRisk: ScoreItemDto['churnRisk'];
      if (churnScore < 30) churnRisk = 'LOW';
      else if (churnScore < 60) churnRisk = 'MEDIUM';
      else churnRisk = 'HIGH';

      return {
        subscriptionId: sub.id,
        merchant: sub.merchant,
        valueScore,
        churnRisk,
        label,
        monthlyAmount: round2(monthly),
        periodType: sub.periodType,
        lastChargeDate: sub.lastChargeDate.toISOString(),
      };
    }).sort((a, b) => b.valueScore - a.valueScore);
  }

  // ── Recommendations ──────────────────────────────────────

  async getRecommendations(userId: string): Promise<RecommendationDto[]> {
    const activeSubs = await this.prisma.detectedSubscription.findMany({
      where: { userId, isActive: true },
    });

    if (activeSubs.length === 0) return [];

    const now = new Date();
    const results: RecommendationDto[] = [];

    const monthlyAmounts = activeSubs.map((s) =>
      toMonthly(s.amount.toNumber(), s.periodType),
    );
    const avgMonthly =
      monthlyAmounts.reduce((a, b) => a + b, 0) / monthlyAmounts.length;

    // Detect duplicates by normalizedMerchant
    const merchantCount = new Map<string, number>();
    for (const sub of activeSubs) {
      merchantCount.set(sub.normalizedMerchant, (merchantCount.get(sub.normalizedMerchant) ?? 0) + 1);
    }

    for (const sub of activeSubs) {
      const amount = sub.amount.toNumber();
      const monthly = toMonthly(amount, sub.periodType);
      const expectedDays = periodToDays(sub.periodType);

      // Rule 1: CANCEL — next charge is > 2 periods overdue
      const daysOverdue = (now.getTime() - sub.nextExpectedCharge.getTime()) / 86400000;
      if (daysOverdue > expectedDays * 2) {
        results.push({
          type: 'CANCEL',
          priority: 'HIGH',
          merchant: sub.merchant,
          currentCost: round2(monthly),
          potentialSavings: round2(monthly * 12),
          reason: `Списаний не было более ${Math.round(daysOverdue)} дней. Возможно, подписка не используется.`,
        });
        continue;
      }

      // Rule 2: REVIEW — cost > 3x average
      if (monthly > avgMonthly * 3 && activeSubs.length > 1) {
        results.push({
          type: 'REVIEW',
          priority: 'MEDIUM',
          merchant: sub.merchant,
          currentCost: round2(monthly),
          potentialSavings: round2((monthly - avgMonthly * 2) * 12),
          reason: `Стоимость в ${(monthly / avgMonthly).toFixed(1)}× выше среднего. Рассмотрите более дешёвый тариф.`,
        });
      }

      // Rule 3: DOWNGRADE — monthly billing for 6+ months, suggest yearly
      if (sub.periodType === 'MONTHLY' && sub.transactionCount >= 6) {
        const yearlySaving = round2(monthly * 12 * 0.15);
        results.push({
          type: 'DOWNGRADE',
          priority: 'LOW',
          merchant: sub.merchant,
          currentCost: round2(monthly * 12),
          potentialSavings: yearlySaving,
          reason: `Платите ежемесячно уже ${sub.transactionCount} мес. Годовой план обычно дешевле на ~15%.`,
        });
      }

      // Rule 4: CONSOLIDATE — duplicate by normalizedMerchant
      if ((merchantCount.get(sub.normalizedMerchant) ?? 0) > 1) {
        results.push({
          type: 'CONSOLIDATE',
          priority: 'HIGH',
          merchant: sub.merchant,
          currentCost: round2(monthly),
          potentialSavings: round2(monthly),
          reason: `Найдено несколько подписок от ${sub.merchant}. Возможно дублирование.`,
        });
      }
    }

    // Sort: HIGH first, then by potentialSavings desc
    const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    results.sort((a, b) => {
      const po = order[a.priority] - order[b.priority];
      return po !== 0 ? po : b.potentialSavings - a.potentialSavings;
    });

    return results;
  }
}

// ── Helpers ───────────────────────────────────────────────

function getISOWeek(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
