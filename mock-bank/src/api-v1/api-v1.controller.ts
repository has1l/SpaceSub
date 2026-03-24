import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AccountsService } from '../accounts/accounts.service';
import { TransactionsService } from '../transactions/transactions.service';
import { RecurringPaymentsService } from '../recurring-payments/recurring-payments.service';
import { ServiceCatalogService } from '../service-catalog/service-catalog.service';
import { UserSubscriptionsService } from '../user-subscriptions/user-subscriptions.service';

@ApiTags('API v1 (Bank Integration)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1')
export class ApiV1Controller {
  constructor(
    private accountsService: AccountsService,
    private transactionsService: TransactionsService,
    private recurringPaymentsService: RecurringPaymentsService,
    private serviceCatalogService: ServiceCatalogService,
    private userSubscriptionsService: UserSubscriptionsService,
  ) {}

  @Get('accounts')
  @ApiOperation({ summary: 'List accounts (bank-style DTO)' })
  async listAccounts(@Request() req: { user: { id: string } }) {
    const accounts = await this.accountsService.findAllByUser(req.user.id);
    return accounts.map((a) => ({
      id: a.id,
      externalId: a.id,
      name: a.name,
      currency: a.currency,
      balance: a.balance,
    }));
  }

  @Get('accounts/:accountId/transactions')
  @ApiOperation({ summary: 'List transactions for account (bank-style DTO)' })
  @ApiQuery({ name: 'from', required: false, example: '2025-01-01' })
  @ApiQuery({ name: 'to', required: false, example: '2026-12-31' })
  async listTransactions(
    @Param('accountId') accountId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Request() req: { user: { id: string } },
  ) {
    // Verify ownership
    const account = await this.accountsService.findOneOwned(
      accountId,
      req.user.id,
    );

    const transactions = await this.transactionsService.findByAccount(
      accountId,
      from,
      to,
    );

    return transactions.map((t) => ({
      id: t.id,
      externalId: t.id,
      accountExternalId: account.id,
      postedAt: t.date.toISOString(),
      amount: t.amount,
      currency: t.currency,
      description: t.description,
      type: t.amount < 0 ? ('DEBIT' as const) : ('CREDIT' as const),
      merchant: t.merchant || null,
      category: t.category,
      mcc: null,
    }));
  }

  @Get('recurring-payments')
  @ApiOperation({ summary: 'List recurring payments for user' })
  async listRecurringPayments(
    @Request() req: { user: { id: string } },
  ) {
    const payments =
      await this.recurringPaymentsService.findByUser(req.user.id);
    return payments.map((rp) => ({
      id: rp.id,
      merchant: rp.merchant,
      amount: rp.amount,
      currency: rp.currency,
      category: rp.category,
      periodDays: rp.periodDays,
      nextChargeDate: rp.nextChargeDate.toISOString(),
      status: rp.status,
      cancelledAt: rp.cancelledAt?.toISOString() || null,
      createdAt: rp.createdAt.toISOString(),
      logoUrl: (rp as any).userSubscription?.service?.logoUrl || null,
    }));
  }

  @Post('recurring-payments/:id/cancel')
  @ApiOperation({ summary: 'Cancel a recurring payment' })
  async cancelRecurringPayment(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    const rp = await this.recurringPaymentsService.cancel(id, req.user.id);
    return {
      id: rp.id,
      status: rp.status,
      cancelledAt: rp.cancelledAt?.toISOString() || null,
    };
  }

  // --- Service Catalog ---

  @Get('services')
  @ApiOperation({ summary: 'List available services' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'category', required: false })
  async listServices(
    @Query('search') search: string,
    @Query('category') category: string,
    @Request() req: { user: { id: string } },
  ) {
    const services = await this.serviceCatalogService.findAll(search, category);
    const userSubs = await this.userSubscriptionsService.findByUser(req.user.id);
    const subscribedServiceIds = new Set(
      userSubs
        .filter((s) => s.status === 'ACTIVE')
        .map((s) => s.serviceId),
    );

    return services.map((s) => ({
      id: s.id,
      name: s.name,
      merchant: s.merchant,
      description: s.description,
      logoUrl: s.logoUrl,
      amount: s.amount,
      currency: s.currency,
      periodDays: s.periodDays,
      category: s.category,
      isSubscribed: subscribedServiceIds.has(s.id),
    }));
  }

  @Get('services/:id')
  @ApiOperation({ summary: 'Get service details' })
  async getService(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    const service = await this.serviceCatalogService.findById(id);
    const isSubscribed = await this.userSubscriptionsService.isSubscribed(
      req.user.id,
      id,
    );
    return { ...service, isSubscribed };
  }

  @Post('services/:id/subscribe')
  @ApiOperation({ summary: 'Subscribe to a service' })
  async subscribe(
    @Param('id') id: string,
    @Body() body: { accountId: string },
    @Request() req: { user: { id: string } },
  ) {
    const sub = await this.userSubscriptionsService.subscribe(
      req.user.id,
      id,
      body.accountId,
    );
    return {
      id: sub.id,
      service: sub.service,
      status: sub.status,
      subscribedAt: sub.subscribedAt,
      recurringPayment: sub.recurringPayment
        ? {
            id: sub.recurringPayment.id,
            nextChargeDate: sub.recurringPayment.nextChargeDate.toISOString(),
          }
        : null,
    };
  }

  @Post('services/:id/unsubscribe')
  @ApiOperation({ summary: 'Unsubscribe from a service' })
  async unsubscribe(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    const sub = await this.userSubscriptionsService.unsubscribe(
      req.user.id,
      id,
    );
    return {
      id: sub.id,
      status: sub.status,
      cancelledAt: sub.cancelledAt,
    };
  }

  @Get('my-subscriptions')
  @ApiOperation({ summary: 'List user subscriptions' })
  async mySubscriptions(@Request() req: { user: { id: string } }) {
    const subs = await this.userSubscriptionsService.findByUser(req.user.id);
    return subs.map((s) => ({
      id: s.id,
      service: {
        id: s.service.id,
        name: s.service.name,
        merchant: s.service.merchant,
        description: s.service.description,
        logoUrl: s.service.logoUrl,
        amount: s.service.amount,
        currency: s.service.currency,
        periodDays: s.service.periodDays,
        category: s.service.category,
      },
      status: s.status,
      subscribedAt: s.subscribedAt,
      cancelledAt: s.cancelledAt,
      recurringPayment: s.recurringPayment
        ? {
            id: s.recurringPayment.id,
            nextChargeDate: s.recurringPayment.nextChargeDate.toISOString(),
            status: s.recurringPayment.status,
          }
        : null,
    }));
  }
}
