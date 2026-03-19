import dns from 'node:dns';
import https from 'node:https';
import {
  Injectable,
  Logger,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import axiosRetry from 'axios-retry';
import { UsersService } from '../users/users.service';
import { OAuthStateStore } from './oauth-state.store';
import { OAuthCodeExpiredException } from './oauth-code-expired.exception';

// ── Shared HTTPS keep-alive agent ────────────────────────────
// Force IPv4 via lookup — Railway containers often fail on IPv6.
const keepAliveAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 30_000,
  maxSockets: 10,
  lookup: (hostname, options, callback) => {
    dns.lookup(hostname, { ...(typeof options === 'object' ? options : {}), family: 4 }, callback);
  },
});

// ── Yandex OAuth client ──────────────────────────────────────
// 15s timeout for Railway cold starts. Network-only retries.
const yandexClient = axios.create({ timeout: 15_000, httpsAgent: keepAliveAgent });
axiosRetry(yandexClient, {
  retries: 2,
  retryDelay: (retryCount) => retryCount * 1_000, // 1s, 2s
  retryCondition: (error) => {
    // Never retry if Yandex actually responded — the code is burned.
    if (error.response) return false;
    // Only retry true network failures (DNS, TCP reset, timeout).
    return (
      axiosRetry.isNetworkError(error) || error.code === 'ECONNABORTED'
    );
  },
  onRetry: (retryCount, error) => {
    console.log(
      `[yandexClient] retry #${retryCount}: ${error.code ?? 'UNKNOWN'} — ${error.message}`,
    );
  },
});

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

    return `https://oauth.yandex.ru/authorize?${params.toString()}`;
  }

  /**
   * Restart URL without force_confirm — Yandex auto-approves returning users.
   * Makes the restart after OAuthCodeExpiredException nearly invisible.
   */
  getYandexRestartUrl(platform?: string): string {
    const clientId = this.configService.get('YANDEX_CLIENT_ID');
    const redirectUri = this.configService.get('YANDEX_REDIRECT_URI');
    const state = this.oauthStateStore.generate(platform);

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'login:email login:info login:avatar',
      state,
    });

    return `https://oauth.yandex.ru/authorize?${params.toString()}`;
  }

  validateState(state: string | undefined): { valid: boolean; platform?: string; timestamp?: number } {
    return this.oauthStateStore.validate(state);
  }

  async handleYandexCallback(code: string, callbackTime?: number) {
    const tokenData = await this.exchangeCodeForToken(code, callbackTime);
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

  private async exchangeCodeForToken(code: string, callbackTime?: number) {
    if (callbackTime) {
      this.logger.log(`[AUTH:token-exchange] callback→exchange delay: ${Date.now() - callbackTime}ms`);
    }

    const clientId = this.configService.get('YANDEX_CLIENT_ID');
    const clientSecret = this.configService.get('YANDEX_CLIENT_SECRET');
    const redirectUri = this.configService.get('YANDEX_REDIRECT_URI');

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    });

    try {
      const response = await yandexClient.post(
        'https://oauth.yandex.ru/token',
        params,
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        },
      );

      this.logger.log('[AUTH:token-exchange] success');
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const data = error.response.data;
        this.logger.error(
          `[AUTH:token-exchange] HTTP ${error.response.status}: ${JSON.stringify(data)}`,
        );

        // Expired code — let the controller restart the OAuth flow
        if (
          data?.error === 'invalid_grant' &&
          typeof data?.error_description === 'string' &&
          data.error_description.toLowerCase().includes('expired')
        ) {
          this.logger.warn('[AUTH:token-exchange] code expired — will restart OAuth flow');
          throw new OAuthCodeExpiredException();
        }

        if (error.response.status === 401 || error.response.status === 400) {
          throw new UnauthorizedException(
            `Yandex rejected token exchange: ${data?.error ?? error.response.status}`,
          );
        }
      } else {
        this.logger.error(
          `[AUTH:token-exchange] network error: ${error instanceof Error ? error.message : error}`,
        );
      }
      throw new InternalServerErrorException('Yandex OAuth network failure');
    }
  }

  private async getYandexUserInfo(accessToken: string): Promise<YandexUserInfo> {
    this.logger.log('[AUTH:user-info] fetching Yandex profile');

    try {
      const response = await yandexClient.get('https://login.yandex.ru/info?format=json', {
        headers: { Authorization: `OAuth ${accessToken}` },
      });
      this.logger.log('[AUTH:user-info] success');
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        this.logger.error(
          `[AUTH:user-info] HTTP ${error.response.status}: ${JSON.stringify(error.response.data)}`,
        );
        if (error.response.status === 401 || error.response.status === 403) {
          throw new UnauthorizedException('Yandex rejected access token');
        }
      } else {
        this.logger.error(
          `[AUTH:user-info] network error: ${error instanceof Error ? error.message : error}`,
        );
      }
      throw new InternalServerErrorException('Yandex user info request failed');
    }
  }
}
