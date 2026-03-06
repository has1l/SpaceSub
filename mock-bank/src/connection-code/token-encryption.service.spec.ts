import { TokenEncryptionService } from './token-encryption.service';

describe('TokenEncryptionService (mock-bank)', () => {
  const testKey = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';
  let service: TokenEncryptionService;

  beforeEach(() => {
    const configService = {
      get: (key: string) => (key === 'TOKEN_ENCRYPTION_KEY' ? testKey : undefined),
    };
    service = new TokenEncryptionService(configService as any);
  });

  describe('encrypt / decrypt', () => {
    it('should roundtrip encrypt and decrypt', () => {
      const plaintext = 'my-secret-jwt-token-12345';
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertexts for same plaintext (random IV)', () => {
      const plaintext = 'same-token';
      const a = service.encrypt(plaintext);
      const b = service.encrypt(plaintext);
      expect(a).not.toBe(b);
      // But both should decrypt to the same value
      expect(service.decrypt(a)).toBe(plaintext);
      expect(service.decrypt(b)).toBe(plaintext);
    });

    it('should handle empty string', () => {
      const encrypted = service.encrypt('');
      expect(service.decrypt(encrypted)).toBe('');
    });

    it('should handle unicode', () => {
      const plaintext = 'токен-с-юникодом-🔐';
      const encrypted = service.encrypt(plaintext);
      expect(service.decrypt(encrypted)).toBe(plaintext);
    });

    it('should throw on tampered ciphertext', () => {
      const encrypted = service.encrypt('test');
      const tampered = encrypted.slice(0, -2) + 'XX';
      expect(() => service.decrypt(tampered)).toThrow();
    });
  });

  describe('hash', () => {
    it('should produce 64-char hex SHA-256 hash', () => {
      const result = service.hash('FB-ABC123');
      expect(result).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should produce deterministic hashes', () => {
      const a = service.hash('FB-ABC123');
      const b = service.hash('FB-ABC123');
      expect(a).toBe(b);
    });

    it('should produce different hashes for different inputs', () => {
      const a = service.hash('FB-ABC123');
      const b = service.hash('FB-XYZ789');
      expect(a).not.toBe(b);
    });
  });

  describe('constructor validation', () => {
    it('should throw on missing key', () => {
      const configService = { get: () => undefined };
      expect(() => new TokenEncryptionService(configService as any)).toThrow(
        'TOKEN_ENCRYPTION_KEY must be a 64-char hex string',
      );
    });

    it('should throw on short key', () => {
      const configService = { get: () => 'tooshort' };
      expect(() => new TokenEncryptionService(configService as any)).toThrow(
        'TOKEN_ENCRYPTION_KEY must be a 64-char hex string',
      );
    });
  });
});
