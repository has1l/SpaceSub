import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { BillingCycle } from '@prisma/client';
import { categorize, type SubscriptionCategory } from './utils/category.utils';
import { toMonthly, toYearly, periodToDays, round2, toMonthKey } from './utils/period.utils';

// ─────────────────────────────────────────────────────────
// Existing DTO (backward compat)
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
  periodTotal: number;
  trend: {
    currentMonth: number;
    prevMonth: number;
    changePct: number;
  };
}

export interface CategoryItemDto {
  category: SubscriptionCategory;
  color: string;
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
  color: string;
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
// Category color palette (vibrant, dark-theme safe)
// ─────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  'Развлечения':      '#a855f7',
  'Музыка':           '#ec4899',
  'Продуктивность':   '#0ea5e9',
  'Облако и хостинг': '#06b6d4',
  'Безопасность':     '#00d4aa',
  'Образование':      '#f59e0b',
  'Игры':             '#8b5cf6',
  'Фитнес':           '#ef4444',
  'Новости':          '#64748b',
  'Подписки':         '#a855f7',
  'Супермаркеты':     '#22c55e',
  'Переводы':         '#3b82f6',
  'Цифровые услуги':  '#06b6d4',
  'Инвестиции':       '#f59e0b',
  'Транспорт':        '#f97316',
  'Рестораны':        '#ef4444',
  'Здоровье':         '#ec4899',
  'Другое':           '#475569',
};

/** Map bank transaction categories to display names */
function bankCategoryToDisplay(bankCategory: string): SubscriptionCategory {
  const map: Record<string, string> = {
    SUBSCRIPTIONS:     'Подписки',
    SUPERMARKETS:      'Супермаркеты',
    TRANSFERS:         'Переводы',
    DIGITAL_SERVICES:  'Цифровые услуги',
    INVESTMENTS:       'Инвестиции',
    TRANSPORT:         'Транспорт',
    RESTAURANTS:       'Рестораны',
    HEALTH:            'Здоровье',
    OTHER:             'Другое',
  };
  return (map[bankCategory] ?? 'Другое') as SubscriptionCategory;
}

function categoryColor(cat: string): string {
  return CATEGORY_COLORS[cat] ?? '#475569';
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
      topSubscriptions: scored.slice(0, 5),
      upcomingCharges: upcoming,
    };
  }

  // ── Overview ─────────────────────────────────────────────

  async getOverview(userId: string, from?: Date, to?: Date): Promise<OverviewDto> {
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

    // Period total: sum subscription costs scaled to the selected period
    const periodFrom = from ?? new Date(now.getFullYear(), now.getMonth(), 1);
    const periodTo = to ?? now;
    const periodDays = Math.max(1, (periodTo.getTime() - periodFrom.getTime()) / 86400000);

    let periodTotal = 0;
    for (const s of activeSubs) {
      const daily = toMonthly(s.amount.toNumber(), s.periodType) / 30;
      periodTotal += daily * periodDays;
    }

    // Trend: compare current month MRR vs previous month
    // (subscriptions don't change much month to month, so use MRR as proxy)
    const currentMonth = mrr;
    const prevMonth = mrr; // same subs, stable estimate
    const changePct = 0;

    return {
      mrr,
      arr: round2(mrr * 12),
      activeCount: activeSubs.length,
      upcomingCount,
      periodTotal: round2(periodTotal),
      trend: { currentMonth, prevMonth, changePct },
    };
  }

  // ── By Category ──────────────────────────────────────────

  async getByCategory(userId: string, from?: Date, to?: Date): Promise<CategoryItemDto[]> {
    const activeSubs = await this.prisma.detectedSubscription.findMany({
      where: { userId, isActive: true },
    });

    const categoryMap = new Map<string, { color: string; total: number; count: number }>();
    for (const sub of activeSubs) {
      const cat = categorize(sub.merchant);
      const color = categoryColor(cat);
      const monthly = toMonthly(sub.amount.toNumber(), sub.periodType);
      const existing = categoryMap.get(cat) ?? { color, total: 0, count: 0 };
      categoryMap.set(cat, { color, total: existing.total + monthly, count: existing.count + 1 });
    }

    const totalAll = Array.from(categoryMap.values()).reduce((s, v) => s + v.total, 0);
    return Array.from(categoryMap.entries())
      .map(([category, { color, total, count }]) => ({
        category: category as SubscriptionCategory,
        color,
        total: round2(total),
        count,
        percent: totalAll > 0 ? round2((total / totalAll) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }

  // ── By Service ───────────────────────────────────────────

  async getByService(userId: string, limit = 10, from?: Date, to?: Date): Promise<ServiceItemDto[]> {
    const activeSubs = await this.prisma.detectedSubscription.findMany({
      where: { userId, isActive: true },
      orderBy: { amount: 'desc' },
    });

    let results = activeSubs.map((sub) => {
      const amount = sub.amount.toNumber();
      const cat = categorize(sub.merchant);
      return {
        merchant: sub.merchant,
        monthlyAmount: round2(toMonthly(amount, sub.periodType)),
        yearlyAmount: round2(toYearly(amount, sub.periodType)),
        periodType: sub.periodType,
        category: cat,
        color: categoryColor(cat),
      };
    });

    return results.sort((a, b) => b.monthlyAmount - a.monthlyAmount).slice(0, limit);
  }

  // ── By Period ────────────────────────────────────────────

  async getByPeriod(
    userId: string,
    granularity: 'month' | 'week' = 'month',
    from?: Date,
    to?: Date,
  ): Promise<PeriodItemDto[]> {
    const now = new Date();
    const rangeFrom = from ?? new Date(now.getFullYear() - 1, now.getMonth(), 1);
    const rangeTo = to ?? now;

    // Use only subscription transactions (match detected subscription merchants)
    const activeSubs = await this.prisma.detectedSubscription.findMany({
      where: { userId },
      select: { merchant: true, normalizedMerchant: true },
    });
    const subMerchants = activeSubs.map((s) => s.merchant);

    const txs = await this.prisma.importedTransaction.findMany({
      where: {
        userId,
        amount: { lt: 0 },
        occurredAt: { gte: rangeFrom, lte: rangeTo },
        merchant: { in: subMerchants.length > 0 ? subMerchants : ['__none__'] },
      },
      select: { occurredAt: true, amount: true },
      orderBy: { occurredAt: 'asc' },
    });

    const periodMap = new Map<string, { total: number; count: number }>();

    for (const tx of txs) {
      const key =
        granularity === 'month'
          ? toMonthKey(tx.occurredAt)
          : `${tx.occurredAt.getFullYear()}-W${getISOWeek(tx.occurredAt)}`;

      const existing = periodMap.get(key) ?? { total: 0, count: 0 };
      periodMap.set(key, { total: existing.total + Math.abs(Number(tx.amount)), count: existing.count + 1 });
    }

    // Fill missing months (granularity=month only)
    if (granularity === 'month') {
      let cursor = new Date(rangeFrom.getFullYear(), rangeFrom.getMonth(), 1);
      while (cursor <= rangeTo) {
        const key = toMonthKey(cursor);
        if (!periodMap.has(key)) periodMap.set(key, { total: 0, count: 0 });
        cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      }
    }

    const sorted = Array.from(periodMap.entries()).sort(([a], [b]) => a.localeCompare(b));

    return sorted.map(([period, { total, count }], idx) => {
      const prev = idx > 0 ? sorted[idx - 1][1].total : null;
      const momGrowthPct =
        prev !== null && prev > 0 ? round2(((total - prev) / prev) * 100) : null;
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

    return activeSubs
      .map((sub) => {
        const amount = sub.amount.toNumber();
        const monthly = toMonthly(amount, sub.periodType);
        const expectedDays = periodToDays(sub.periodType);

        const daysSinceCharge = (now.getTime() - sub.lastChargeDate.getTime()) / 86400000;
        const recencyRatio = Math.max(0, 1 - daysSinceCharge / expectedDays);
        const recencyScore = Math.round(recencyRatio * 30);
        const freqScore = Math.min(30, sub.transactionCount * 5);
        const costShare = avgMonthly > 0 ? monthly / (avgMonthly * activeSubs.length) : 0;
        const costScore = Math.round(Math.max(0, 20 - costShare * 20));
        const confidenceScore = Math.round(sub.confidence * 20);

        const valueScore = Math.min(100, recencyScore + freqScore + costScore + confidenceScore);

        let label: ScoreItemDto['label'];
        if (valueScore >= 75) label = 'Essential';
        else if (valueScore >= 50) label = 'Valuable';
        else if (valueScore >= 25) label = 'Marginal';
        else label = 'Low Value';

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
      })
      .sort((a, b) => b.valueScore - a.valueScore);
  }

  // ── Recommendations ──────────────────────────────────────

  async getRecommendations(userId: string): Promise<RecommendationDto[]> {
    const activeSubs = await this.prisma.detectedSubscription.findMany({
      where: { userId, isActive: true },
    });

    if (activeSubs.length === 0) return [];

    const now = new Date();
    const results: RecommendationDto[] = [];

    const monthlyAmounts = activeSubs.map((s) => toMonthly(s.amount.toNumber(), s.periodType));
    const avgMonthly = monthlyAmounts.reduce((a, b) => a + b, 0) / monthlyAmounts.length;

    const merchantCount = new Map<string, number>();
    for (const sub of activeSubs) {
      merchantCount.set(sub.normalizedMerchant, (merchantCount.get(sub.normalizedMerchant) ?? 0) + 1);
    }

    for (const sub of activeSubs) {
      const amount = sub.amount.toNumber();
      const monthly = toMonthly(amount, sub.periodType);
      const expectedDays = periodToDays(sub.periodType);
      const daysOverdue = (now.getTime() - sub.nextExpectedCharge.getTime()) / 86400000;

      if (daysOverdue > expectedDays * 2) {
        results.push({
          type: 'CANCEL',
          priority: 'HIGH',
          merchant: sub.merchant,
          currentCost: round2(monthly),
          potentialSavings: round2(monthly * 12),
          reason: `Списаний не было более ${Math.round(daysOverdue)} дней`,
        });
        continue;
      }

      if (monthly > avgMonthly * 3 && activeSubs.length > 1) {
        results.push({
          type: 'REVIEW',
          priority: 'MEDIUM',
          merchant: sub.merchant,
          currentCost: round2(monthly),
          potentialSavings: round2((monthly - avgMonthly * 2) * 12),
          reason: `В ${(monthly / avgMonthly).toFixed(1)}× дороже среднего`,
        });
      }

      if (sub.periodType === 'MONTHLY' && sub.transactionCount >= 6) {
        results.push({
          type: 'DOWNGRADE',
          priority: 'LOW',
          merchant: sub.merchant,
          currentCost: round2(monthly * 12),
          potentialSavings: round2(monthly * 12 * 0.15),
          reason: `${sub.transactionCount} мес подряд — годовой план ~−15%`,
        });
      }

      if ((merchantCount.get(sub.normalizedMerchant) ?? 0) > 1) {
        results.push({
          type: 'CONSOLIDATE',
          priority: 'HIGH',
          merchant: sub.merchant,
          currentCost: round2(monthly),
          potentialSavings: round2(monthly),
          reason: 'Найдено дублирование подписки',
        });
      }
    }

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
