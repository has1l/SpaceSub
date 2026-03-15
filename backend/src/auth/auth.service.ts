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

    this.logger.log(
      `[AUTH:authorize] env=YANDEX_CLIENT_ID, client_id=${clientId}, redirect_uri=${redirectUri}`,
    );

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'login:email login:info login:avatar',
      state,
      force_confirm: 'true',
      prompt: 'select_account',
    });

    return `https://oauth.yandex.ru/authorize?${params.toString()}`;
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
    const redirectUri = this.configService.get('YANDEX_REDIRECT_URI');

    console.log('=== YANDEX TOKEN EXCHANGE START ===');
    console.log('code:', code);
    console.log('client_id:', clientId);
    console.log('client_secret set:', !!clientSecret, 'length:', clientSecret?.length ?? 0);
    console.log('redirect_uri:', redirectUri);
    console.log('env YANDEX_REDIRECT_URI:', process.env.YANDEX_REDIRECT_URI);
    console.log('env YANDEX_CLIENT_ID:', process.env.YANDEX_CLIENT_ID);

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    });

    console.log('request body:', params.toString());

    try {
      const response = await axios.post(
        'https://oauth.yandex.ru/token',
        params,
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 15_000,
        },
      );

      console.log('=== YANDEX TOKEN SUCCESS ===');
      console.log('response data:', JSON.stringify(response.data));
      return response.data;
    } catch (error) {
      console.error('=== YANDEX TOKEN ERROR ===');
      if (axios.isAxiosError(error)) {
        console.error('status:', error.response?.status);
        console.error('data:', JSON.stringify(error.response?.data));
        console.error('headers:', JSON.stringify(error.response?.headers));
        console.error('message:', error.message);
      } else {
        console.error('non-axios error:', error instanceof Error ? error.message : error);
      }
      throw new UnauthorizedException('Failed to exchange Yandex auth code');
    }
  }

  private async getYandexUserInfo(accessToken: string): Promise<YandexUserInfo> {
    try {
      const response = await axios.get('https://login.yandex.ru/info?format=json', {
        headers: { Authorization: `OAuth ${accessToken}` },
        timeout: 15_000,
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        this.logger.error(
          `[AUTH:user-info] HTTP ${error.response.status}: ${JSON.stringify(error.response.data)}`,
        );
        throw new UnauthorizedException('Failed to get Yandex user info');
      }
      this.logger.error(
        `[AUTH:user-info] Network error: ${error instanceof Error ? error.message : error}`,
      );
      throw new UnauthorizedException('Yandex user info request failed');
    }
  }
}
