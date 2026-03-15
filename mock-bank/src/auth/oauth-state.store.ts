import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

const STATE_TTL_SECONDS = 5 * 60; // 5 minutes

@Injectable()
export class OAuthStateStore {
  private readonly logger = new Logger(OAuthStateStore.name);

  constructor(private readonly jwtService: JwtService) {}

  generate(): string {
    const payload = {
      timestamp: Date.now(),
      purpose: 'flexbank_oauth_state',
    };

    const state = this.jwtService.sign(payload, {
      expiresIn: STATE_TTL_SECONDS,
    });

    this.logger.debug('OAuth state generated (JWT-based)');
    return state;
  }

  validate(state: string | undefined): boolean {
    if (!state) {
      this.logger.warn('OAuth callback: state missing');
      return false;
    }

    try {
      const payload = this.jwtService.verify(state);

      if (payload.purpose !== 'flexbank_oauth_state') {
        this.logger.warn('OAuth callback: state JWT has wrong purpose');
        return false;
      }

      this.logger.debug('OAuth state validated (JWT-based)');
      return true;
    } catch (error) {
      this.logger.warn(
        `OAuth callback: state JWT invalid — ${error instanceof Error ? error.message : error}`,
      );
      return false;
    }
  }
}
