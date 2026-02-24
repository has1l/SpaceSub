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
    const frontendUrl =
      this.configService.get('FRONTEND_URL') || 'http://flexbank.localhost:5173';
    const redirectTo = `${frontendUrl}/auth/callback?token=${accessToken}`;
    this.logger.log(`OAuth callback redirect → ${frontendUrl}`);
    return res.redirect(redirectTo);
  }
}
