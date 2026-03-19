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
}

export interface SubscriptionSummary {
  activeCount: number;
  monthlyTotal: number;
  yearlyTotal: number;
  upcomingNext7Days: DetectedSubscription[];
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
};
