import { Controller, Get, Post, Param, Body, UseGuards, Request, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';

@ApiTags('Accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('accounts')
export class AccountsController {
  private readonly logger = new Logger('AccountsController');

  constructor(
    private accountsService: AccountsService,
    private configService: ConfigService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all accounts of current user' })
  async findAll(@Request() req: { user: { id: string; yandexId?: string } }) {
    const dbUrl = this.configService.get('DATABASE_URL') || 'N/A';
    const maskedDb = dbUrl.replace(/:([^@]+)@/, ':***@');
    this.logger.log(
      `[ACCOUNTS] GET /accounts — pid=${process.pid}, db=${maskedDb}, userId=${req.user.id}, yandexId=${req.user.yandexId ?? 'N/A'}`,
    );
    const accounts = await this.accountsService.findAllByUser(req.user.id);
    this.logger.log(`[ACCOUNTS] Found ${accounts.length} accounts for userId=${req.user.id} [pid=${process.pid}]`);
    return accounts;
  }

  @Get(':id/summary')
  @ApiOperation({ summary: 'Get account summary with income/expense breakdown' })
  getSummary(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.accountsService.getAccountSummary(id, req.user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new account' })
  create(
    @Request() req: { user: { id: string } },
    @Body() dto: CreateAccountDto,
  ) {
    return this.accountsService.create(req.user.id, dto);
  }
}
