/**
 * Guard for URLs that this server will later make outbound requests to (P2-3166 webhook endpoints).
 *
 * Accepting a URL from a third party and POSTing to it turns the server into a request forwarder.
 * Without this check an authenticated platform could register `http://169.254.169.254/...` and have
 * PRMS fetch cloud instance metadata on its behalf, or reach anything else inside the VPC.
 *
 * **Honest limitation:** this validates the URL *string*. A public hostname that resolves to a
 * private address (DNS rebinding) is not caught here — it would need resolution at request time.
 * What bounds that risk is elsewhere: the dispatcher uses a short timeout and the response body is
 * never surfaced to the caller, so a blind request to an internal host leaks nothing back.
 */

/** Loopback, private, link-local and carrier-grade NAT ranges, plus IPv6 equivalents. */
const BLOCKED_HOST_PATTERNS: RegExp[] = [
  /^localhost$/i,
  /\.local$/i,
  /\.internal$/i,
  // 127.0.0.0/8
  /^127\./,
  // 10.0.0.0/8
  /^10\./,
  // 172.16.0.0/12
  /^172\.(1[6-9]|2\d|3[01])\./,
  // 192.168.0.0/16
  /^192\.168\./,
  // 169.254.0.0/16 — link-local, and where cloud instance metadata lives
  /^169\.254\./,
  // 100.64.0.0/10 — carrier-grade NAT
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
  // 0.0.0.0/8
  /^0\./,
  // IPv6 loopback and unique-local
  /^\[?::1\]?$/,
  /^\[?f[cd][0-9a-f]{2}:/i,
  /^\[?fe80:/i,
];

/**
 * A flat shape rather than a discriminated union on purpose: this project builds with
 * `strictNullChecks: false`, which stops TypeScript narrowing `ok: true | false` back to the right
 * member. A union here would compile only with casts at every call site.
 */
export interface PublicUrlCheck {
  ok: boolean;
  /** Set when `ok` is false. Safe to surface to the caller — it never echoes anything but their input. */
  reason?: string;
  /** Set when `ok` is true. Normalised by `URL`, so this is what should be stored. */
  url?: URL;
}

/**
 * Accepts only an absolute `https` URL pointing at something plausibly public.
 *
 * Returns a reason rather than throwing so the caller decides the HTTP status and the message it
 * surfaces — the reason is safe to show, it never echoes anything but the caller's own input.
 */
export function checkPublicHttpsUrl(
  value: string,
  maxLength = 500,
): PublicUrlCheck {
  const raw = (value ?? '').trim();

  if (!raw) {
    return { ok: false, reason: 'The url is required.' };
  }

  if (raw.length > maxLength) {
    return {
      ok: false,
      reason: `The url must be at most ${maxLength} characters.`,
    };
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, reason: 'The url is not a valid absolute URL.' };
  }

  if (url.protocol !== 'https:') {
    return { ok: false, reason: 'The url must use https.' };
  }

  // Credentials in a URL would end up stored and replayed on every delivery.
  if (url.username || url.password) {
    return { ok: false, reason: 'The url must not embed credentials.' };
  }

  const host = url.hostname;
  if (BLOCKED_HOST_PATTERNS.some((pattern) => pattern.test(host))) {
    return {
      ok: false,
      reason: 'The url must point to a publicly reachable host.',
    };
  }

  // A bare hostname with no dot is either a local alias or a container name; neither is routable
  // from outside, and both are exactly what an SSRF attempt would use.
  if (!host.includes('.') && !host.includes(':')) {
    return {
      ok: false,
      reason: 'The url must use a fully qualified domain name.',
    };
  }

  return { ok: true, url };
}
