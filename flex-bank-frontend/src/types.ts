export interface User {
  id: string;
  email: string;
  name: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface Account {
  id: string;
  userId: string;
  name: string;
  currency: string;
  balance: number;
  initialBalance: number;
  createdAt: string;
}

export interface Transaction {
  id: string;
  accountId: string;
  date: string;
  amount: number;
  currency: string;
  description: string;
  merchant: string | null;
  type: 'EXPENSE' | 'INCOME' | 'TRANSFER';
  category: string;
  createdAt: string;
  account?: { id: string; name: string };
}

export type TransactionCategory =
  | 'SUBSCRIPTIONS'
  | 'SUPERMARKETS'
  | 'TRANSFERS'
  | 'DIGITAL_SERVICES'
  | 'INVESTMENTS'
  | 'TRANSPORT'
  | 'RESTAURANTS'
  | 'HEALTH'
  | 'OTHER';

export const CATEGORY_LABELS: Record<TransactionCategory, string> = {
  SUBSCRIPTIONS: 'Подписки',
  SUPERMARKETS: 'Супермаркеты',
  TRANSFERS: 'Переводы',
  DIGITAL_SERVICES: 'Цифровые сервисы',
  INVESTMENTS: 'Инвестиции',
  TRANSPORT: 'Транспорт',
  RESTAURANTS: 'Рестораны',
  HEALTH: 'Здоровье',
  OTHER: 'Другое',
};

export const CATEGORY_COLORS: Record<TransactionCategory, string> = {
  SUBSCRIPTIONS: '#A100FF',
  SUPERMARKETS: '#00D4AA',
  TRANSFERS: '#3B82F6',
  DIGITAL_SERVICES: '#FF00C8',
  INVESTMENTS: '#FFB800',
  TRANSPORT: '#00B4D8',
  RESTAURANTS: '#FF6B6B',
  HEALTH: '#10B981',
  OTHER: '#6B7280',
};

