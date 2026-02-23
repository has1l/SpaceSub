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
  createdAt: string;
}

export interface Transaction {
  id: string;
  accountId: string;
  date: string;
  amount: number;
  currency: string;
  description: string;
  createdAt: string;
  account?: { id: string; name: string };
}
