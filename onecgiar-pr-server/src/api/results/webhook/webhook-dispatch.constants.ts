/**
 * Tunables for the P2-3166 dispatcher, gathered here so retry behaviour can be adjusted without
 * reading the loop that implements it.
 */

/** Attempts before a delivery is abandoned as EXHAUSTED and the AC5 alert fires. */
export const WEBHOOK_MAX_ATTEMPTS = 5;

/**
 * First retry delay. Each subsequent attempt doubles it, so with the values above a delivery is
 * abandoned roughly 15 minutes after the decision (1 + 2 + 4 + 8 minutes of waiting).
 */
export const WEBHOOK_BACKOFF_BASE_MS = 60_000;

/** Deliveries handled per cron tick. Bounded so one bad batch cannot monopolise the schedule. */
export const WEBHOOK_BATCH_SIZE = 25;

/** Per-request timeout. A recipient that hangs must not hold a dispatcher slot indefinitely. */
export const WEBHOOK_REQUEST_TIMEOUT_MS = 15_000;

/**
 * How long a row may sit in SENDING before it is treated as abandoned. A process killed mid-flight
 * leaves the row claimed; without this, that delivery would never be retried.
 */
export const WEBHOOK_STALE_SENDING_MS = 10 * 60_000;

/** Header carrying the HMAC-SHA256 signature of the raw body. */
export const WEBHOOK_SIGNATURE_HEADER = 'x-prms-signature';

/** Header carrying the delivery id, so a recipient can de-duplicate replays on its side. */
export const WEBHOOK_DELIVERY_ID_HEADER = 'x-prms-delivery-id';
