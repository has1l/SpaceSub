import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TransactionsService } from './transactions.service';
import { AccountsService } from '../accounts/accounts.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';

@ApiTags('Transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class TransactionsController {
  constructor(
    private transactionsService: TransactionsService,
    private accountsService: AccountsService,
  ) {}

  @Get('accounts/:accountId/transactions')
  @ApiOperation({ summary: 'Get transactions by account with optional date range' })
  @ApiQuery({ name: 'from', required: false, example: '2025-01-01' })
  @ApiQuery({ name: 'to', required: false, example: '2025-12-31' })
  async findByAccount(
    @Param('accountId') accountId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Request() req: { user: { id: string } },
  ) {
    await this.accountsService.findOneOwned(accountId, req.user.id);
    return this.transactionsService.findByAccount(accountId, from, to);
  }

  @Post('accounts/:accountId/transactions')
  @ApiOperation({ summary: 'Create a transaction in account' })
  async create(
    @Param('accountId') accountId: string,
    @Body() dto: CreateTransactionDto,
    @Request() req: { user: { id: string } },
  ) {
    await this.accountsService.findOneOwned(accountId, req.user.id);
    return this.transactionsService.create(accountId, dto);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get all transactions of current user' })
  findAll(@Request() req: { user: { id: string } }) {
    return this.transactionsService.findAllByUser(req.user.id);
  }
}
