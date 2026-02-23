import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';

@ApiTags('Accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('accounts')
export class AccountsController {
  constructor(private accountsService: AccountsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all accounts of current user' })
  findAll(@Request() req: { user: { id: string } }) {
    return this.accountsService.findAllByUser(req.user.id);
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
