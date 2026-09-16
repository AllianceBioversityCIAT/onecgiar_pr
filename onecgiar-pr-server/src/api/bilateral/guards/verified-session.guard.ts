// @akili-spec bilateral/bulk-uploader-handoff (BIL-HO-T-2)
import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';

const VERIFIED_SESSION_UNAUTHORIZED_MESSAGE = 'Authorization token is required';

/**
 * Guards the handoff `start` route (R-1, DD-6).
 *
 * `/api/bilateral` is a public route prefix for `JwtMiddleware`
 * (`jwt.middleware.ts:20-25`): on that prefix the middleware still verifies a *present*
 * `auth` header's signature and sets `req.user` only when verification succeeds, but it
 * never rejects a missing or invalid one itself — enforcement is left to the route.
 *
 * This guard is that enforcement. It looks **only** at `req.user`, the value the middleware
 * sets after a successful signature check, and never reads the `auth` header itself — doing
 * so (e.g. via the header-decoding fallback in `shared/decorators/user-token.decorator.ts`,
 * which trusts an unverified payload) would let a forged, unsigned token mint a handoff code.
 * A missing header, an expired token, a malformed token and a forged/unsigned token all leave
 * `req.user` unset on this prefix, so they are rejected identically here — the guard cannot
 * and does not distinguish them.
 */
@Injectable()
export class VerifiedSessionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const userId = (request as unknown as { user?: { id?: unknown } }).user?.id;

    if (Number.isInteger(userId) && (userId as number) > 0) {
      return true;
    }

    throw new HttpException(
      {
        message: VERIFIED_SESSION_UNAUTHORIZED_MESSAGE,
        response: {
          valid: false,
          shouldRedirectToLogin: true,
        },
      },
      HttpStatus.UNAUTHORIZED,
    );
  }
}
