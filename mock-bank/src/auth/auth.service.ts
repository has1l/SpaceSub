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
import { PrismaService } from '../prisma/prisma.service';
import { OAuthStateStore } from './oauth-state.store';

// ── Shared HTTPS keep-alive agent ────────────────────────────
const keepAliveAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 30_000,
  maxSockets: 10,
  lookup: (hostname, options, callback) => {
    dns.lookup(hostname, { ...(typeof options === 'object' ? options : {}), family: 4 }, callback);
  },
});

// ── Yandex API client (retry on network errors only) ─────────
const yandexClient = axios.create({ timeout: 15_000, httpsAgent: keepAliveAgent });
axiosRetry(yandexClient, {
  retries: 2,
  retryDelay: (retryCount) => retryCount * 1_000,
  retryCondition: (error) => {
    if (error.response) return false;
    return axiosRetry.isNetworkError(error) || error.code === 'ECONNABORTED';
  },
  onRetry: (retryCount, error) => {
    console.log(`[mock-bank:yandex] retry #${retryCount}: ${error.code ?? 'UNKNOWN'} — ${error.message}`);
  },
});

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
    const redirectUri = this.configService.get('YANDEX_REDIRECT_URI');

    this.logger.log(`Exchanging Yandex auth code: client_id=${clientId}, redirect_uri=${redirectUri}`);

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    });

    try {
      const response = await yandexClient.post('https://oauth.yandex.ru/token', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      this.logger.log('Yandex token exchange successful');
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        this.logger.error(
          `Yandex token exchange HTTP ${error.response.status}: ${JSON.stringify(error.response.data)}`,
        );
        throw new UnauthorizedException('Failed to exchange Yandex auth code');
      }
      this.logger.error(
        `Yandex token exchange network error: ${error instanceof Error ? error.message : error}`,
      );
      throw new InternalServerErrorException('Yandex token exchange network failure');
    }
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

    // Auto-provision: account + demo subscriptions + transaction history
    try {
      await this.provisionNewUser(user.id);
    } catch (e) {
      this.logger.error(`[AUTH] Provision failed: ${e instanceof Error ? e.message : e}`);
    }

    return user;
  }

  /**
   * Auto-provision new users with account, subscriptions & transaction history.
   */
  private async provisionNewUser(userId: string) {
    // 1. Create checking account
    const account = await this.prisma.account.create({
      data: {
        userId,
        name: 'Основной счёт',
        currency: 'RUB',
        initialBalance: 150000,
      },
    });

    // 2. Pick 4-6 random popular services to subscribe
    const allServices = await this.prisma.serviceCatalog.findMany({
      where: { isActive: true, periodDays: 30 },
      orderBy: { amount: 'asc' },
    });

    if (allServices.length === 0) return;

    // Shuffle and pick 5
    const shuffled = allServices.sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, Math.min(5, shuffled.length));

    // Stagger subscription start offsets so charges spread across the month
    const startOffsets = [2, 7, 13, 19, 25];

    for (let i = 0; i < picked.length; i++) {
      const service = picked[i];
      const dayOffset = startOffsets[i % startOffsets.length];

      const rp = await this.prisma.recurringPayment.create({
        data: {
          accountId: account.id,
          merchant: service.name,
          amount: -service.amount,
          currency: service.currency,
          category: service.category,
          periodDays: service.periodDays,
          nextChargeDate: new Date(Date.now() + dayOffset * 86400000),
          status: 'ACTIVE',
        },
      });

      await this.prisma.userSubscription.create({
        data: {
          userId,
          serviceId: service.id,
          accountId: account.id,
          recurringPaymentId: rp.id,
          status: 'ACTIVE',
          subscribedAt: new Date(Date.now() - (Math.floor(Math.random() * 60) + 30) * 86400000),
        },
      });

      // Generate 4 months of transaction history with staggered dates
      for (let m = 0; m < 4; m++) {
        const date = new Date();
        date.setDate(date.getDate() - m * service.periodDays - dayOffset);
        date.setHours(10 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 60), 0, 0);

        await this.prisma.transaction.create({
          data: {
            accountId: account.id,
            date,
            amount: -service.amount,
            currency: service.currency,
            description: `Подписка: ${service.name}`,
            merchant: service.name,
            type: 'EXPENSE',
            category: service.category,
          },
        });
      }
    }

    // 3. Add many one-off transactions spread across 4 months for rich analytics
    const oneOffs = [
      // Last 7 days
      { days: 1,  amount: -2300,  desc: 'Магнит',           merchant: 'Magnit',      type: 'EXPENSE' as const, cat: 'SUPERMARKETS' as const },
      { days: 3,  amount: -4500,  desc: 'Пятёрочка',        merchant: 'Pyaterochka', type: 'EXPENSE' as const, cat: 'SUPERMARKETS' as const },
      { days: 5,  amount: -1200,  desc: 'Яндекс Такси',     merchant: 'Yandex Taxi', type: 'EXPENSE' as const, cat: 'TRANSPORT' as const },
      { days: 6,  amount: -850,   desc: 'Кофейня',           merchant: 'Coffee Shop', type: 'EXPENSE' as const, cat: 'RESTAURANTS' as const },
      // 7-14 days
      { days: 8,  amount: 85000,  desc: 'Зарплата',          merchant: null,          type: 'INCOME' as const,  cat: 'OTHER' as const },
      { days: 9,  amount: -3200,  desc: 'Ресторан',           merchant: 'Restaurant',  type: 'EXPENSE' as const, cat: 'RESTAURANTS' as const },
      { days: 11, amount: -1500,  desc: 'Wildberries',       merchant: 'Wildberries', type: 'EXPENSE' as const, cat: 'OTHER' as const },
      { days: 13, amount: -2100,  desc: 'Аптека',             merchant: 'Pharmacy',    type: 'EXPENSE' as const, cat: 'HEALTH' as const },
      // 14-30 days
      { days: 16, amount: -5200,  desc: 'Перекрёсток',       merchant: 'Perekrestok', type: 'EXPENSE' as const, cat: 'SUPERMARKETS' as const },
      { days: 18, amount: -1800,  desc: 'Uber поездка',      merchant: 'Uber',        type: 'EXPENSE' as const, cat: 'TRANSPORT' as const },
      { days: 21, amount: -950,   desc: 'Кафе Му-Му',        merchant: 'Mu-Mu',       type: 'EXPENSE' as const, cat: 'RESTAURANTS' as const },
      { days: 24, amount: -3800,  desc: 'Пятёрочка',         merchant: 'Pyaterochka', type: 'EXPENSE' as const, cat: 'SUPERMARKETS' as const },
      { days: 27, amount: -1400,  desc: 'Яндекс Такси',      merchant: 'Yandex Taxi', type: 'EXPENSE' as const, cat: 'TRANSPORT' as const },
      // 30-60 days
      { days: 32, amount: -4200,  desc: 'Лента',              merchant: 'Lenta',       type: 'EXPENSE' as const, cat: 'SUPERMARKETS' as const },
      { days: 35, amount: 85000,  desc: 'Зарплата',           merchant: null,          type: 'INCOME' as const,  cat: 'OTHER' as const },
      { days: 38, amount: -2800,  desc: 'Ресторан',            merchant: 'Restaurant',  type: 'EXPENSE' as const, cat: 'RESTAURANTS' as const },
      { days: 42, amount: -1600,  desc: 'Аптека',              merchant: 'Pharmacy',    type: 'EXPENSE' as const, cat: 'HEALTH' as const },
      { days: 45, amount: -900,   desc: 'Яндекс Такси',       merchant: 'Yandex Taxi', type: 'EXPENSE' as const, cat: 'TRANSPORT' as const },
      { days: 48, amount: -5600,  desc: 'Перекрёсток',        merchant: 'Perekrestok', type: 'EXPENSE' as const, cat: 'SUPERMARKETS' as const },
      { days: 52, amount: -2200,  desc: 'OZON заказ',         merchant: 'Ozon',        type: 'EXPENSE' as const, cat: 'OTHER' as const },
      // 60-90 days
      { days: 62, amount: 85000,  desc: 'Зарплата',           merchant: null,          type: 'INCOME' as const,  cat: 'OTHER' as const },
      { days: 65, amount: -3500,  desc: 'Пятёрочка',          merchant: 'Pyaterochka', type: 'EXPENSE' as const, cat: 'SUPERMARKETS' as const },
      { days: 70, amount: -1300,  desc: 'Uber поездка',       merchant: 'Uber',        type: 'EXPENSE' as const, cat: 'TRANSPORT' as const },
      { days: 75, amount: -2900,  desc: 'Ресторан',            merchant: 'Restaurant',  type: 'EXPENSE' as const, cat: 'RESTAURANTS' as const },
      { days: 80, amount: -4100,  desc: 'Лента',               merchant: 'Lenta',       type: 'EXPENSE' as const, cat: 'SUPERMARKETS' as const },
      // 90-120 days
      { days: 92, amount: 85000,  desc: 'Зарплата',            merchant: null,          type: 'INCOME' as const,  cat: 'OTHER' as const },
      { days: 95, amount: -3700,  desc: 'Перекрёсток',         merchant: 'Perekrestok', type: 'EXPENSE' as const, cat: 'SUPERMARKETS' as const },
      { days: 100, amount: -1100, desc: 'Яндекс Такси',        merchant: 'Yandex Taxi', type: 'EXPENSE' as const, cat: 'TRANSPORT' as const },
      { days: 110, amount: -2500, desc: 'Аптека',               merchant: 'Pharmacy',    type: 'EXPENSE' as const, cat: 'HEALTH' as const },
    ];

    for (const t of oneOffs) {
      const date = new Date();
      date.setDate(date.getDate() - t.days);
      date.setHours(12, 0, 0, 0);

      await this.prisma.transaction.create({
        data: {
          accountId: account.id,
          date,
          amount: t.amount,
          description: t.desc,
          merchant: t.merchant,
          type: t.type,
          category: t.cat,
        },
      });
    }

    this.logger.log(`[AUTH] Provisioned user ${userId}: account + ${picked.length} subscriptions + transaction history`);
  }

  private async getYandexUserInfo(
    accessToken: string,
  ): Promise<YandexUserInfo> {
    try {
      const response = await yandexClient.get('https://login.yandex.ru/info?format=json', {
        headers: { Authorization: `OAuth ${accessToken}` },
      });

      this.logger.debug(`[AUTH] Raw Yandex API response keys: ${Object.keys(response.data).join(', ')}`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        this.logger.error(`Yandex user info HTTP ${error.response.status}: ${JSON.stringify(error.response.data)}`);
        throw new UnauthorizedException('Failed to get Yandex user info');
      }
      this.logger.error(
        `Yandex user info network error: ${error instanceof Error ? error.message : error}`,
      );
      throw new InternalServerErrorException('Yandex user info network failure');
    }
  }
}
