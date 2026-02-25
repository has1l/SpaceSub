import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { randomUUID } from 'crypto';

interface StateEntry {
  createdAt: number;
  metadata?: Record<string, string>;
}

const STATE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const CLEANUP_INTERVAL_MS = 60 * 1000; // 1 minute

@Injectable()
export class BankOAuthStateStore implements OnModuleDestroy {
  private readonly logger = new Logger(BankOAuthStateStore.name);
  private readonly states = new Map<string, StateEntry>();
  private readonly prefix = 'flexoauth';
  private cleanupTimer: ReturnType<typeof setInterval>;

  constructor() {
    this.cleanupTimer = setInterval(() => this.cleanup(), CLEANUP_INTERVAL_MS);
  }

  generate(metadata?: Record<string, string>): string {
    const state = `${this.prefix}_${randomUUID()}`;
    this.states.set(state, { createdAt: Date.now(), metadata });
    this.logger.debug(`Bank OAuth state generated: ${state}`);
    return state;
  }

  validateWithMetadata(
    state: string | undefined,
  ): { valid: boolean; metadata?: Record<string, string> } {
    if (!state) {
      this.logger.warn('Bank OAuth callback: state missing');
      return { valid: false };
    }

    if (!state.startsWith(`${this.prefix}_`)) {
      this.logger.warn(
        `Bank OAuth callback: state prefix mismatch — expected "${this.prefix}_", got "${state.substring(0, 20)}..."`,
      );
      return { valid: false };
    }

    const entry = this.states.get(state);
    if (!entry) {
      this.logger.warn(
        `Bank OAuth callback: state not found in store — ${state}`,
      );
      return { valid: false };
    }

    this.states.delete(state); // one-time use

    if (Date.now() - entry.createdAt > STATE_TTL_MS) {
      this.logger.warn(`Bank OAuth callback: state expired — ${state}`);
      return { valid: false };
    }

    this.logger.debug(`Bank OAuth state validated: ${state}`);
    return { valid: true, metadata: entry.metadata };
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
      this.logger.debug(
        `Bank OAuth state cleanup: removed ${cleaned} expired entries`,
      );
    }
  }

  onModuleDestroy() {
    clearInterval(this.cleanupTimer);
  }
}
