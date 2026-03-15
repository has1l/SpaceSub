/**
 * Thrown when Yandex returns invalid_grant with "expired" in the description.
 * Controllers catch this to restart the OAuth flow via redirect instead of
 * returning a 401 error to the user.
 */
export class OAuthCodeExpiredException extends Error {
  constructor() {
    super('OAuth authorization code has expired');
    this.name = 'OAuthCodeExpiredException';
  }
}
