import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Res,
  UseGuards,
  Request,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BankIntegrationService } from './bank-integration.service';
import { BankOAuthService } from './services/bank-oauth.service';
import { ConnectFlexDto } from './dto/connect-flex.dto';
import { SyncFlexDto } from './dto/sync-flex.dto';

@ApiTags('Bank Integration')
@Controller('bank-integration')
export class BankIntegrationController {
  private readonly logger = new Logger(BankIntegrationController.name);

  constructor(
    private bankIntegrationService: BankIntegrationService,
    private bankOAuthService: BankOAuthService,
    private configService: ConfigService,
  ) {}

  // ── OAuth flow ────────────────────────────────────────────

  @Get('flex/oauth')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get Flex Bank OAuth URL',
    description:
      'Returns a Yandex OAuth URL for connecting Flex Bank. Frontend should redirect the user to this URL.',
  })
  async getFlexOAuthUrl(@Request() req: { user: { id: string } }) {
    const url = this.bankOAuthService.getFlexOAuthUrl(req.user.id);
    return { url };
  }

  @Get('flex/callback')
  @ApiOperation({
    summary: 'Flex Bank OAuth callback',
    description:
      'Handles Yandex OAuth callback for Flex Bank connection. User ID is recovered from state parameter.',
  })
  @ApiQuery({ name: 'code', required: true })
  @ApiQuery({ name: 'state', required: true })
  async flexCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    if (!code || !state) {
      throw new BadRequestException('Missing code or state parameter');
    }

    try {
      await this.bankOAuthService.handleFlexCallback(code, state);
    } catch (error) {
      this.logger.error(
        `Flex OAuth callback failed: ${error instanceof Error ? error.message : error}`,
      );
      const frontendUrl =
        this.configService.get('FRONTEND_URL') ||
        'http://spacesub.localhost:5174';
      return res.redirect(`${frontendUrl}/connect-flex?error=oauth_failed`);
    }

    const frontendUrl =
      this.configService.get('FRONTEND_URL') ||
      'http://spacesub.localhost:5174';
    this.logger.log(`Flex OAuth complete, redirecting to ${frontendUrl}`);
    return res.redirect(`${frontendUrl}/dashboard?bank_connected=true`);
  }

  // ── Manual connect (legacy) ───────────────────────────────

  @Post('flex/connect')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Connect Flex Bank account (manual token)',
    description: 'Saves Flex Bank credentials. Prefer /flex/oauth for automatic flow.',
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

  // ── Connections list ──────────────────────────────────────

  @Get('connections')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'List all bank connections',
    description: 'Returns connections without sensitive tokens.',
  })
  async listConnections(@Request() req: { user: { id: string } }) {
    return this.bankIntegrationService.listConnections(req.user.id);
  }

  // ── Sync ──────────────────────────────────────────────────

  @Post('flex/sync')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
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
