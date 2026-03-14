import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { OAuthStateStore } from './oauth-state.store';

interface YandexUserInfo {
  id: string | number;
  login?: string;
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

    const user = await this.findOrCreateUser(userInfo, 'OAuth callback');

    const payload = { sub: user.id, email: user.email, yandexId: user.yandexId };
    const accessToken = this.jwtService.sign(payload);

    this.logger.log(
      `[AUTH] JWT issued: sub=${user.id}, email=${user.email}, yandexId=${user.yandexId}`,
    );

    return {
      accessToken,
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

    const user = await this.findOrCreateUser(userInfo, 'token exchange');

    const payload = { sub: user.id, email: user.email, yandexId: user.yandexId };
    this.logger.log(
      `[AUTH] Token exchange JWT: sub=${user.id}, email=${user.email}, yandexId=${user.yandexId}`,
    );
    return { accessToken: this.jwtService.sign(payload) };
  }

  /** Resolve the current user from a JWT payload (for /auth/me). */
  async resolveUser(jwtPayload: { sub: string; email: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: jwtPayload.sub },
      include: { accounts: { select: { id: true, name: true } } },
    });
    if (!user) return null;
    return {
      id: user.id,
      yandexId: user.yandexId,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      accountCount: user.accounts.length,
      accountIds: user.accounts.map((a) => a.id),
    };
  }

  /**
   * Single entry point for user lookup/creation.
   * Canonical identity key: yandexId (coerced to string).
   */
  private async findOrCreateUser(userInfo: YandexUserInfo, source: string) {
    // Coerce to string — Yandex API may return id as number in JSON
    const yandexId = String(userInfo.id);
    const email = userInfo.default_email;
    const name = userInfo.display_name || email;

    this.logger.log(
      `[AUTH] Yandex profile (${source}): id=${yandexId} (raw type: ${typeof userInfo.id}), email=${email}, login=${userInfo.login ?? 'N/A'}`,
    );

    // Check if user already exists
    const existing = await this.prisma.user.findUnique({
      where: { yandexId },
    });

    if (existing) {
      this.logger.log(
        `[AUTH] Existing user found: dbId=${existing.id}, yandexId=${existing.yandexId}, email=${existing.email}`,
      );
      // Update profile fields in case they changed
      const user = await this.prisma.user.update({
        where: { yandexId },
        data: { email, name },
      });
      return user;
    }

    // No existing user — check for orphan duplicates by email before creating
    const byEmail = await this.prisma.user.findFirst({ where: { email } });
    if (byEmail) {
      this.logger.warn(
        `[AUTH] User with email=${email} exists but has different yandexId: ` +
        `existing.yandexId=${byEmail.yandexId}, new yandexId=${yandexId}. ` +
        `This may indicate duplicate accounts. Using yandexId as canonical key.`,
      );
    }

    const user = await this.prisma.user.create({
      data: { yandexId, email, name },
    });

    this.logger.log(
      `[AUTH] New user created: dbId=${user.id}, yandexId=${yandexId}, email=${email}`,
    );

    return user;
  }

  private async getYandexUserInfo(
    accessToken: string,
  ): Promise<YandexUserInfo> {
    const response = await fetch('https://login.yandex.ru/info?format=json', {
      headers: { Authorization: `OAuth ${accessToken}` },
    });
    if (!response.ok)
      throw new UnauthorizedException('Failed to get Yandex user info');
    const data = await response.json();
    this.logger.debug(`[AUTH] Raw Yandex API response keys: ${Object.keys(data).join(', ')}`);
    return data;
  }
}
