import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { OAuthStateStore } from './oauth-state.store';

describe('AuthService (flexbank)', () => {
  let service: AuthService;
  let configService: { get: jest.Mock };
  let stateStore: OAuthStateStore;

  beforeEach(async () => {
    configService = {
      get: jest.fn((key: string) => {
        const map: Record<string, string> = {
          YANDEX_CLIENT_ID: 'flexbank-client-id',
          YANDEX_REDIRECT_URI:
            'http://flexbank.localhost:3001/auth/yandex/callback',
        };
        return map[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: { sign: jest.fn(() => 'test-jwt') },
        },
        { provide: ConfigService, useValue: configService },
        {
          provide: PrismaService,
          useValue: { user: { upsert: jest.fn() } },
        },
        OAuthStateStore,
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    stateStore = module.get<OAuthStateStore>(OAuthStateStore);
  });

  afterEach(() => {
    stateStore.onModuleDestroy();
  });

  describe('getYandexAuthUrl', () => {
    it('should return a valid Yandex OAuth URL with all params', () => {
      const url = service.getYandexAuthUrl();
      expect(url).toContain('https://oauth.yandex.ru/authorize');
      expect(url).toContain('client_id=flexbank-client-id');
      expect(url).toContain('redirect_uri=');
      expect(url).toContain('flexbank.localhost');
      expect(url).toContain('state=flexbank_');
      expect(url).toContain('force_confirm=true');
      expect(url).toContain('prompt=select_account');
      expect(url).toContain('scope=login');
    });
  });

  describe('exchangeYandexToken', () => {
    it('should call getYandexUserInfo, upsert user, and return JWT', async () => {
      // Mock fetch globally
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'yandex-123',
            default_email: 'test@ya.ru',
            display_name: 'Test User',
          }),
      });
      global.fetch = mockFetch;

      const prismaWithUpsert = {
        user: {
          upsert: jest.fn().mockResolvedValue({
            id: 'user-uuid',
            email: 'test@ya.ru',
          }),
        },
      };
      const jwtSign = jest.fn(() => 'flex-jwt-token');

      const mod = await Test.createTestingModule({
        providers: [
          AuthService,
          { provide: JwtService, useValue: { sign: jwtSign } },
          { provide: ConfigService, useValue: configService },
          { provide: PrismaService, useValue: prismaWithUpsert },
          OAuthStateStore,
        ],
      }).compile();

      const svc = mod.get<AuthService>(AuthService);
      const result = await svc.exchangeYandexToken('yandex-access-token');

      expect(result).toEqual({ accessToken: 'flex-jwt-token' });
      expect(mockFetch).toHaveBeenCalledWith(
        'https://login.yandex.ru/info?format=json',
        expect.objectContaining({
          headers: { Authorization: 'OAuth yandex-access-token' },
        }),
      );
      expect(prismaWithUpsert.user.upsert).toHaveBeenCalled();

      mod.get<OAuthStateStore>(OAuthStateStore).onModuleDestroy();
    });
  });

  describe('validateState', () => {
    it('should not throw for valid state', () => {
      const url = service.getYandexAuthUrl();
      const state = new URL(url).searchParams.get('state')!;
      expect(() => service.validateState(state)).not.toThrow();
    });

    it('should throw for missing state', () => {
      expect(() => service.validateState(undefined)).toThrow();
    });

    it('should throw for wrong prefix', () => {
      expect(() => service.validateState('spacesub_fake')).toThrow();
    });
  });
});
