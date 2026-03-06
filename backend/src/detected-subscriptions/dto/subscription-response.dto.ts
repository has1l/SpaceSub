import { BillingCycle } from '@prisma/client';

export class SubscriptionResponseDto {
  id: string;
  merchant: string;
  amount: number;
  currency: string;
  periodType: BillingCycle;
  lastChargeDate: string;
  nextExpectedCharge: string;
  isActive: boolean;
  confidence: number;
  transactionCount: number;
}

export class SubscriptionSummaryDto {
  activeCount: number;
  monthlyTotal: number;
  yearlyTotal: number;
  upcomingNext7Days: SubscriptionResponseDto[];
}
