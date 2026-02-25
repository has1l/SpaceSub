import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { OAuthStateStore } from './oauth-state.store';

interface YandexUserInfo {
  id: string;
  default_email: string;
  display_name?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private prisma: PrismaService,
    private oauthStateStore: OAuthStateStore,
  ) {}

  getYandexAuthUrl(): string {
    const clientId = this.configService.get('YANDEX_CLIENT_ID');
    const redirectUri = this.configService.get('YANDEX_REDIRECT_URI');
    const state = this.oauthStateStore.generate();

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'login:email login:info',
      state,
      force_confirm: 'true',
      prompt: 'select_account',
    });

    const url = `https://oauth.yandex.ru/authorize?${params.toString()}`;

    this.logger.debug(
      `OAuth redirect: client_id=${clientId}, redirect_uri=${redirectUri}, state=${state}`,
    );

    return url;
  }

  validateState(state: string | undefined): void {
    if (!this.oauthStateStore.validate(state)) {
      throw new UnauthorizedException('Invalid or expired OAuth state');
    }
  }

  async handleYandexCallback(code: string) {
    const tokenData = await this.exchangeCodeForToken(code);
    const userInfo = await this.getYandexUserInfo(tokenData.access_token);

    const user = await this.prisma.user.upsert({
      where: { yandexId: userInfo.id },
      update: {
        email: userInfo.default_email,
        name: userInfo.display_name || userInfo.default_email,
      },
      create: {
        yandexId: userInfo.id,
        email: userInfo.default_email,
        name: userInfo.display_name || userInfo.default_email,
      },
    });

    const payload = { sub: user.id, email: user.email };
    return {
      accessToken: this.jwtService.sign(payload),
      user: { id: user.id, email: user.email, name: user.name },
    };
  }

  private async exchangeCodeForToken(code: string) {
    const clientId = this.configService.get('YANDEX_CLIENT_ID');
    const clientSecret = this.configService.get('YANDEX_CLIENT_SECRET');

    const response = await fetch('https://oauth.yandex.ru/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!response.ok)
      throw new UnauthorizedException('Failed to exchange Yandex auth code');
    return response.json();
  }

  async exchangeYandexToken(yandexAccessToken: string) {
    this.logger.log('Token exchange: validating Yandex access token');
    const userInfo = await this.getYandexUserInfo(yandexAccessToken);

    const user = await this.prisma.user.upsert({
      where: { yandexId: userInfo.id },
      update: {
        email: userInfo.default_email,
        name: userInfo.display_name || userInfo.default_email,
      },
      create: {
        yandexId: userInfo.id,
        email: userInfo.default_email,
        name: userInfo.display_name || userInfo.default_email,
      },
    });

    const payload = { sub: user.id, email: user.email };
    this.logger.log(`Token exchange: issued JWT for user ${user.email}`);
    return { accessToken: this.jwtService.sign(payload) };
  }

  private async getYandexUserInfo(
    accessToken: string,
  ): Promise<YandexUserInfo> {
    const response = await fetch('https://login.yandex.ru/info?format=json', {
      headers: { Authorization: `OAuth ${accessToken}` },
    });
    if (!response.ok)
      throw new UnauthorizedException('Failed to get Yandex user info');
    return response.json();
  }
}
