import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { BankOAuthService } from './bank-oauth.service';
import { BankOAuthStateStore } from '../bank-oauth-state.store';
import { TokenEncryptionService } from './token-encryption.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('BankOAuthService', () => {
  let service: BankOAuthService;
  let stateStore: BankOAuthStateStore;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        FLEX_BANK_OAUTH_CLIENT_ID: 'test-client-id',
        FLEX_BANK_OAUTH_CLIENT_SECRET: 'test-client-secret',
        FLEX_BANK_OAUTH_REDIRECT_URI:
          'http://spacesub.localhost:3000/bank-integration/flex/callback',
        FLEX_BANK_BASE_URL: 'http://localhost:3001',
        TOKEN_ENCRYPTION_KEY:
          'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
      };
      return config[key];
    }),
  };

  const mockPrisma = {
    bankConnection: {
      upsert: jest.fn().mockResolvedValue({ id: 'conn-1' }),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BankOAuthService,
        BankOAuthStateStore,
        TokenEncryptionService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(BankOAuthService);
    stateStore = module.get(BankOAuthStateStore);
  });

  afterEach(() => {
    stateStore.onModuleDestroy();
    jest.restoreAllMocks();
  });

  describe('getFlexOAuthUrl', () => {
    it('should return a valid Yandex OAuth URL', () => {
      const url = service.getFlexOAuthUrl('user-123');
      expect(url).toContain('https://oauth.yandex.ru/authorize');
      expect(url).toContain('client_id=test-client-id');
      expect(url).toContain(
        'redirect_uri=' +
          encodeURIComponent(
            'http://spacesub.localhost:3000/bank-integration/flex/callback',
          ),
      );
      expect(url).toContain('state=flexoauth_');
      expect(url).toContain('force_confirm=true');
      expect(url).toContain('prompt=select_account');
      expect(url).toContain('scope=login%3Aemail+login%3Ainfo');
    });

    it('should generate unique state per call', () => {
      const url1 = service.getFlexOAuthUrl('user-1');
      const url2 = service.getFlexOAuthUrl('user-1');
      const state1 = new URL(url1).searchParams.get('state');
      const state2 = new URL(url2).searchParams.get('state');
      expect(state1).not.toBe(state2);
    });
  });

  describe('handleFlexCallback', () => {
    it('should throw on invalid state', async () => {
      await expect(
        service.handleFlexCallback('code-123', 'invalid-state'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw on state without userId metadata', async () => {
      const state = stateStore.generate(); // no metadata
      await expect(
        service.handleFlexCallback('code-123', state),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw on reused state', async () => {
      const state = stateStore.generate({ userId: 'user-1' });
      // First use consumes the state
      stateStore.validateWithMetadata(state);
      // Second use should fail
      await expect(
        service.handleFlexCallback('code-123', state),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
