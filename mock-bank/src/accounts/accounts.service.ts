import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAccountDto } from './dto/create-account.dto';

@Injectable()
export class AccountsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateAccountDto) {
    return this.prisma.account.create({
      data: {
        userId,
        name: dto.name,
        currency: dto.currency || 'RUB',
        initialBalance: dto.initialBalance ?? 0,
      },
    });
  }

  async findAllByUser(userId: string) {
    const accounts = await this.prisma.account.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        transactions: {
          select: { amount: true },
        },
      },
    });

    return accounts.map((acc) => {
      const txSum = acc.transactions.reduce((sum, t) => sum + t.amount, 0);
      return {
        id: acc.id,
        userId: acc.userId,
        name: acc.name,
        currency: acc.currency,
        balance: acc.initialBalance + txSum,
        initialBalance: acc.initialBalance,
        createdAt: acc.createdAt,
      };
    });
  }

  async findOneOwned(accountId: string, userId: string) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      include: {
        transactions: {
          select: { amount: true },
        },
      },
    });
    if (!account) throw new NotFoundException('Account not found');
    if (account.userId !== userId) throw new ForbiddenException('Access denied');

    const txSum = account.transactions.reduce((sum, t) => sum + t.amount, 0);
    return {
      ...account,
      balance: account.initialBalance + txSum,
      transactions: undefined,
    };
  }

  async getAccountSummary(accountId: string, userId: string) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      include: {
        transactions: true,
      },
    });
    if (!account) throw new NotFoundException('Account not found');
    if (account.userId !== userId) throw new ForbiddenException('Access denied');

    const transactions = account.transactions;
    const totalIncome = transactions
      .filter((t) => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = transactions
      .filter((t) => t.amount < 0)
      .reduce((sum, t) => sum + t.amount, 0);
    const txSum = transactions.reduce((sum, t) => sum + t.amount, 0);

    // Group expenses by category
    const expenseByCategory: Record<string, number> = {};
    for (const tx of transactions) {
      if (tx.amount < 0) {
        expenseByCategory[tx.category] =
          (expenseByCategory[tx.category] || 0) + Math.abs(tx.amount);
      }
    }

    return {
      accountId: account.id,
      accountName: account.name,
      currency: account.currency,
      balance: account.initialBalance + txSum,
      initialBalance: account.initialBalance,
      totalIncome,
      totalExpense: Math.abs(totalExpense),
      transactionCount: transactions.length,
      expenseByCategory,
    };
  }
}
