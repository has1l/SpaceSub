import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BankIntegrationService } from './bank-integration.service';
import { ConnectFlexDto } from './dto/connect-flex.dto';
import { SyncFlexDto } from './dto/sync-flex.dto';

@ApiTags('Bank Integration')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bank-integration')
export class BankIntegrationController {
  constructor(private bankIntegrationService: BankIntegrationService) {}

  @Post('flex/connect')
  @ApiOperation({
    summary: 'Connect Flex Bank account',
    description:
      'Saves Flex Bank credentials for the current user. Real OAuth flow will be added in step 2.',
  })
  async connectFlex(
    @Request() req: { user: { id: string } },
    @Body() dto: ConnectFlexDto,
  ) {
    const connection = await this.bankIntegrationService.upsertConnection(
      req.user.id,
      dto,
    );
    return this.bankIntegrationService.toSafeDto(connection);
  }

  @Get('connections')
  @ApiOperation({
    summary: 'List all bank connections',
    description: 'Returns connections without sensitive tokens.',
  })
  async listConnections(@Request() req: { user: { id: string } }) {
    return this.bankIntegrationService.listConnections(req.user.id);
  }

  @Post('flex/sync')
  @ApiOperation({
    summary: 'Sync transactions from Flex Bank',
    description:
      'Fetches accounts and transactions from Flex Bank API, imports into SpaceSub.',
  })
  async syncFlex(
    @Request() req: { user: { id: string } },
    @Body() _dto: SyncFlexDto,
  ) {
    return this.bankIntegrationService.syncFlex(req.user.id);
  }
}
