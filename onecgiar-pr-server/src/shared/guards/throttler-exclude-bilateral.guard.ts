import { ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/** Path prefix for bilateral API; requests under this path are not throttled. */
const BILATERAL_PATH_PREFIX = '/api/bilateral';

/**
 * Global ThrottlerGuard that skips rate limiting for all /api/bilateral routes.
 * Use this when @SkipThrottle() on the controller does not take effect (e.g. due to route resolution order).
 */
export class ThrottlerExcludeBilateralGuard extends ThrottlerGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ path?: string; url?: string }>();
    const path = request.path ?? request.url?.split('?')[0] ?? '';
    if (path.startsWith(BILATERAL_PATH_PREFIX)) {
      return true;
    }
    return super.canActivate(context);
  }
}
