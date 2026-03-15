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
    // Exchange the authorization code IMMEDIATELY — codes expire in seconds.
    // State validation is cheap (JWT verify, no I/O) but runs second to
    // guarantee the code hits Yandex before it can expire.
    const result = await this.authService.handleYandexCallback(code);

    const stateResult = this.authService.validateState(state);
    if (!stateResult.valid) {
      throw new BadRequestException('Invalid OAuth state');
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
