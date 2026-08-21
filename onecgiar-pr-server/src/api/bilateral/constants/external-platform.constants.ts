/**
 * Where `ClarisaApiKeyGuard` parks the authenticated calling system on the request object, for
 * `@ExternalPlatform()` to read back. Mirrors how `JwtMiddleware` uses `req.user`.
 */
export const EXTERNAL_PLATFORM_REQUEST_KEY = 'externalPlatform';
