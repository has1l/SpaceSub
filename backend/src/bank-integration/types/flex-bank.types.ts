/** Flex Bank API v1 response types */

export interface FlexBankAccount {
  id: string;
  externalId: string;
  name: string;
  currency: string;
  balance: number;
}

export interface FlexBankTransaction {
  id: string;
  externalId: string;
  accountExternalId: string;
  postedAt: string;
  amount: number;
  currency: string;
  description: string;
  type: 'DEBIT' | 'CREDIT';
  merchant: string | null;
  category: string | null;
  mcc: string | null;
}

export interface FlexBankRecurringPayment {
  id: string;
  merchant: string;
  amount: number;
  currency: string;
  category: string;
  periodDays: number;
  nextChargeDate: string;
  status: 'ACTIVE' | 'CANCELLED';
  cancelledAt: string | null;
  createdAt: string;
  logoUrl: string | null;
}

export interface FlexBankCancelResult {
  id: string;
  status: 'CANCELLED';
  cancelledAt: string;
}
