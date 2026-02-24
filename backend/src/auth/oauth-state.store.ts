import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';

interface StateEntry {
  createdAt: number;
}

const STATE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const CLEANUP_INTERVAL_MS = 60 * 1000; // 1 minute

@Injectable()
export class OAuthStateStore {
  private readonly logger = new Logger(OAuthStateStore.name);
  private readonly states = new Map<string, StateEntry>();
  private readonly prefix: string;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.prefix = 'spacesub';
    this.cleanupTimer = setInterval(() => this.cleanup(), CLEANUP_INTERVAL_MS);
  }

  generate(): string {
    const state = `${this.prefix}_${randomUUID()}`;
    this.states.set(state, { createdAt: Date.now() });
    this.logger.debug(`OAuth state generated: ${state}`);
    return state;
  }

  validate(state: string | undefined): boolean {
    if (!state) {
      this.logger.warn('OAuth callback: state missing');
      return false;
    }

    if (!state.startsWith(`${this.prefix}_`)) {
      this.logger.warn(
        `OAuth callback: state prefix mismatch — expected "${this.prefix}_", got "${state.substring(0, 20)}..."`,
      );
      return false;
    }

    const entry = this.states.get(state);
    if (!entry) {
      this.logger.warn(`OAuth callback: state not found in store — ${state}`);
      return false;
    }

    // Consume state (one-time use)
    this.states.delete(state);

    if (Date.now() - entry.createdAt > STATE_TTL_MS) {
      this.logger.warn(`OAuth callback: state expired — ${state}`);
      return false;
    }

    this.logger.debug(`OAuth state validated: ${state}`);
    return true;
  }

  private cleanup() {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, entry] of this.states) {
      if (now - entry.createdAt > STATE_TTL_MS) {
        this.states.delete(key);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      this.logger.debug(`OAuth state cleanup: removed ${cleaned} expired entries`);
    }
  }

  onModuleDestroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }
}
