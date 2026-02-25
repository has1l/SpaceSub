import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { BankProvider } from '@prisma/client';
import { BankOAuthStateStore } from '../bank-oauth-state.store';
import { TokenEncryptionService } from './token-encryption.service';

@Injectable()
export class BankOAuthService {
  private readonly logger = new Logger(BankOAuthService.name);

  constructor(
    private configService: ConfigService,
    private bankOAuthStateStore: BankOAuthStateStore,
    private tokenEncryption: TokenEncryptionService,
    private prisma: PrismaService,
  ) {}

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
    this.logger.log(
      `Flex OAuth URL generated for user ${userId}, redirect_uri=${redirectUri}`,
    );
    return url;
  }

  async handleFlexCallback(code: string, state: string): Promise<string> {
    // 1. Validate state and extract userId
    const result = this.bankOAuthStateStore.validateWithMetadata(state);
    if (!result.valid || !result.metadata?.userId) {
      throw new UnauthorizedException('Invalid or expired bank OAuth state');
    }
    const userId = result.metadata.userId;
    this.logger.log(`Flex OAuth callback: state valid, userId=${userId}`);

    // 2. Exchange code for Yandex access token (using Flex Bank's credentials)
    const yandexToken = await this.exchangeCodeForYandexToken(code);
    this.logger.log('Flex OAuth: Yandex token obtained');

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

  private async exchangeCodeForYandexToken(code: string): Promise<string> {
    const clientId = this.configService.get('FLEX_BANK_OAUTH_CLIENT_ID');
    const clientSecret = this.configService.get(
      'FLEX_BANK_OAUTH_CLIENT_SECRET',
    );

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

    if (!response.ok) {
      const text = await response.text();
      this.logger.error(`Yandex token exchange failed: ${text}`);
      throw new UnauthorizedException('Failed to exchange Yandex auth code');
    }

    const data = await response.json();
    return data.access_token;
  }

  private async exchangeForFlexBankJwt(
    yandexAccessToken: string,
  ): Promise<string> {
    const baseUrl =
      this.configService.get('FLEX_BANK_BASE_URL') || 'http://localhost:3001';

    const response = await fetch(`${baseUrl}/auth/token-exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ yandexAccessToken }),
    });

    if (!response.ok) {
      const text = await response.text();
      this.logger.error(`Flex Bank token exchange failed: ${text}`);
      throw new UnauthorizedException(
        'Failed to exchange for Flex Bank token',
      );
    }

    const data = await response.json();
    return data.accessToken;
  }
}
