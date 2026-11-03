import { SetMetadata } from '@nestjs/common';

export const REQUIRE_CLARISA_ENDPOINT_GRANT_KEY = 'requireClarisaEndpointGrant';

/**
 * QIN-T-4b. CLARISA reports `valid: true` for any route a key is used on; the per-endpoint grant
 * is reported separately as `endpoint_allowed`. A handler or controller marked with this
 * decorator is refused by `ClarisaApiKeyGuard` unless CLARISA answers `endpoint_allowed === true`.
 * Routes without it keep the previous behavior (key validity only).
 */
export const RequireClarisaEndpointGrant = () =>
  SetMetadata(REQUIRE_CLARISA_ENDPOINT_GRANT_KEY, true);
