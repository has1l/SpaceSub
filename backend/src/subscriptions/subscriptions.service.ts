import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { Prisma, type Subscription, type BillingCycle } from '@prisma/client';
import type { SubscriptionSuggestion } from '../transactions/transactions-analysis.service';

function toDto(sub: Subscription) {
  const { billingCycle, amount, ...rest } = sub;
  return {
    ...rest,
    amount: Number(amount),
    periodType: billingCycle,
  };
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-zа-яё0-9]/gi, ' ').replace(/\s+/g, ' ').trim();
}

@Injectable()
export class SubscriptionsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateSubscriptionDto) {
    const billingCycle = (dto.billingCycle || 'MONTHLY') as BillingCycle;
    const amount = dto.amount;
    const currency = dto.currency || 'RUB';
    const nextBilling = new Date(dto.nextBilling);

    const sub = await this.prisma.subscription.create({
      data: {
        userId,
        name: dto.name,
        description: dto.description,
        amount: new Prisma.Decimal(amount),
        currency,
        billingCycle,
        nextBilling,
        category: dto.category,
        isActive: dto.isActive ?? true,
        logoUrl: dto.logoUrl,
      },
    });

    // Sync to DetectedSubscription so analytics/counters pick it up
    const normalizedMerchant = normalize(dto.name);
    await this.prisma.detectedSubscription.upsert({
      where: {
        userId_normalizedMerchant_amount_currency: {
          userId,
          normalizedMerchant,
          amount,
          currency,
        },
      },
      update: {
        merchant: dto.name,
        isActive: dto.isActive ?? true,
        nextExpectedCharge: nextBilling,
        periodType: billingCycle,
        confidence: 1.0,
        logoUrl: dto.logoUrl,
      },
      create: {
        userId,
        merchant: dto.name,
        normalizedMerchant,
        amount: new Prisma.Decimal(amount),
        currency,
        periodType: billingCycle,
        lastChargeDate: new Date(),
        nextExpectedCharge: nextBilling,
        isActive: dto.isActive ?? true,
        confidence: 1.0,
        transactionCount: 0,
        logoUrl: dto.logoUrl,
      },
    });

    return toDto(sub);
  }

  async createFromSuggestion(userId: string, suggestion: SubscriptionSuggestion) {
    const sub = await this.prisma.subscription.create({
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
    return toDto(sub);
  }

  async findAllByUser(userId: string) {
    const subs = await this.prisma.subscription.findMany({
      where: { userId },
      orderBy: { nextBilling: 'asc' },
    });
    return subs.map(toDto);
  }

  async findOne(id: string, userId: string) {
    const sub = await this.prisma.subscription.findFirst({
      where: { id, userId },
    });
    if (!sub) throw new NotFoundException('Subscription not found');
    return toDto(sub);
  }

  async update(id: string, userId: string, dto: UpdateSubscriptionDto) {
    const existing = await this.prisma.subscription.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundException('Subscription not found');

    const sub = await this.prisma.subscription.update({
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

    // Sync to DetectedSubscription
    const oldNorm = normalize(existing.name);
    const newName = dto.name ?? existing.name;
    const newAmount = dto.amount ?? existing.amount.toNumber();
    const newCurrency = dto.currency ?? existing.currency;
    const newNorm = normalize(newName);

    // Find the linked DetectedSubscription by old normalized merchant
    const linked = await this.prisma.detectedSubscription.findFirst({
      where: { userId, normalizedMerchant: oldNorm, currency: existing.currency },
    });

    if (linked) {
      await this.prisma.detectedSubscription.update({
        where: { id: linked.id },
        data: {
          merchant: newName,
          normalizedMerchant: newNorm,
          ...(dto.amount !== undefined && { amount: new Prisma.Decimal(newAmount) }),
          ...(dto.currency !== undefined && { currency: newCurrency }),
          ...(dto.billingCycle !== undefined && { periodType: dto.billingCycle as BillingCycle }),
          ...(dto.nextBilling !== undefined && { nextExpectedCharge: new Date(dto.nextBilling) }),
          ...(dto.isActive !== undefined && { isActive: dto.isActive }),
          ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
        },
      });
    }

    return toDto(sub);
  }

  async remove(id: string, userId: string) {
    const existing = await this.prisma.subscription.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundException('Subscription not found');

    const sub = await this.prisma.subscription.delete({ where: { id } });

    // Deactivate linked DetectedSubscription
    const normalizedMerchant = normalize(existing.name);
    await this.prisma.detectedSubscription.updateMany({
      where: { userId, normalizedMerchant, currency: existing.currency },
      data: { isActive: false },
    });

    return toDto(sub);
  }
}
