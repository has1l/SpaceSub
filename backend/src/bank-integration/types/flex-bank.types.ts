/** Flex Bank API response types — will be used in step 2/3 for real sync */

export interface FlexBankAccount {
  id: string;
  name: string;
  currency: string;
  balance: number;
}

export interface FlexBankTransaction {
  id: string;
  accountId: string;
  date: string;
  amount: number;
  currency: string;
  description: string;
}

export interface FlexBankAccountsResponse {
  accounts: FlexBankAccount[];
}

export interface FlexBankTransactionsResponse {
  transactions: FlexBankTransaction[];
}
