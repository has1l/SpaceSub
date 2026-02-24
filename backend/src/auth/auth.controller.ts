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

    const result = await this.authService.handleYandexCallback(code);
    const frontendUrl =
      this.configService.get('FRONTEND_URL') || 'http://spacesub.localhost:5174';
    const redirectTo = `${frontendUrl}/auth/callback?token=${result.accessToken}`;
    this.logger.log(`OAuth callback redirect → ${frontendUrl}`);
    return res.redirect(redirectTo);
  }
}
