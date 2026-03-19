import {
  Controller,
  Get,
  Query,
  Res,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { OAuthCodeExpiredException } from './oauth-code-expired.exception';

const MAX_RETRIES = 2;

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger('AuthController[spacesub]');

  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  @Get('yandex')
  @ApiOperation({ summary: 'Redirect to Yandex OAuth' })
  @ApiQuery({ name: 'platform', required: false })
  yandexAuth(
    @Query('platform') platform: string | undefined,
    @Res() res: Response,
  ) {
    const url = this.authService.getYandexAuthUrl(platform);
    return res.redirect(url);
  }

  @Get('yandex/callback')
  @ApiOperation({ summary: 'Yandex OAuth callback' })
  @ApiQuery({ name: 'code', required: true })
  @ApiQuery({ name: 'state', required: true })
  @ApiQuery({ name: 'retry', required: false })
  async yandexCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('retry') retry: string | undefined,
    @Res() res: Response,
  ) {
    const callbackTime = Date.now();
    const retryCount = parseInt(retry ?? '0', 10) || 0;

    let result: Awaited<ReturnType<AuthService['handleYandexCallback']>>;
    try {
      result = await this.authService.handleYandexCallback(code, callbackTime);
    } catch (error) {
      if (error instanceof OAuthCodeExpiredException) {
        if (retryCount >= MAX_RETRIES) {
          this.logger.error(`OAuth code expired after ${retryCount} retries — giving up`);
          const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:5174';
          return res.redirect(`${frontendUrl}/?error=oauth_timeout`);
        }
        this.logger.warn(`OAuth code expired — restart #${retryCount + 1}`);
        // Use restart URL (no force_confirm) so Yandex auto-approves returning users
        const restartUrl = this.authService.getYandexRestartUrl();
        return res.redirect(restartUrl);
      }
      throw error;
    }

    const stateResult = this.authService.validateState(state);
    if (!stateResult.valid) {
      throw new BadRequestException('Invalid OAuth state');
    }

    if (stateResult.timestamp) {
      this.logger.log(`OAuth roundtrip: ${callbackTime - stateResult.timestamp}ms`);
    }

    if (stateResult.platform === 'ios') {
      return res.redirect(`spacesub://auth/callback?token=${result.accessToken}`);
    }

    const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:5174';
    return res.redirect(`${frontendUrl}/auth/callback?token=${result.accessToken}`);
  }
}
