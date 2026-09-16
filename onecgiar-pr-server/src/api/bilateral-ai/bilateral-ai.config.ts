import { env } from 'node:process';

/**
 * `APF-T-1` — tunable env-backed constants for the bilateral AI job lifecycle (`design.md` §5
 * "Retry semantics" / "Timeout & stall sweeper", `requirements.md` §2 Glossary "Attempt",
 * `APF-R-2`, `APF-R-3`, `APF-OQ-6`).
 *
 * Pure functions/constants only — no consumer here reads these yet. `BilateralAiConsumer`'s
 * hardcoded `maxRetries = 3` and the sweeper cron are out of scope for this task (`APF-T-2`
 * onward); this module exists so that later task can read one ceiling instead of hardcoding a
 * second, independent one (design.md §5: "two independent ceilings strand a `retrying = 1` job").
 */

/** Default max attempts per job before the consumer stops requeueing (`APF-R-3`). */
export const BILATERAL_AI_MAX_ATTEMPTS_DEFAULT = 3;

/**
 * Default per-attempt timeout in ms: the 10-min mining HTTP timeout
 * (`BILATERAL_AI_TEXT_MINING_TIMEOUT_MS`) + 5 min margin. Measured from the current attempt's
 * `started_date`, not from job creation (`APF-OQ-6`, resolved 2026-09-15: a whole-job 35-min unit
 * was rejected because a live attempt can never reach it — the mining client aborts at 10 min).
 */
export const BILATERAL_AI_ATTEMPT_TIMEOUT_MS_DEFAULT = 15 * 60_000;

/**
 * Default queue-stall window in ms. `QUEUE_STALLED` fires only when the oldest `PENDING` job's
 * `queue_entry_date` is older than this window AND no row in `bilateral_ai_jobs` shows worker
 * activity within the same window (`design.md` §5 "Timeout & stall sweeper").
 */
export const BILATERAL_AI_QUEUE_STALL_MS_DEFAULT = 30 * 60_000;

/**
 * Max attempts before a job is terminally `FAILED` (`BILATERAL_AI_MAX_ATTEMPTS`, default
 * {@link BILATERAL_AI_MAX_ATTEMPTS_DEFAULT}). Read at call time so tests can set/unset
 * `process.env` per case.
 */
export function getBilateralAiMaxAttempts(): number {
  return Number(
    env.BILATERAL_AI_MAX_ATTEMPTS || BILATERAL_AI_MAX_ATTEMPTS_DEFAULT,
  );
}

/**
 * Per-attempt timeout in ms (`BILATERAL_AI_ATTEMPT_TIMEOUT_MS`, default
 * {@link BILATERAL_AI_ATTEMPT_TIMEOUT_MS_DEFAULT}).
 */
export function getBilateralAiAttemptTimeoutMs(): number {
  return Number(
    env.BILATERAL_AI_ATTEMPT_TIMEOUT_MS ||
      BILATERAL_AI_ATTEMPT_TIMEOUT_MS_DEFAULT,
  );
}

/**
 * Queue-stall window in ms (`BILATERAL_AI_QUEUE_STALL_MS`, default
 * {@link BILATERAL_AI_QUEUE_STALL_MS_DEFAULT}).
 */
export function getBilateralAiQueueStallMs(): number {
  return Number(
    env.BILATERAL_AI_QUEUE_STALL_MS || BILATERAL_AI_QUEUE_STALL_MS_DEFAULT,
  );
}
