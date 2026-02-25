import { TokenEncryptionService } from './token-encryption.service';
import { ConfigService } from '@nestjs/config';

const TEST_KEY =
  'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';

function createService(key = TEST_KEY): TokenEncryptionService {
  const configService = {
    get: jest.fn().mockReturnValue(key),
  } as unknown as ConfigService;
  return new TokenEncryptionService(configService);
}

describe('TokenEncryptionService', () => {
  it('should encrypt and decrypt back to original', () => {
    const service = createService();
    const plaintext = 'eyJhbGciOiJIUzI1NiJ9.test-jwt-token';
    const encrypted = service.encrypt(plaintext);
    expect(encrypted).not.toBe(plaintext);
    expect(service.decrypt(encrypted)).toBe(plaintext);
  });

  it('should produce different ciphertext for same plaintext (random IV)', () => {
    const service = createService();
    const plaintext = 'same-token';
    const a = service.encrypt(plaintext);
    const b = service.encrypt(plaintext);
    expect(a).not.toBe(b);
    // But both decrypt to same value
    expect(service.decrypt(a)).toBe(plaintext);
    expect(service.decrypt(b)).toBe(plaintext);
  });

  it('should produce consistent fingerprints', () => {
    const service = createService();
    const a = service.fingerprint('token-abc');
    const b = service.fingerprint('token-abc');
    expect(a).toBe(b);
    expect(a).toHaveLength(64); // SHA-256 hex
  });

  it('should produce different fingerprints for different tokens', () => {
    const service = createService();
    const a = service.fingerprint('token-1');
    const b = service.fingerprint('token-2');
    expect(a).not.toBe(b);
  });

  it('should throw on invalid key length', () => {
    expect(() => createService('short')).toThrow(
      'TOKEN_ENCRYPTION_KEY must be a 64-char hex string',
    );
  });

  it('should throw on missing key', () => {
    expect(() => createService(null as any)).toThrow(
      'TOKEN_ENCRYPTION_KEY must be a 64-char hex string',
    );
  });

  it('should handle empty string encryption', () => {
    const service = createService();
    const encrypted = service.encrypt('');
    expect(service.decrypt(encrypted)).toBe('');
  });

  it('should handle unicode content', () => {
    const service = createService();
    const unicode = 'токен-с-юникодом-🔐';
    const encrypted = service.encrypt(unicode);
    expect(service.decrypt(encrypted)).toBe(unicode);
  });
});
