import { BankOAuthStateStore } from './bank-oauth-state.store';

describe('BankOAuthStateStore', () => {
  let store: BankOAuthStateStore;

  beforeEach(() => {
    store = new BankOAuthStateStore();
  });

  afterEach(() => {
    store.onModuleDestroy();
  });

  it('should generate state with flexoauth_ prefix', () => {
    const state = store.generate();
    expect(state).toMatch(/^flexoauth_/);
  });

  it('should validate a correct state and return metadata', () => {
    const state = store.generate({ userId: 'user-123' });
    const result = store.validateWithMetadata(state);
    expect(result.valid).toBe(true);
    expect(result.metadata).toEqual({ userId: 'user-123' });
  });

  it('should reject undefined state', () => {
    const result = store.validateWithMetadata(undefined);
    expect(result.valid).toBe(false);
  });

  it('should reject empty state', () => {
    const result = store.validateWithMetadata('');
    expect(result.valid).toBe(false);
  });

  it('should reject state with wrong prefix', () => {
    const result = store.validateWithMetadata('spacesub_fake-uuid');
    expect(result.valid).toBe(false);
  });

  it('should reject unknown state', () => {
    const result = store.validateWithMetadata('flexoauth_unknown-uuid');
    expect(result.valid).toBe(false);
  });

  it('should reject reused state (one-time use)', () => {
    const state = store.generate({ userId: 'u1' });
    expect(store.validateWithMetadata(state).valid).toBe(true);
    expect(store.validateWithMetadata(state).valid).toBe(false);
  });

  it('should reject expired state', () => {
    const state = store.generate({ userId: 'u1' });
    // Manually expire the entry
    const statesMap = (store as any).states as Map<
      string,
      { createdAt: number }
    >;
    const entry = statesMap.get(state);
    if (entry) entry.createdAt = Date.now() - 6 * 60 * 1000; // 6 minutes ago
    expect(store.validateWithMetadata(state).valid).toBe(false);
  });

  it('should generate unique states each time', () => {
    const a = store.generate();
    const b = store.generate();
    expect(a).not.toBe(b);
  });
});
