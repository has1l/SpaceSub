import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConnectionCodeService } from './connection-code.service';
import { TokenEncryptionService } from './token-encryption.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ConnectionCodeService', () => {
  let service: ConnectionCodeService;
  let prisma: jest.Mocked<PrismaService>;
  let jwtService: jest.Mocked<JwtService>;
  let tokenEncryption: TokenEncryptionService;

  const mockUser = { id: 'user-1', email: 'test@flex.com', name: 'Test' };
  const testKey = 'a'.repeat(64);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConnectionCodeService,
        {
          provide: TokenEncryptionService,
          useFactory: () => {
            const configService = { get: (key: string) => key === 'TOKEN_ENCRYPTION_KEY' ? testKey : undefined };
            return new TokenEncryptionService(configService as any);
          },
        },
        {
          provide: PrismaService,
          useValue: {
            user: { findUnique: jest.fn() },
            connectionCode: {
              create: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('signed-jwt-token'),
          },
        },
      ],
    }).compile();

    service = module.get(ConnectionCodeService);
    prisma = module.get(PrismaService) as any;
    jwtService = module.get(JwtService) as any;
    tokenEncryption = module.get(TokenEncryptionService);
  });

  describe('generateCode', () => {
    it('should generate a code in FB-XXXXXX format', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser as any);
      prisma.connectionCode.create.mockResolvedValue({} as any);

      const result = await service.generateCode('user-1');

      expect(result.code).toMatch(/^FB-[A-Z0-9]{6}$/);
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should store code as SHA-256 hash, not plaintext', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser as any);
      prisma.connectionCode.create.mockResolvedValue({} as any);

      await service.generateCode('user-1');

      const createCall = prisma.connectionCode.create.mock.calls[0][0];
      const data = createCall.data as any;
      // codeHash should be a 64-char hex string (SHA-256)
      expect(data.codeHash).toMatch(/^[a-f0-9]{64}$/);
      // Should NOT contain the raw code
      expect(data.codeHash).not.toMatch(/^FB-/);
    });

    it('should store token as encrypted, not plaintext', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser as any);
      prisma.connectionCode.create.mockResolvedValue({} as any);

      await service.generateCode('user-1');

      const createCall = prisma.connectionCode.create.mock.calls[0][0];
      const data = createCall.data as any;
      // encryptedToken should be base64
      expect(data.encryptedToken).toBeTruthy();
      expect(data.encryptedToken).not.toBe('signed-jwt-token');
      // Should be decryptable
      const decrypted = tokenEncryption.decrypt(data.encryptedToken);
      expect(decrypted).toBe('signed-jwt-token');
    });

    it('should set 5-minute TTL', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser as any);
      prisma.connectionCode.create.mockResolvedValue({} as any);

      const before = Date.now();
      const result = await service.generateCode('user-1');
      const after = Date.now();

      const ttlMs = result.expiresAt.getTime() - before;
      expect(ttlMs).toBeGreaterThanOrEqual(4 * 60 * 1000); // at least 4 min
      expect(ttlMs).toBeLessThanOrEqual(5 * 60 * 1000 + (after - before)); // at most 5 min + exec time
    });

    it('should throw if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.generateCode('nonexistent')).rejects.toThrow('User not found');
    });

    it('should sign JWT with user id and email', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser as any);
      prisma.connectionCode.create.mockResolvedValue({} as any);

      await service.generateCode('user-1');

      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 'user-1',
        email: 'test@flex.com',
      });
    });
  });

  describe('redeemByHash', () => {
    const validRecord = {
      id: 'code-1',
      codeHash: 'abc123',
      encryptedToken: '',
      expiresAt: new Date(Date.now() + 300_000),
      used: false,
      attempts: 0,
      flexUserId: 'user-1',
      createdAt: new Date(),
    };

    beforeEach(() => {
      // Encrypt a test token for the valid record
      validRecord.encryptedToken = tokenEncryption.encrypt('test-jwt-token');
    });

    it('should return decrypted token for valid code', async () => {
      prisma.connectionCode.findUnique.mockResolvedValue(validRecord as any);
      prisma.connectionCode.update.mockResolvedValue({} as any);

      const result = await service.redeemByHash('abc123');

      expect(result).toEqual({ accessToken: 'test-jwt-token' });
    });

    it('should mark code as used after successful redemption', async () => {
      prisma.connectionCode.findUnique.mockResolvedValue(validRecord as any);
      prisma.connectionCode.update.mockResolvedValue({} as any);

      await service.redeemByHash('abc123');

      expect(prisma.connectionCode.update).toHaveBeenCalledWith({
        where: { id: 'code-1' },
        data: { used: true, attempts: { increment: 1 } },
      });
    });

    it('should return null for non-existent code', async () => {
      prisma.connectionCode.findUnique.mockResolvedValue(null);

      const result = await service.redeemByHash('nonexistent');
      expect(result).toBeNull();
    });

    it('should return null for already used code', async () => {
      prisma.connectionCode.findUnique.mockResolvedValue({
        ...validRecord,
        used: true,
      } as any);
      prisma.connectionCode.update.mockResolvedValue({} as any);

      const result = await service.redeemByHash('abc123');
      expect(result).toBeNull();
    });

    it('should increment attempts for already used code', async () => {
      prisma.connectionCode.findUnique.mockResolvedValue({
        ...validRecord,
        used: true,
      } as any);
      prisma.connectionCode.update.mockResolvedValue({} as any);

      await service.redeemByHash('abc123');

      expect(prisma.connectionCode.update).toHaveBeenCalledWith({
        where: { id: 'code-1' },
        data: { attempts: { increment: 1 } },
      });
    });

    it('should return null for expired code', async () => {
      prisma.connectionCode.findUnique.mockResolvedValue({
        ...validRecord,
        expiresAt: new Date(Date.now() - 1000), // expired
      } as any);
      prisma.connectionCode.update.mockResolvedValue({} as any);

      const result = await service.redeemByHash('abc123');
      expect(result).toBeNull();
    });

    it('should return BLOCKED after max attempts exceeded', async () => {
      prisma.connectionCode.findUnique.mockResolvedValue({
        ...validRecord,
        attempts: 5,
      } as any);

      const result = await service.redeemByHash('abc123');
      expect(result).toBe('BLOCKED');
    });

    it('should return BLOCKED at exactly max attempts', async () => {
      prisma.connectionCode.findUnique.mockResolvedValue({
        ...validRecord,
        attempts: 5,
      } as any);

      const result = await service.redeemByHash('abc123');
      expect(result).toBe('BLOCKED');
    });
  });
});
