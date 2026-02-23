import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  async create(accountId: string, dto: CreateTransactionDto) {
    return this.prisma.transaction.create({
      data: {
        accountId,
        date: new Date(dto.date),
        amount: dto.amount,
        currency: dto.currency || 'RUB',
        description: dto.description,
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
