import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { type AxiosInstance } from 'axios';
import type {
  FlexBankAccount,
  FlexBankTransaction,
  FlexBankRecurringPayment,
  FlexBankCancelResult,
} from '../types/flex-bank.types';

@Injectable()
export class FlexBankClient {
  private http: AxiosInstance;

  constructor(private configService: ConfigService) {
    const baseURL =
      this.configService.get('FLEX_BANK_BASE_URL') || 'http://localhost:3001';
    const timeout = Number(
      this.configService.get('FLEX_BANK_TIMEOUT_MS') || 8000,
    );

    this.http = axios.create({ baseURL, timeout });
  }

  async getAccounts(token: string): Promise<FlexBankAccount[]> {
    const { data } = await this.http.get<FlexBankAccount[]>(
      '/api/v1/accounts',
      { headers: { Authorization: `Bearer ${token}` } },
    );
    return data;
  }

  async getTransactions(
    token: string,
    accountId: string,
    from?: string,
    to?: string,
  ): Promise<FlexBankTransaction[]> {
    const params: Record<string, string> = {};
    if (from) params.from = from;
    if (to) params.to = to;

    const { data } = await this.http.get<FlexBankTransaction[]>(
      `/api/v1/accounts/${accountId}/transactions`,
      { headers: { Authorization: `Bearer ${token}` }, params },
    );
    return data;
  }

  async getRecurringPayments(
    token: string,
  ): Promise<FlexBankRecurringPayment[]> {
    const { data } = await this.http.get<FlexBankRecurringPayment[]>(
      '/api/v1/recurring-payments',
      { headers: { Authorization: `Bearer ${token}` } },
    );
    return data;
  }

  async cancelRecurringPayment(
    token: string,
    id: string,
  ): Promise<FlexBankCancelResult> {
    const { data } = await this.http.post<FlexBankCancelResult>(
      `/api/v1/recurring-payments/${id}/cancel`,
      {},
      { headers: { Authorization: `Bearer ${token}` } },
    );
    return data;
  }
}
