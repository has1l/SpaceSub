import { Controller, Post, Get, UseGuards, Request, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionsController {
  @Post('import')
  @ApiOperation({ summary: 'Import transactions (stub)' })
  importTransactions(@Request() req: { user: { id: string } }, @Body() body: any) {
    return { message: 'Transaction import not yet implemented', userId: req.user.id };
  }

  @Get()
  @ApiOperation({ summary: 'Get all transactions (stub)' })
  findAll(@Request() req: { user: { id: string } }) {
    return { message: 'Transactions list not yet implemented', userId: req.user.id };
  }
}
