import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UserSubscriptionsService {
  constructor(private prisma: PrismaService) {}

  async subscribe(userId: string, serviceId: string, accountId: string) {
    const service = await this.prisma.serviceCatalog.findUnique({
      where: { id: serviceId },
    });
    if (!service) throw new NotFoundException('Service not found');

    const existing = await this.prisma.userSubscription.findUnique({
      where: { userId_serviceId: { userId, serviceId } },
    });
    if (existing && existing.status === 'ACTIVE') {
      throw new ConflictException('Already subscribed');
    }

    const account = await this.prisma.account.findFirst({
      where: { id: accountId, userId },
    });
    if (!account) throw new NotFoundException('Account not found');

    return this.prisma.$transaction(async (tx) => {
      const recurringPayment = await tx.recurringPayment.create({
        data: {
          accountId,
          merchant: service.name,
          amount: -service.amount,
          currency: service.currency,
          category: service.category,
          periodDays: service.periodDays,
          nextChargeDate: new Date(
            Date.now() + service.periodDays * 24 * 60 * 60 * 1000,
          ),
          status: 'ACTIVE',
        },
      });

      // Create first transaction (charge)
      await tx.transaction.create({
        data: {
          accountId,
          date: new Date(),
          amount: -service.amount,
          currency: service.currency,
          description: `Подписка: ${service.name}`,
          merchant: service.name,
          type: 'EXPENSE',
          category: service.category,
        },
      });

      if (existing) {
        // Reactivate cancelled subscription
        return tx.userSubscription.update({
          where: { id: existing.id },
          data: {
            status: 'ACTIVE',
            recurringPaymentId: recurringPayment.id,
            cancelledAt: null,
            subscribedAt: new Date(),
          },
          include: { service: true, recurringPayment: true },
        });
      }

      return tx.userSubscription.create({
        data: {
          userId,
          serviceId,
          accountId,
          recurringPaymentId: recurringPayment.id,
          status: 'ACTIVE',
        },
        include: { service: true, recurringPayment: true },
      });
    });
  }

  async unsubscribe(userId: string, serviceId: string) {
    const sub = await this.prisma.userSubscription.findUnique({
      where: { userId_serviceId: { userId, serviceId } },
      include: { recurringPayment: true },
    });
    if (!sub) throw new NotFoundException('Subscription not found');

    return this.prisma.$transaction(async (tx) => {
      if (sub.recurringPaymentId) {
        await tx.recurringPayment.update({
          where: { id: sub.recurringPaymentId },
          data: { status: 'CANCELLED', cancelledAt: new Date() },
        });
      }

      return tx.userSubscription.update({
        where: { id: sub.id },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
        include: { service: true, recurringPayment: true },
      });
    });
  }

  async findByUser(userId: string) {
    return this.prisma.userSubscription.findMany({
      where: { userId },
      include: { service: true, recurringPayment: true },
      orderBy: { subscribedAt: 'desc' },
    });
  }

  async isSubscribed(userId: string, serviceId: string): Promise<boolean> {
    const sub = await this.prisma.userSubscription.findUnique({
      where: { userId_serviceId: { userId, serviceId } },
    });
    return sub?.status === 'ACTIVE';
  }
}
