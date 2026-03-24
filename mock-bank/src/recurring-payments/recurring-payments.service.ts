import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RecurringPaymentsService {
  constructor(private prisma: PrismaService) {}

  async findByUser(userId: string) {
    return this.prisma.recurringPayment.findMany({
      where: {
        account: { userId },
      },
      include: {
        userSubscription: {
          include: { service: { select: { logoUrl: true } } },
        },
      },
      orderBy: { nextChargeDate: 'asc' },
    });
  }

  async cancel(id: string, userId: string) {
    const rp = await this.prisma.recurringPayment.findUnique({
      where: { id },
      include: { account: { select: { userId: true } } },
    });

    if (!rp) throw new NotFoundException('Recurring payment not found');
    if (rp.account.userId !== userId)
      throw new ForbiddenException('Access denied');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.recurringPayment.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
        },
      });

      // Also cancel the associated UserSubscription
      await tx.userSubscription.updateMany({
        where: { recurringPaymentId: id },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
      });

      return updated;
    });
  }
}
