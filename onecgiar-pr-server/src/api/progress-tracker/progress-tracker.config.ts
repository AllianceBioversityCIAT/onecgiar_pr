// @akili-spec changes/progress-tracker-pull-bridge/progress-tracker-indicator-mapping
import { env } from 'node:process';

/**
 * `PTM-T-2` / `PTM-DD-4` — env-backed timeout constant for the Progress Tracker
 * Interoperability HTTP call (`design.md` §12 `PTM-DD-4`, `requirements.md` `PTM-R-7`,
 * `PTM-R-8`; `PTM-AC-15`).
 *
 * The call timeout MUST stay strictly below the 29 000 ms API Gateway ceiling
 * confirmed in `design.md` §1A `P-5` (`aws apigateway get-integration` on
 * `dev-prtesting` / `{any+}` → `timeoutInMillis: 29000`), and the deployed Lambda's
 * `serverless.yaml` `functions.main.timeout` (30 s, matching `prstaging-dev-main`)
 * MUST stay at or above it — otherwise Lambda kills the invocation before the HTTP
 * client's own timeout fires, turning a classified `unavailable` (`PTM-AC-5`) into an
 * unhandled Lambda timeout instead.
 *
 * Pattern follows `bilateral-ai-text-mining.service.ts:43`
 * (`env.BILATERAL_AI_TEXT_MINING_TIMEOUT_MS || 600_000`), the precedent recorded at
 * `design.md` §1A `P-11`. No consumer reads this yet — `PTM-T-3`'s service is the
 * first caller.
 *
 * 27 000 ms (raised from 25 000): PT's cold `/results` generation regularly runs past
 * 25 s, and 27 s still leaves 2 s under the gateway ceiling.
 */
export const PT_INTEROP_TIMEOUT_MS_DEFAULT = 27_000;

/**
 * The API Gateway integration ceiling confirmed against the deployed stack
 * (`design.md` §1A `P-5`: `dev-prtesting` / `{any+}` → `timeoutInMillis: 29000`). This
 * is a fact about the deployed AWS resource (re-verified firsthand, 2026-09-22), not
 * repo config — it is not read from any file.
 */
export const PT_INTEROP_API_GATEWAY_CEILING_MS = 29_000;

/**
 * The highest value `PT_INTEROP_TIMEOUT_MS` may push the call timeout to — 1 000 ms
 * under {@link PT_INTEROP_API_GATEWAY_CEILING_MS}, so an operator override can never
 * defeat `PTM-R-7` at deploy-config level (`PTM-T-3` review finding on `PTM-T-2`: an
 * unclamped override such as `PT_INTEROP_TIMEOUT_MS=45000` previously returned 45 000,
 * above the 29 000 ms ceiling).
 */
export const PT_INTEROP_TIMEOUT_MS_MAX =
  PT_INTEROP_API_GATEWAY_CEILING_MS - 1_000;

/**
 * The upstream call timeout in ms (`PT_INTEROP_TIMEOUT_MS`, default
 * {@link PT_INTEROP_TIMEOUT_MS_DEFAULT}, clamped to {@link PT_INTEROP_TIMEOUT_MS_MAX}).
 * Read at call time so tests can set/unset `process.env` per case (`PTM-R-5`).
 *
 * `PTM-T-3` closes two holes found in the original `PTM-T-2` implementation:
 * - **Unclamped override:** a value at or above the gateway ceiling (e.g. `45000`) is
 *   clamped down to `PT_INTEROP_TIMEOUT_MS_MAX`, never returned as-is.
 * - **Malformed input:** a non-numeric value (`'abc'`) previously produced `NaN`, and a
 *   whitespace-only value (`'   '`) previously produced `0` — both falsy to Axios,
 *   which reads a falsy `timeout` as "no timeout at all": the worst outcome `PTM-R-7`
 *   exists to prevent. Any value that is not a finite number strictly greater than
 *   zero now falls back to {@link PT_INTEROP_TIMEOUT_MS_DEFAULT}.
 */
export function getProgressTrackerTimeoutMs(): number {
  const parsed = Number(env.PT_INTEROP_TIMEOUT_MS);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return PT_INTEROP_TIMEOUT_MS_DEFAULT;
  }
  return Math.min(parsed, PT_INTEROP_TIMEOUT_MS_MAX);
}

/**
 * A fuzzy `/resolve` match scoring below this is stored with `needs_review = true`.
 * 0.95 (decided 2026-10-13, lowered from 0.97). `serverless.yaml` passes the same value as
 * the `${env:PT_INTEROP_REVIEW_THRESHOLD, '0.95'}` fallback so a deploy without the variable
 * keeps working — change both together.
 */
export const PT_INTEROP_REVIEW_THRESHOLD_DEFAULT = 0.95;

/**
 * The fuzzy-match review threshold (`PT_INTEROP_REVIEW_THRESHOLD`, default
 * {@link PT_INTEROP_REVIEW_THRESHOLD_DEFAULT}). Read at call time. Anything that is not
 * a finite number in `(0, 1]` falls back to the default — a typo must never silently
 * accept every fuzzy match (`0`) or flag every one (`> 1`).
 */
export function getPtReviewThreshold(): number {
  const raw = env.PT_INTEROP_REVIEW_THRESHOLD;
  const parsed = raw?.trim() ? Number(raw) : NaN;
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 1) {
    return PT_INTEROP_REVIEW_THRESHOLD_DEFAULT;
  }
  return parsed;
}
