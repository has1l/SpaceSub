import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

const STATE_TTL_SECONDS = 5 * 60; // 5 minutes

@Injectable()
export class OAuthStateStore {
  private readonly logger = new Logger(OAuthStateStore.name);

  constructor(private readonly jwtService: JwtService) {}

  generate(platform?: string): string {
    const payload = {
      platform: platform ?? 'web',
      timestamp: Date.now(),
      purpose: 'oauth_state',
    };

    const state = this.jwtService.sign(payload, {
      expiresIn: STATE_TTL_SECONDS,
    });

    this.logger.debug(
      `OAuth state generated: platform=${payload.platform}`,
    );
    return state;
  }

  validate(state: string | undefined): { valid: boolean; platform?: string; timestamp?: number } {
    if (!state) {
      this.logger.warn('OAuth callback: state missing');
      return { valid: false };
    }

    try {
      const payload = this.jwtService.verify(state);

      if (payload.purpose !== 'oauth_state') {
        this.logger.warn('OAuth callback: state JWT has wrong purpose');
        return { valid: false };
      }

      this.logger.debug(
        `OAuth state validated: platform=${payload.platform}`,
      );
      return { valid: true, platform: payload.platform, timestamp: payload.timestamp };
    } catch (error) {
      this.logger.warn(
        `OAuth callback: state JWT invalid — ${error instanceof Error ? error.message : error}`,
      );
      return { valid: false };
    }
  }
}
