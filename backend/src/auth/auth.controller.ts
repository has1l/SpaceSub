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

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger('AuthController[spacesub]');

  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  @Get('yandex')
  @ApiOperation({ summary: 'Redirect to Yandex OAuth (with state + PKCE)' })
  @ApiQuery({ name: 'platform', required: false, description: 'Client platform: "ios" for mobile redirect' })
  yandexAuth(
    @Query('platform') platform: string | undefined,
    @Res() res: Response,
  ) {
    console.log('OAUTH REDIRECT TIME:', Date.now());
    const url = this.authService.getYandexAuthUrl(platform);
    return res.redirect(url);
  }

  @Get('yandex/callback')
  @ApiOperation({ summary: 'Yandex OAuth callback — validates state, redirects to frontend or mobile' })
  @ApiQuery({ name: 'code', required: true })
  @ApiQuery({ name: 'state', required: true })
  async yandexCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const callbackTime = Date.now();
    console.log('CALLBACK HANDLER START:', callbackTime);

    // Exchange the authorization code IMMEDIATELY — codes expire in seconds.
    const result = await this.authService.handleYandexCallback(code, callbackTime);

    const stateResult = this.authService.validateState(state);
    if (!stateResult.valid) {
      throw new BadRequestException('Invalid OAuth state');
    }

    if (stateResult.timestamp) {
      const roundtripMs = callbackTime - stateResult.timestamp;
      console.log('OAUTH ROUNDTRIP:', roundtripMs, 'ms');
      console.log('OAUTH REDIRECT TIME:', stateResult.timestamp);
    }

    if (stateResult.platform === 'ios') {
      const redirectTo = `spacesub://auth/callback?token=${result.accessToken}`;
      this.logger.log(`OAuth callback redirect → iOS app (spacesub://)`);
      return res.redirect(redirectTo);
    }

    const frontendUrl =
      this.configService.get('FRONTEND_URL') || 'http://localhost:5174';
    const redirectTo = `${frontendUrl}/auth/callback?token=${result.accessToken}`;
    this.logger.log(`OAuth callback redirect → ${frontendUrl}`);
    return res.redirect(redirectTo);
  }
}
