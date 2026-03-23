import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AccountsService } from '../accounts/accounts.service';
import { TransactionsService } from '../transactions/transactions.service';
import { RecurringPaymentsService } from '../recurring-payments/recurring-payments.service';

@ApiTags('API v1 (Bank Integration)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1')
export class ApiV1Controller {
  constructor(
    private accountsService: AccountsService,
    private transactionsService: TransactionsService,
    private recurringPaymentsService: RecurringPaymentsService,
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
}
