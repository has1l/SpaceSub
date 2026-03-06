import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { TokenEncryptionService } from './token-encryption.service';
import { randomBytes } from 'crypto';

const CODE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const CODE_LENGTH = 6;
const CODE_PREFIX = 'FB-';
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1
const MAX_ATTEMPTS = 5;

@Injectable()
export class ConnectionCodeService {
  private readonly logger = new Logger(ConnectionCodeService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private tokenEncryption: TokenEncryptionService,
  ) {}

  async generateCode(
    userId: string,
  ): Promise<{ code: string; expiresAt: Date }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    // Generate the Flex Bank JWT that will be transferred
    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
    });

    // Generate random short code
    const code = this.generateRandomCode();
    const codeHash = this.tokenEncryption.hash(code);
    const encryptedToken = this.tokenEncryption.encrypt(accessToken);
    const expiresAt = new Date(Date.now() + CODE_TTL_MS);

    await this.prisma.connectionCode.create({
      data: {
        codeHash,
        encryptedToken,
        expiresAt,
        flexUserId: userId,
      },
    });

    this.logger.log(
      `Connection code generated for user ${userId}, expires at ${expiresAt.toISOString()}`,
    );

    return { code, expiresAt };
  }

  /**
   * Redeem a connection code by its SHA-256 hash (server-to-server).
   * Returns the decrypted access token, null if invalid, or 'BLOCKED' if max attempts exceeded.
   */
  async redeemByHash(
    codeHash: string,
  ): Promise<{ accessToken: string } | 'BLOCKED' | null> {
    const record = await this.prisma.connectionCode.findUnique({
      where: { codeHash },
    });

    if (!record) {
      this.logger.warn('Connection code redeem: code not found');
      return null;
    }

    if (record.attempts >= MAX_ATTEMPTS) {
      this.logger.warn(
        `Connection code redeem: max attempts exceeded (id=${record.id})`,
      );
      return 'BLOCKED';
    }

    if (record.used) {
      this.logger.warn(
        `Connection code redeem: already used (id=${record.id})`,
      );
      await this.incrementAttempts(record.id);
      return null;
    }

    if (new Date() > record.expiresAt) {
      this.logger.warn(
        `Connection code redeem: expired (id=${record.id})`,
      );
      await this.incrementAttempts(record.id);
      return null;
    }

    // Mark as used atomically
    await this.prisma.connectionCode.update({
      where: { id: record.id },
      data: { used: true, attempts: { increment: 1 } },
    });

    // Decrypt and return the access token
    const accessToken = this.tokenEncryption.decrypt(record.encryptedToken);

    this.logger.log(
      `Connection code redeemed successfully (id=${record.id})`,
    );

    return { accessToken };
  }

  private async incrementAttempts(id: string): Promise<void> {
    await this.prisma.connectionCode.update({
      where: { id },
      data: { attempts: { increment: 1 } },
    });
  }

  private generateRandomCode(): string {
    const bytes = randomBytes(CODE_LENGTH);
    let code = CODE_PREFIX;
    for (let i = 0; i < CODE_LENGTH; i++) {
      code += CODE_CHARS[bytes[i] % CODE_CHARS.length];
    }
    return code;
  }
}
