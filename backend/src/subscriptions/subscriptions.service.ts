import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { Prisma } from '@prisma/client';
import type { SubscriptionSuggestion } from '../transactions/transactions-analysis.service';

@Injectable()
export class SubscriptionsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateSubscriptionDto) {
    return this.prisma.subscription.create({
      data: {
        userId,
        name: dto.name,
        description: dto.description,
        amount: new Prisma.Decimal(dto.amount),
        currency: dto.currency || 'RUB',
        billingCycle: dto.billingCycle || 'MONTHLY',
        nextBilling: new Date(dto.nextBilling),
        category: dto.category,
        isActive: dto.isActive ?? true,
        logoUrl: dto.logoUrl,
      },
    });
  }

  async createFromSuggestion(userId: string, suggestion: SubscriptionSuggestion) {
    return this.prisma.subscription.create({
      data: {
        userId,
        name: suggestion.name,
        amount: new Prisma.Decimal(suggestion.amount),
        currency: suggestion.currency,
        billingCycle: suggestion.billingCycle,
        nextBilling: new Date(suggestion.nextBilling),
        isActive: true,
      },
    });
  }

  async findAllByUser(userId: string) {
    return this.prisma.subscription.findMany({
      where: { userId },
      orderBy: { nextBilling: 'asc' },
    });
  }

  async findOne(id: string, userId: string) {
    const sub = await this.prisma.subscription.findFirst({
      where: { id, userId },
    });
    if (!sub) throw new NotFoundException('Subscription not found');
    return sub;
  }

  async update(id: string, userId: string, dto: UpdateSubscriptionDto) {
    await this.findOne(id, userId);
    return this.prisma.subscription.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.amount !== undefined && {
          amount: new Prisma.Decimal(dto.amount),
        }),
        ...(dto.currency !== undefined && { currency: dto.currency }),
        ...(dto.billingCycle !== undefined && { billingCycle: dto.billingCycle }),
        ...(dto.nextBilling !== undefined && {
          nextBilling: new Date(dto.nextBilling),
        }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
      },
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    return this.prisma.subscription.delete({ where: { id } });
  }
}
