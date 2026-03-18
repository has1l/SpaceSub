import type { BillingCycle } from '@prisma/client';

export function toMonthly(amount: number, period: BillingCycle): number {
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

export function toYearly(amount: number, period: BillingCycle): number {
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

/** How many days is one billing period */
export function periodToDays(period: BillingCycle): number {
  switch (period) {
    case 'WEEKLY':
      return 7;
    case 'MONTHLY':
      return 30;
    case 'QUARTERLY':
      return 91;
    case 'YEARLY':
      return 365;
  }
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Format a Date as "YYYY-MM" */
export function toMonthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
