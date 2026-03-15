import { JwtService } from '@nestjs/jwt';
import { OAuthStateStore } from './oauth-state.store';

describe('OAuthStateStore', () => {
  let store: OAuthStateStore;
  let jwtService: JwtService;

  beforeEach(() => {
    jwtService = new JwtService({ secret: 'test-secret' });
    store = new OAuthStateStore(jwtService);
  });

  it('should generate a JWT state token', () => {
    const state = store.generate();
    expect(typeof state).toBe('string');
    expect(state.split('.')).toHaveLength(3); // JWT has 3 parts
  });

  it('should validate a correct state', () => {
    const state = store.generate();
    expect(store.validate(state)).toEqual({ valid: true, platform: 'web' });
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

  it('should reject tampered state', () => {
    const state = store.generate();
    const tampered = state.slice(0, -5) + 'XXXXX';
    expect(store.validate(tampered).valid).toBe(false);
  });

  it('should reject state signed with different secret', () => {
    const otherJwt = new JwtService({ secret: 'other-secret' });
    const otherStore = new OAuthStateStore(otherJwt);
    const state = otherStore.generate();
    expect(store.validate(state).valid).toBe(false);
  });

  it('should reject expired state', () => {
    const expiredState = jwtService.sign(
      { platform: 'web', timestamp: Date.now(), purpose: 'oauth_state' },
      { expiresIn: 0 },
    );
    // JWT with expiresIn:0 is already expired
    expect(store.validate(expiredState).valid).toBe(false);
  });

  it('should reject JWT with wrong purpose', () => {
    const badState = jwtService.sign(
      { platform: 'web', timestamp: Date.now(), purpose: 'something_else' },
      { expiresIn: 300 },
    );
    expect(store.validate(badState).valid).toBe(false);
  });

  it('should allow same state to be validated multiple times (stateless)', () => {
    const state = store.generate();
    expect(store.validate(state).valid).toBe(true);
    expect(store.validate(state).valid).toBe(true);
  });
});
