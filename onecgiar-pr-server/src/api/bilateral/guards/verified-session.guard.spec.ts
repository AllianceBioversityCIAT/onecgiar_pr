// @akili-spec bilateral/bulk-uploader-handoff (BIL-HO-T-2)
import { HttpException, HttpStatus } from '@nestjs/common';
import { VerifiedSessionGuard } from './verified-session.guard';

describe('VerifiedSessionGuard', () => {
  const guard = new VerifiedSessionGuard();

  /**
   * Mirrors what `JwtMiddleware` does on the public `/api/bilateral` prefix: `req.user` is
   * set only after a signature verification succeeds, and is left `undefined` for every
   * failure mode (missing header, expired token, malformed token, forged/unsigned token) —
   * the middleware swallows those silently on this prefix (jwt.middleware.ts:42-59).
   *
   * `headers` lets a case carry a real `auth` header on the mocked request while `user`
   * stays whatever the middleware would have left it as — this is what makes the
   * forged-header case distinguishable from the missing-header case: both leave `req.user`
   * undefined, but only one of them ever gives the guard bytes to read.
   */
  const makeContext = (
    user?: unknown,
    headers: Record<string, string> = {},
  ) => {
    const request: any = { user, headers };
    return {
      switchToHttp: () => ({ getRequest: () => request }),
    } as any;
  };

  /** A well-formed JWT shape (header.payload.signature) with a valid user id in the payload
   * but a signature that was never produced by `JWT_SKEY` — exactly the forged-token shape
   * R-1's scenario describes. Built inline so nothing resembling a real credential enters
   * the repo (`.cursorrules`). */
  const forgedButWellFormedToken = `x.${Buffer.from(
    JSON.stringify({ id: 7, email: 'forged@example.org' }),
  ).toString('base64')}.sig`;

  const expectUnauthorized = (context: any) => {
    expect(() => guard.canActivate(context)).toThrow(HttpException);
    try {
      guard.canActivate(context);
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect(error.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
      const response = error.getResponse();
      expect(response).toMatchObject({
        response: {
          valid: false,
          shouldRedirectToLogin: true,
        },
      });
      expect(typeof response.message).toBe('string');
    }
  };

  it('rejects a request with no auth header and no req.user (the missing-header case)', () => {
    expectUnauthorized(makeContext(undefined));
  });

  it('rejects req.user = { id: 0 } (falsy id is not a verified user)', () => {
    expectUnauthorized(makeContext({ id: 0 }));
  });

  it('rejects a well-formed but forged/unsigned auth header — req.user stays absent (R-1)', () => {
    // The middleware would have set req.user on a successful signature check; a forged or
    // unsigned header never reaches that branch, so req.user is undefined even though a
    // header — one that decodes to a valid id — is present on the request. A guard that
    // fell back to `processUserToken`/`@UserToken()` on this header would mint a code here;
    // this case is what turns that implementation red.
    expectUnauthorized(
      makeContext(undefined, { auth: forgedButWellFormedToken }),
    );
  });

  it('rejects a malformed, non-JWT auth header — req.user stays absent (R-1, malformed case)', () => {
    expectUnauthorized(makeContext(undefined, { auth: 'not-a-jwt-at-all' }));
  });

  it('rejects a non-numeric id (e.g. a string) as an unverified session', () => {
    expectUnauthorized(makeContext({ id: '7' }));
  });

  it('rejects a negative id', () => {
    expectUnauthorized(makeContext({ id: -1 }));
  });

  it('allows a verified session — req.user = { id: 7 }', () => {
    expect(guard.canActivate(makeContext({ id: 7 }))).toBe(true);
  });
});
