import type { CookieOptions } from 'express';

export const AUTH_COOKIE = 'access_token';

// Must match the JWT lifetime in AuthService.login.
export const AUTH_COOKIE_MAX_AGE_MS = 60 * 60 * 1000;

// Shared by set and clear: the browser only drops a cookie when the
// attributes match the ones it was set with.
export function authCookieOptions(): CookieOptions {
  const sameSite = (process.env.COOKIE_SAME_SITE ?? 'lax') as
    | 'lax'
    | 'strict'
    | 'none';

  return {
    httpOnly: true,
    // SameSite=None is rejected by browsers unless the cookie is Secure.
    secure: process.env.NODE_ENV === 'production' || sameSite === 'none',
    sameSite,
    domain: process.env.COOKIE_DOMAIN || undefined,
    path: '/',
  };
}
