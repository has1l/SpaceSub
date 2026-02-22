import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ImportTransactionsDto } from './dto/import-transactions.dto';
import { Prisma } from '@prisma/client';

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
    return this.prisma.transaction.findMany({
      where: { userId },
      orderBy: { transactionDate: 'desc' },
    });
  }

  async linkToSubscription(transactionIds: string[], subscriptionId: string) {
    return this.prisma.transaction.updateMany({
      where: { id: { in: transactionIds } },
      data: { subscriptionId },
    });
  }
}
