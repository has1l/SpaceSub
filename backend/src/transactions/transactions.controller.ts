import { Controller, Post, Get, UseGuards, Request, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TransactionsService } from './transactions.service';
import { TransactionsAnalysisService } from './transactions-analysis.service';
import { ImportTransactionsDto } from './dto/import-transactions.dto';

@ApiTags('Transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(
    private transactionsService: TransactionsService,
    private analysisService: TransactionsAnalysisService,
  ) {}

  @Post('import')
  @ApiOperation({ summary: 'Import transactions and run analysis' })
  @ApiBody({ type: ImportTransactionsDto })
  async importTransactions(
    @Request() req: { user: { id: string } },
    @Body() dto: ImportTransactionsDto,
  ) {
    const importResult = await this.transactionsService.importTransactions(
      req.user.id,
      dto,
    );
    const suggestions = await this.analysisService.analyze(req.user.id);
    return { ...importResult, suggestions };
  }

  @Get()
  @ApiOperation({ summary: 'Get all transactions' })
  findAll(@Request() req: { user: { id: string } }) {
    return this.transactionsService.findAllByUser(req.user.id);
  }

  @Post('analyze')
  @ApiOperation({ summary: 'Analyze transactions for recurring subscriptions' })
  analyze(@Request() req: { user: { id: string } }) {
    return this.analysisService.analyze(req.user.id);
  }
}
