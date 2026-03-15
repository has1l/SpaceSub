import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { OAuthStateStore } from './oauth-state.store';

describe('AuthService (flexbank)', () => {
  let service: AuthService;
  let configService: { get: jest.Mock };
  let jwtService: JwtService;

  beforeEach(async () => {
    configService = {
      get: jest.fn((key: string) => {
        const map: Record<string, string> = {
          YANDEX_CLIENT_ID: 'flexbank-client-id',
          YANDEX_REDIRECT_URI:
            'http://localhost:5174/bank-api/auth/yandex/callback',
        };
        return map[key];
      }),
    };

    jwtService = new JwtService({ secret: 'test-secret' });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: jwtService,
        },
        { provide: ConfigService, useValue: configService },
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn().mockResolvedValue(null),
              findFirst: jest.fn().mockResolvedValue(null),
              create: jest.fn().mockResolvedValue({
                id: 'user-uuid',
                yandexId: 'yandex-123',
                email: 'test@ya.ru',
                name: 'Test User',
              }),
              update: jest.fn(),
            },
          },
        },
        OAuthStateStore,
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('getYandexAuthUrl', () => {
    it('should return a valid Yandex OAuth URL with all params', () => {
      const url = service.getYandexAuthUrl();
      expect(url).toContain('https://oauth.yandex.ru/authorize');
      expect(url).toContain('client_id=flexbank-client-id');
      expect(url).toContain('redirect_uri=');
      expect(url).toContain('localhost%3A5174');
      expect(url).toContain('bank-api');
      expect(url).toContain('state=');
      expect(url).toContain('force_confirm=true');
      expect(url).toContain('prompt=select_account');
      expect(url).toContain('scope=login');
    });
  });

  describe('exchangeYandexToken', () => {
    it('should call getYandexUserInfo, upsert user, and return JWT', async () => {
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

      const result = await service.exchangeYandexToken('yandex-access-token');

      expect(result).toHaveProperty('accessToken');
      expect(typeof result.accessToken).toBe('string');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://login.yandex.ru/info?format=json',
        expect.objectContaining({
          headers: { Authorization: 'OAuth yandex-access-token' },
        }),
      );
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

    it('should throw for invalid state', () => {
      expect(() => service.validateState('invalid-state-token')).toThrow();
    });
  });
});
