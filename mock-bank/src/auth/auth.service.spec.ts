import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthService', () => {
  let service: AuthService;
  let configService: { get: jest.Mock };

  beforeEach(async () => {
    configService = {
      get: jest.fn((key: string) => {
        const map: Record<string, string> = {
          YANDEX_CLIENT_ID: 'test-client-id',
          YANDEX_REDIRECT_URI: 'http://localhost:3001/auth/yandex/callback',
        };
        return map[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: { sign: jest.fn(() => 'test-jwt') } },
        { provide: ConfigService, useValue: configService },
        { provide: PrismaService, useValue: { user: { upsert: jest.fn() } } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('getYandexAuthUrl', () => {
    it('should return a valid Yandex OAuth URL', () => {
      const url = service.getYandexAuthUrl();
      expect(url).toContain('https://oauth.yandex.ru/authorize');
      expect(url).toContain('client_id=test-client-id');
      expect(url).toContain('response_type=code');
    });
  });
});
