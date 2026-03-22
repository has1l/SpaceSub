import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';
import { EmailService } from './email.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class NotificationSchedulerService {
  private readonly logger = new Logger(NotificationSchedulerService.name);
  private running = false;

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private emailService: EmailService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleNotificationCron() {
    if (this.running) {
      this.logger.warn('Notification cron: previous run still in progress, skipping');
      return;
    }

    this.running = true;
    const startTime = Date.now();
    this.logger.log('Notification cron: starting');

    try {
      const connections = await this.prisma.bankConnection.findMany({
        where: { status: 'CONNECTED' },
        select: { userId: true },
      });

      const userIds = [...new Set(connections.map((c) => c.userId))];

      if (userIds.length === 0) {
        this.logger.log('Notification cron: no connected users');
        return;
      }

      let created = 0;

      for (const userId of userIds) {
        try {
          created += await this.createUpcomingChargeNotifications(userId);
        } catch (error) {
          this.logger.error(
            `Notification cron: failed for user=${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      const elapsed = Date.now() - startTime;
      this.logger.log(
        `Notification cron: completed in ${elapsed}ms — created=${created} users=${userIds.length}`,
      );
    } catch (error) {
      this.logger.error(
        `Notification cron: fatal error — ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    } finally {
      this.running = false;
    }
  }

  private async createUpcomingChargeNotifications(userId: string): Promise<number> {
    const settings = await this.prisma.notificationSettings.findUnique({
      where: { userId },
    });

    const daysBefore = settings?.daysBefore ?? 3;

    const now = new Date();
    const futureDate = new Date(now.getTime() + daysBefore * 24 * 60 * 60 * 1000);

    const upcoming = await this.prisma.detectedSubscription.findMany({
      where: {
        userId,
        isActive: true,
        nextExpectedCharge: { gte: now, lte: futureDate },
      },
    });

    if (upcoming.length === 0) return 0;

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const existingToday = await this.prisma.notification.findMany({
      where: {
        userId,
        type: NotificationType.BILLING_REMINDER,
        createdAt: { gte: todayStart },
      },
      select: { message: true },
    });

    const existingMerchants = new Set(existingToday.map((n) => n.message));
    let created = 0;

    for (const sub of upcoming) {
      const message = `${sub.merchant}|${sub.amount.toNumber()}|${sub.currency}`;

      if (existingMerchants.has(message)) continue;

      const chargeDate = sub.nextExpectedCharge.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short',
      });

      const title = `Скоро списание: ${sub.merchant}`;

      await this.notificationsService.create({
        userId,
        type: NotificationType.BILLING_REMINDER,
        title,
        message,
      });

      // Send email if enabled
      if (settings?.emailNotifications !== false && this.emailService.isEnabled()) {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { email: true },
        });
        if (user?.email) {
          const humanMessage = `Ожидается списание ${sub.amount.toNumber()} ${sub.currency} за ${sub.merchant} (${chargeDate})`;
          await this.emailService
            .sendNotificationEmail(user.email, title, humanMessage)
            .catch((err) =>
              this.logger.error(`Email send failed: ${err instanceof Error ? err.message : err}`),
            );
        }
      }

      created++;
      this.logger.debug(
        `Notification: upcoming charge ${sub.merchant} ${sub.amount} ${sub.currency} on ${chargeDate} for user=${userId}`,
      );
    }

    return created;
  }
}
