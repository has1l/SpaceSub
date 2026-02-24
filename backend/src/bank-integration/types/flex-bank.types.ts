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
  mcc: string | null;
}
