import {
  Injectable,
  Logger,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import axiosRetry from 'axios-retry';
import { PrismaService } from '../../prisma/prisma.service';
import { BankProvider } from '@prisma/client';
import { BankOAuthStateStore } from '../bank-oauth-state.store';
import { TokenEncryptionService } from './token-encryption.service';
import { OAuthCodeExpiredException } from '../../auth/oauth-code-expired.exception';

// ── Yandex OAuth client ──────────────────────────────────────
// 15s timeout to survive Railway cold starts (DNS + TLS + response).
// ONLY network errors are retried — never HTTP 4xx (invalid_grant, etc.)
// because authorization codes are single-use and expire in seconds.
const yandexClient = axios.create({ timeout: 15_000 });
axiosRetry(yandexClient, {
  retries: 2,
  retryDelay: (retryCount) => retryCount * 1_000,
  retryCondition: (error) => {
    if (error.response) return false;
    return (
      axiosRetry.isNetworkError(error) || error.code === 'ECONNABORTED'
    );
  },
  onRetry: (retryCount, error) => {
    console.log(
      `[bank-oauth:yandex] retry #${retryCount}: ${error.code ?? 'UNKNOWN'} — ${error.message}`,
    );
  },
});

// ── Flex Bank client ─────────────────────────────────────────
// Mock-bank on Railway may also cold-start, so this needs retries too.
// Initialized lazily per-instance because baseURL comes from config.
function createFlexBankClient(baseURL: string) {
  const client = axios.create({ baseURL, timeout: 15_000 });
  axiosRetry(client, {
    retries: 3,
    retryDelay: (retryCount) => 2_000 * Math.pow(2, retryCount - 1),
    retryCondition: (error) =>
      axiosRetry.isNetworkError(error) ||
      axiosRetry.isRetryableError(error) ||
      error.code === 'ECONNABORTED',
    onRetry: (retryCount, error) => {
      console.log(
        `[bank-oauth:flex] retry #${retryCount}: ${error.code ?? 'UNKNOWN'} — ${error.message}`,
      );
    },
  });
  return client;
}

@Injectable()
export class BankOAuthService {
  private readonly logger = new Logger(BankOAuthService.name);
  private flexBankClient: ReturnType<typeof createFlexBankClient>;

  constructor(
    private configService: ConfigService,
    private bankOAuthStateStore: BankOAuthStateStore,
    private tokenEncryption: TokenEncryptionService,
    private prisma: PrismaService,
  ) {
    const baseUrl =
      this.configService.get('FLEX_BANK_BASE_URL') || 'http://localhost:3001';
    this.flexBankClient = createFlexBankClient(baseUrl);
    this.logger.log(`Flex Bank client → ${baseUrl}`);
  }

  getFlexOAuthUrl(userId: string): string {
    const clientId = this.configService.get('FLEX_BANK_OAUTH_CLIENT_ID');
    const redirectUri = this.configService.get('FLEX_BANK_OAUTH_REDIRECT_URI');
    const state = this.bankOAuthStateStore.generate({ userId });

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
    console.log('BANK OAUTH REDIRECT TIME:', Date.now());
    this.logger.log(
      `Flex OAuth URL generated for user ${userId}, redirect_uri=${redirectUri}`,
    );
    return url;
  }

  async handleFlexCallback(code: string, state: string): Promise<string> {
    const callbackTime = Date.now();
    console.log('BANK CALLBACK HANDLER START:', callbackTime);

    // 1. Exchange code IMMEDIATELY — authorization codes expire in seconds.
    //    This MUST happen before any other work to avoid invalid_grant.
    const yandexToken = await this.exchangeCodeForYandexToken(code, callbackTime);
    this.logger.log('Flex OAuth: Yandex token obtained');

    // 2. Validate state and extract userId (cheap JWT verify, no I/O)
    const result = this.bankOAuthStateStore.validateWithMetadata(state);
    if (!result.valid || !result.metadata?.userId) {
      throw new UnauthorizedException('Invalid or expired bank OAuth state');
    }
    const userId = result.metadata.userId;
    this.logger.log(`Flex OAuth callback: state valid, userId=${userId}`);

    if (result.timestamp) {
      const roundtripMs = callbackTime - result.timestamp;
      console.log('BANK OAUTH ROUNDTRIP:', roundtripMs, 'ms');
      console.log('BANK OAUTH REDIRECT TIME:', result.timestamp);
    }

    // 3. Call mock-bank token-exchange endpoint
    const flexBankJwt = await this.exchangeForFlexBankJwt(yandexToken);
    this.logger.log('Flex OAuth: Flex Bank JWT obtained');

    // 4. Encrypt and store
    const encrypted = this.tokenEncryption.encrypt(flexBankJwt);
    const fingerprint = this.tokenEncryption.fingerprint(flexBankJwt);

    await this.prisma.bankConnection.upsert({
      where: {
        userId_provider: { userId, provider: BankProvider.FLEX },
      },
      update: {
        accessToken: '[encrypted]',
        encryptedAccessToken: encrypted,
        tokenFingerprint: fingerprint,
        status: 'CONNECTED',
      },
      create: {
        userId,
        provider: BankProvider.FLEX,
        accessToken: '[encrypted]',
        encryptedAccessToken: encrypted,
        tokenFingerprint: fingerprint,
        status: 'CONNECTED',
      },
    });

    this.logger.log(`Flex Bank connected for user ${userId}`);
    return userId;
  }

  private async exchangeCodeForYandexToken(code: string, callbackTime?: number): Promise<string> {
    const now = Date.now();
    console.log('BANK TOKEN EXCHANGE START:', now);
    if (callbackTime) {
      console.log('BANK CALLBACK → TOKEN EXCHANGE DELAY:', now - callbackTime, 'ms');
    }

    const clientId = this.configService.get('FLEX_BANK_OAUTH_CLIENT_ID');
    const clientSecret = this.configService.get(
      'FLEX_BANK_OAUTH_CLIENT_SECRET',
    );
    const redirectUri = this.configService.get('FLEX_BANK_OAUTH_REDIRECT_URI');

    this.logger.log(
      `[BANK-OAUTH:token-exchange] client_id=${clientId}, redirect_uri=${redirectUri}`,
    );

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
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      );
      this.logger.log('[BANK-OAUTH:token-exchange] success');
      return response.data.access_token;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const data = error.response.data;
        this.logger.error(
          `[BANK-OAUTH:token-exchange] HTTP ${error.response.status}: ${JSON.stringify(data)}`,
        );

        // Expired code — let the controller restart the OAuth flow
        if (
          data?.error === 'invalid_grant' &&
          typeof data?.error_description === 'string' &&
          data.error_description.toLowerCase().includes('expired')
        ) {
          this.logger.warn('[BANK-OAUTH:token-exchange] code expired — will restart OAuth flow');
          throw new OAuthCodeExpiredException();
        }

        if (error.response.status === 400 || error.response.status === 401) {
          throw new UnauthorizedException(
            `Yandex rejected token exchange: ${data?.error ?? error.response.status}`,
          );
        }
      } else {
        this.logger.error(
          `[BANK-OAUTH:token-exchange] network error: ${error instanceof Error ? error.message : error}`,
        );
      }
      throw new InternalServerErrorException(
        'Yandex token exchange network failure',
      );
    }
  }

  private async exchangeForFlexBankJwt(
    yandexAccessToken: string,
  ): Promise<string> {
    this.logger.log('[BANK-OAUTH:flex-exchange] calling mock-bank /auth/token-exchange');

    try {
      const response = await this.flexBankClient.post(
        '/auth/token-exchange',
        { yandexAccessToken },
        { headers: { 'Content-Type': 'application/json' } },
      );
      this.logger.log('[BANK-OAUTH:flex-exchange] success');
      return response.data.accessToken;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        this.logger.error(
          `[BANK-OAUTH:flex-exchange] HTTP ${error.response.status}: ${JSON.stringify(error.response.data)}`,
        );
        if (error.response.status === 401) {
          throw new UnauthorizedException(
            'Flex Bank rejected the Yandex token',
          );
        }
      } else {
        this.logger.error(
          `[BANK-OAUTH:flex-exchange] network error: ${error instanceof Error ? error.message : error}`,
        );
      }
      throw new InternalServerErrorException(
        'Flex Bank token exchange network failure',
      );
    }
  }
}
