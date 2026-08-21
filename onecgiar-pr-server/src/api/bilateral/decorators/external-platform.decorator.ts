import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { EXTERNAL_PLATFORM_REQUEST_KEY } from '../constants/external-platform.constants';
import { ClarisaApiKeyValidationMis } from '../interfaces/clarisa-api-key-validation.interface';

/**
 * The calling system, as CLARISA resolved it from the API key (P2-3166).
 *
 * Follows the `@DecodedUser()` pattern: reads what the guard already put on the request rather
 * than re-deriving it. Returns `undefined` on routes that are not behind `ClarisaApiKeyGuard`.
 *
 * Prefer this over the request body's `tenant` field — that one is declared by the caller and is
 * not verified against anything, so it must never be used to decide where a webhook is sent.
 */
export const ExternalPlatform = createParamDecorator(
  (
    _data: unknown,
    ctx: ExecutionContext,
  ): ClarisaApiKeyValidationMis | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request?.[EXTERNAL_PLATFORM_REQUEST_KEY];
  },
);
