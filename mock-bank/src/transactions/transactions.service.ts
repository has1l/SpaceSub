import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { TransactionType } from '@prisma/client';

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  async create(accountId: string, dto: CreateTransactionDto) {
    const type = dto.type || (dto.amount >= 0 ? TransactionType.INCOME : TransactionType.EXPENSE);

    // Enforce sign convention: EXPENSE → negative, INCOME → positive
    let amount = dto.amount;
    if (type === TransactionType.EXPENSE && amount > 0) {
      amount = -amount;
    } else if (type === TransactionType.INCOME && amount < 0) {
      amount = -amount;
    }

    return this.prisma.transaction.create({
      data: {
        accountId,
        date: new Date(dto.date),
        amount,
        currency: dto.currency || 'RUB',
        description: dto.description,
        merchant: dto.merchant || null,
        type,
        category: dto.category || 'OTHER',
      },
    });
  }

  async findByAccount(accountId: string, from?: string, to?: string) {
    const where: any = { accountId };
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }
    return this.prisma.transaction.findMany({
      where,
      orderBy: { date: 'desc' },
    });
  }

  async findAllByUser(userId: string) {
    return this.prisma.transaction.findMany({
      where: { account: { userId } },
      orderBy: { date: 'desc' },
      include: { account: { select: { id: true, name: true } } },
    });
  }
}
