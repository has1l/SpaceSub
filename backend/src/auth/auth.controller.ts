import { Controller, Get, Query, Res, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthService } from './auth.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('yandex')
  @ApiOperation({ summary: 'Redirect to Yandex OAuth' })
  async yandexAuth(@Res() res: Response) {
    const url = await this.authService.getYandexAuthUrl();
    return res.redirect(url);
  }

  @Get('yandex/callback')
  @ApiOperation({ summary: 'Yandex OAuth callback' })
  @ApiQuery({ name: 'code', required: true })
  async yandexCallback(@Query('code') code: string, @Res() res: Response) {
    const result = await this.authService.handleYandexCallback(code);
    return res.status(HttpStatus.OK).json(result);
  }
}
