import { timingSafeEqual } from 'node:crypto';
import { NextFunction, Request, Response } from 'express';
import { ApiError } from './errorHandler';

/**
 * Shared-secret guard for the moderation API.
 *
 * The moderator sends `x-admin-token: <ADMIN_TOKEN>`. This is deliberately
 * simple — a graduation project with a single moderator does not need user
 * accounts — but it fails **closed**: when ADMIN_TOKEN is unset or blank the
 * admin routes are unreachable rather than open to everyone.
 *
 * A short token is also refused: an unguessable secret is the whole security
 * model here, so a 4-character one is treated as a misconfiguration.
 */
export const MIN_TOKEN_LENGTH = 16;

/** Read lazily so tests can set the env var per case. */
function configuredToken(): string {
  return (process.env.ADMIN_TOKEN ?? '').trim();
}

/** Length-independent comparison, so timing never leaks the token length. */
function tokensMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  const expected = configuredToken();

  if (!expected) {
    return next(
      new ApiError(
        503,
        'ADMIN_DISABLED',
        'Moderation is disabled: set ADMIN_TOKEN on the server to enable it'
      )
    );
  }
  if (expected.length < MIN_TOKEN_LENGTH) {
    return next(
      new ApiError(
        503,
        'ADMIN_DISABLED',
        `Moderation is disabled: ADMIN_TOKEN must be at least ${MIN_TOKEN_LENGTH} characters`
      )
    );
  }

  const header = req.header('x-admin-token');
  if (!header || !tokensMatch(header, expected)) {
    return next(new ApiError(401, 'UNAUTHORIZED', 'Invalid or missing admin token'));
  }
  return next();
}
