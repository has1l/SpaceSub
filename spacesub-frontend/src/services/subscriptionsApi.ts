import api from "./api";

export interface DetectedSubscription {
  id: string;
  merchant: string;
  amount: number;
  currency: string;
  periodType: "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";
  lastChargeDate: string;
  nextExpectedCharge: string;
  isActive: boolean;
  confidence: number;
  transactionCount: number;
  logoUrl: string | null;
}

export interface SubscriptionSummary {
  activeCount: number;
  monthlyTotal: number;
  yearlyTotal: number;
  upcomingNext7Days: DetectedSubscription[];
}

export type BillingCycle = "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";

export interface ManualSubscription {
  id: string;
  name: string;
  description?: string;
  amount: number;
  currency: string;
  periodType: BillingCycle;
  nextBilling: string;
  category?: string;
  isActive: boolean;
}

export interface CreateSubscriptionPayload {
  name: string;
  description?: string;
  amount: number;
  currency?: string;
  billingCycle?: BillingCycle;
  nextBilling: string;
  category?: string;
}

export interface UpdateSubscriptionPayload {
  name?: string;
  description?: string;
  amount?: number;
  currency?: string;
  billingCycle?: BillingCycle;
  nextBilling?: string;
  category?: string;
  isActive?: boolean;
}

const BASE = "/detected-subscriptions";

export const subscriptionsApi = {
  getAll: () => api.get<DetectedSubscription[]>(BASE).then((r) => r.data),
  getActive: () =>
    api.get<DetectedSubscription[]>(`${BASE}/active`).then((r) => r.data),
  getUpcoming: () =>
    api.get<DetectedSubscription[]>(`${BASE}/upcoming`).then((r) => r.data),
  getSummary: () =>
    api.get<SubscriptionSummary>(`${BASE}/summary`).then((r) => r.data),
  remove: (id: string) =>
    api.delete(`${BASE}/${id}`),
  cancel: (id: string) =>
    api.post<{ cancelled: boolean; bankPaymentId: string | null }>(`${BASE}/${id}/cancel`).then((r) => r.data),
};

export const manualSubsApi = {
  getAll: () =>
    api.get<ManualSubscription[]>("/subscriptions").then((r) => r.data),
  create: (data: CreateSubscriptionPayload) =>
    api.post<ManualSubscription>("/subscriptions", data).then((r) => r.data),
  update: (id: string, data: UpdateSubscriptionPayload) =>
    api.put<ManualSubscription>(`/subscriptions/${id}`, data).then((r) => r.data),
  remove: (id: string) =>
    api.delete(`/subscriptions/${id}`),
};
