import { OAuthStateStore } from './oauth-state.store';

describe('OAuthStateStore (spacesub)', () => {
  let store: OAuthStateStore;

  beforeEach(() => {
    store = new OAuthStateStore();
  });

  afterEach(() => {
    store.onModuleDestroy();
  });

  it('should generate state with spacesub_ prefix', () => {
    const state = store.generate();
    expect(state).toMatch(/^spacesub_[0-9a-f-]{36}$/);
  });

  it('should validate a correct state', () => {
    const state = store.generate();
    expect(store.validate(state)).toEqual({ valid: true, platform: undefined });
  });

  it('should store platform in state', () => {
    const state = store.generate('ios');
    const result = store.validate(state);
    expect(result).toEqual({ valid: true, platform: 'ios' });
  });

  it('should reject undefined state', () => {
    expect(store.validate(undefined).valid).toBe(false);
  });

  it('should reject empty string state', () => {
    expect(store.validate('').valid).toBe(false);
  });

  it('should reject state with wrong prefix (flexbank)', () => {
    store.generate(); // fill store
    expect(store.validate('flexbank_fake-uuid').valid).toBe(false);
  });

  it('should reject unknown state (not in store)', () => {
    expect(store.validate('spacesub_unknown-uuid').valid).toBe(false);
  });

  it('should reject state used twice (one-time use)', () => {
    const state = store.generate();
    expect(store.validate(state).valid).toBe(true);
    expect(store.validate(state).valid).toBe(false);
  });

  it('should reject expired state', () => {
    const state = store.generate();

    // Manually expire the entry
    const statesMap = (store as any).states as Map<
      string,
      { createdAt: number }
    >;
    const entry = statesMap.get(state)!;
    entry.createdAt = Date.now() - 6 * 60 * 1000; // 6 minutes ago

    expect(store.validate(state).valid).toBe(false);
  });
});
