import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ImportTransactionsDto } from './dto/import-transactions.dto';
import { Prisma, type Transaction } from '@prisma/client';

function toDto(tx: Transaction) {
  return {
    ...tx,
    amount: Number(tx.amount),
  };
}

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  async importTransactions(userId: string, dto: ImportTransactionsDto) {
    const data = dto.transactions.map((t) => ({
      userId,
      amount: new Prisma.Decimal(t.amount),
      currency: t.currency || 'RUB',
      description: t.description,
      source: t.source || null,
      transactionDate: new Date(t.date),
    }));

    const result = await this.prisma.transaction.createMany({ data });
    return { imported: result.count };
  }

  async findAllByUser(userId: string) {
    const txs = await this.prisma.transaction.findMany({
      where: { userId },
      orderBy: { transactionDate: 'desc' },
    });
    return txs.map(toDto);
  }

  async linkToSubscription(transactionIds: string[], subscriptionId: string) {
    return this.prisma.transaction.updateMany({
      where: { id: { in: transactionIds } },
      data: { subscriptionId },
    });
  }
}
