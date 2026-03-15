import {
  Controller,
  Get,
  Post,
  UseGuards,
  Request,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BankIntegrationService } from '../bank-integration/bank-integration.service';

@ApiTags('Integration')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('integration')
export class IntegrationController {
  private readonly logger = new Logger(IntegrationController.name);

  constructor(private bankIntegrationService: BankIntegrationService) {}

  @Get('banks')
  @ApiOperation({ summary: 'Get connected banks' })
  async getBanks(@Request() req: { user: { id: string } }) {
    return this.bankIntegrationService.listConnections(req.user.id);
  }

  @Post('banks/connect-and-sync')
  @ApiOperation({
    summary: 'Connect bank and sync transactions',
    description:
      'Requires an existing bank connection (via OAuth or connection code). ' +
      'Triggers a full sync: fetches accounts, imports transactions, runs subscription detection.',
  })
  async connectAndSync(@Request() req: { user: { id: string } }) {
    this.logger.log(`Connect-and-sync for user ${req.user.id}`);
    return this.bankIntegrationService.syncFlex(req.user.id);
  }
}
