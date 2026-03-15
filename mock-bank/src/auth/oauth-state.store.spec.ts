import { JwtService } from '@nestjs/jwt';
import { OAuthStateStore } from './oauth-state.store';

describe('OAuthStateStore (flexbank)', () => {
  let store: OAuthStateStore;
  let jwtService: JwtService;

  beforeEach(() => {
    jwtService = new JwtService({ secret: 'test-secret' });
    store = new OAuthStateStore(jwtService);
  });

  it('should generate a JWT state token', () => {
    const state = store.generate();
    expect(typeof state).toBe('string');
    expect(state.split('.')).toHaveLength(3);
  });

  it('should validate a correct state', () => {
    const state = store.generate();
    expect(store.validate(state)).toBe(true);
  });

  it('should reject undefined state', () => {
    expect(store.validate(undefined)).toBe(false);
  });

  it('should reject empty string state', () => {
    expect(store.validate('')).toBe(false);
  });

  it('should reject tampered state', () => {
    const state = store.generate();
    const tampered = state.slice(0, -5) + 'XXXXX';
    expect(store.validate(tampered)).toBe(false);
  });

  it('should reject state signed with different secret', () => {
    const otherJwt = new JwtService({ secret: 'other-secret' });
    const otherStore = new OAuthStateStore(otherJwt);
    const state = otherStore.generate();
    expect(store.validate(state)).toBe(false);
  });

  it('should reject expired state', () => {
    const expiredState = jwtService.sign(
      { timestamp: Date.now(), purpose: 'flexbank_oauth_state' },
      { expiresIn: 0 },
    );
    expect(store.validate(expiredState)).toBe(false);
  });

  it('should reject JWT with wrong purpose', () => {
    const badState = jwtService.sign(
      { timestamp: Date.now(), purpose: 'wrong_purpose' },
      { expiresIn: 300 },
    );
    expect(store.validate(badState)).toBe(false);
  });

  it('should allow same state to be validated multiple times (stateless)', () => {
    const state = store.generate();
    expect(store.validate(state)).toBe(true);
    expect(store.validate(state)).toBe(true);
  });
});
