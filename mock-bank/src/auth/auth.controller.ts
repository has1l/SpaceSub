import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Res,
  Request,
  UseGuards,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { TokenExchangeDto } from './dto/token-exchange.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger('AuthController[flexbank]');

  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  @Get('yandex')
  @ApiOperation({ summary: 'Redirect to Yandex OAuth (with state)' })
  yandexAuth(@Res() res: Response) {
    const url = this.authService.getYandexAuthUrl();
    return res.redirect(url);
  }

  @Get('yandex/callback')
  @ApiOperation({ summary: 'Yandex OAuth callback — validates state, redirects to frontend' })
  @ApiQuery({ name: 'code', required: true })
  @ApiQuery({ name: 'state', required: true })
  async yandexCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    try {
      this.authService.validateState(state);
    } catch {
      throw new BadRequestException('Invalid OAuth state');
    }

    const { accessToken } = await this.authService.handleYandexCallback(code);

    // Derive the external origin from YANDEX_REDIRECT_URI — this is the real
    // URL the browser used, not the proxied localhost:3001 host.
    const callbackUri = this.configService.get('YANDEX_REDIRECT_URI') || '';
    const origin = callbackUri ? new URL(callbackUri).origin : 'http://localhost:5174';
    const redirectTo = `${origin}/bank/auth/callback?token=${accessToken}`;

    this.logger.log(`OAuth callback redirect → ${redirectTo} [pid=${process.pid}]`);
    return res.redirect(redirectTo);
  }

  @Post('token-exchange')
  @ApiOperation({
    summary: 'Exchange Yandex access token for Flex Bank JWT',
    description:
      'Server-to-server endpoint: accepts a valid Yandex OAuth token, upserts the user, returns a Flex Bank JWT.',
  })
  async tokenExchange(@Body() dto: TokenExchangeDto) {
    return this.authService.exchangeYandexToken(dto.yandexAccessToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Debug: return current user identity from JWT' })
  async me(@Request() req: { user: { id: string; email: string } }) {
    const user = await this.authService.resolveUser({ sub: req.user.id, email: req.user.email });
    this.logger.log(
      `[AUTH] /auth/me: jwtSub=${req.user.id}, resolved=${user ? `dbId=${user.id}, yandexId=${user.yandexId}` : 'NOT FOUND'}`,
    );
    return {
      jwt: { sub: req.user.id, email: req.user.email },
      user,
    };
  }
}
