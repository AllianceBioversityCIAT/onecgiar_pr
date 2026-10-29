import { ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Path prefixes whose requests are not throttled: the bilateral API and the QA platform's
 * service-to-service catalog read (`api/qa/...`, authenticated with a CLARISA API key —
 * quality-assurance/qa-field-catalog P-11).
 */
const THROTTLE_EXCLUDED_PATH_PREFIXES = ['/api/bilateral', '/api/qa/'];

/**
 * Global ThrottlerGuard that skips rate limiting for all /api/bilateral and /api/qa routes.
 * Use this when @SkipThrottle() on the controller does not take effect (e.g. due to route resolution order).
 */
export class ThrottlerExcludeBilateralGuard extends ThrottlerGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<{ path?: string; url?: string }>();
    const path = request.path ?? request.url?.split('?')[0] ?? '';
    if (THROTTLE_EXCLUDED_PATH_PREFIXES.some((p) => path.startsWith(p))) {
      return true;
    }
    return super.canActivate(context);
  }
}
