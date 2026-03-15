import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { UsersService } from '../users/users.service';
import { OAuthStateStore } from './oauth-state.store';

interface YandexUserInfo {
  id: string;
  default_email: string;
  display_name?: string;
  default_avatar_id?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private jwtService: JwtService,
    private usersService: UsersService,
    private configService: ConfigService,
    private oauthStateStore: OAuthStateStore,
  ) {}

  getYandexAuthUrl(platform?: string): string {
    const clientId = this.configService.get('YANDEX_CLIENT_ID');
    const redirectUri = this.configService.get('YANDEX_REDIRECT_URI');
    const state = this.oauthStateStore.generate(platform);

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'login:email login:info login:avatar',
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

  validateState(state: string | undefined): { valid: boolean; platform?: string } {
    return this.oauthStateStore.validate(state);
  }

  async handleYandexCallback(code: string) {
    const tokenData = await this.exchangeCodeForToken(code);
    const userInfo = await this.getYandexUserInfo(tokenData.access_token);
    const user = await this.usersService.upsertByYandexId({
      yandexId: userInfo.id,
      email: userInfo.default_email,
      name: userInfo.display_name || null,
      avatarUrl: userInfo.default_avatar_id
        ? `https://avatars.yandex.net/get-yapic/${userInfo.default_avatar_id}/islands-200`
        : null,
    });

    const payload = { sub: user.id, email: user.email };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  private async exchangeCodeForToken(code: string) {
    const clientId = this.configService.get('YANDEX_CLIENT_ID');
    const clientSecret = this.configService.get('YANDEX_CLIENT_SECRET');

    this.logger.log(`Exchanging Yandex auth code: client_id=${clientId}`);

    try {
      const response = await axios.post(
        'https://oauth.yandex.ru/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          client_id: clientId,
          client_secret: clientSecret,
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 15000,
        },
      );

      this.logger.log('Yandex token exchange successful');
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        this.logger.error(
          `Yandex token exchange HTTP ${error.response.status}, body: ${JSON.stringify(error.response.data)}`,
        );
        const data = error.response.data;
        if (data?.error) {
          this.logger.error(
            `Yandex error: error=${data.error}, error_description=${data.error_description}`,
          );
        }
      } else {
        this.logger.error(
          `Yandex token exchange failed: ${error instanceof Error ? error.message : error}`,
        );
      }
      throw new UnauthorizedException('Failed to exchange Yandex auth code');
    }
  }

  private async getYandexUserInfo(accessToken: string): Promise<YandexUserInfo> {
    let response: Response;
    try {
      response = await fetch('https://login.yandex.ru/info?format=json', {
        headers: { Authorization: `OAuth ${accessToken}` },
        signal: AbortSignal.timeout(15_000),
      });
    } catch (error) {
      this.logger.error(
        `Yandex user info request failed: ${error instanceof Error ? error.message : error}`,
      );
      throw new UnauthorizedException('Yandex user info request failed');
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '(unreadable)');
      this.logger.error(
        `Yandex user info HTTP ${response.status}: ${body}`,
      );
      throw new UnauthorizedException('Failed to get Yandex user info');
    }

    return response.json();
  }
}
