// @akili-spec bilateral/qa-ai-traffic-light (BIL-QAI-T-5, BIL-QAI-T-5b)
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { env } from 'node:process';
import { firstValueFrom } from 'rxjs';
import { BilateralQualityAssessmentAiStatus } from '../../entities/bilateral-quality-assessment.entity';
import {
  AiAssessmentResponse,
  QualityPayload,
  QualitySectionKey,
  QualitySectionResult,
  QualityVerdict,
} from './bilateral-quality-rules';

/**
 * Transport envelope for the outbound call. `user_id` is the authenticated
 * Centre user's email, retained under the AI service's existing field name.
 * It deliberately does not belong to `QualityPayload`: it is neither result
 * content nor a stable part of an assessment's content hash.
 */
type QualityAssessmentRequest = QualityPayload & { user_id: string };

/**
 * HTTP client for the outbound AI quality-assessment call (design.md §5 "AI client";
 * BIL-QAI-R-7, BIL-QAI-AC-15). Reads its configuration from the environment lazily,
 * at call time, so tests can toggle it per case. Never throws for the four failure
 * classes described below — an unexpected exception is folded into `http_error`.
 *
 * Logging is a single structured line per call (`Logger.log` on success,
 * `Logger.warn` on any failure outcome) carrying only ids, status and elapsed time —
 * never the request/response body, the API key, or the AI host (`.cursorrules`,
 * design.md §7 Security, §9 Observability).
 *
 * **v0.2** (`BIL-QAI-T-5b`, design.md §5 "AI client — v0.2 schema check"): the response's
 * `status` and `degraded_reason` join the required keys, and a **section** verdict may be
 * `grey` (`overall.verdict` stays on the three-colour enum). `degraded_reason` is sanitised
 * (URL/host stripped, truncated to 255) and threaded through to the orchestrator, but is
 * never logged — same privacy rule as the body/key/host it already protects.
 */

const QUALITY_ASSESSMENT_PATH = '/prms/quality-assessment';
const DEFAULT_TIMEOUT_MS = 60_000;
/**
 * Response-size bound (design.md §8: JSON columns sized for ≤ 32 KB per row). Set with
 * headroom over the storage budget since the wire body also carries `request_id`,
 * `criteria_version`, etc. Axios rejects a larger body before it reaches
 * {@link isValidAiResponse}; the rejection is folded into `http_error` by {@link classify}
 * like any other transport failure. Not exercised by the spec's mocked `HttpService.post`,
 * which returns a resolved value directly and never runs Axios' own content-length guard.
 */
const MAX_RESPONSE_BYTES = 65_536;

/** The three colours `overall.verdict` may carry (never `grey` — design.md §4.5). */
const RESPONSE_VERDICTS: ReadonlyArray<QualityVerdict> = [
  'green',
  'amber',
  'red',
];
/**
 * Evidence items allow `grey` (contract v0.1). **v0.2** widens **section** verdicts to the
 * same four colours (`isValidSectionResult` below) — a `grey` section means "not evaluated",
 * the same meaning it has on an evidence item, and must not be rejected as malformed
 * (`BIL-QAI-R-4` "A grey section is rendered, not rejected").
 */
const EVIDENCE_VERDICTS: ReadonlyArray<QualityVerdict> = [
  'green',
  'amber',
  'red',
  'grey',
];
const SECTION_VERDICTS: ReadonlyArray<QualityVerdict> = EVIDENCE_VERDICTS;

/**
 * The four sections every bilateral result has. `type_specific` is deliberately NOT here: Other
 * output and Other outcome have no type-specific fields and no such section in the editor, so the
 * AI omits the key. Demanding it turned a perfectly usable four-section verdict into `malformed`,
 * which the user met as "Quality check unavailable" (reported 17-sep-2026, result 11883).
 */
const REQUIRED_SECTION_KEYS: ReadonlyArray<QualitySectionKey> = [
  'general_information',
  'contributors_and_partners',
  'geographic_location',
  'evidence',
];
/** Present only when the result type has one — validated when it is, never required. */
const OPTIONAL_SECTION_KEYS: ReadonlyArray<QualitySectionKey> = [
  'type_specific',
];

/**
 * The wire value of the response's `status` field (design.md §4.5 "PRMS status mapping").
 * Deliberately **wider** than the persisted `ai_status` column
 * (`BilateralQualityAssessmentAiStatus = 'completed' | 'partial'`, entity file): a third,
 * `'unavailable'`, member here would make `ai_status = 'unavailable'` representable on the
 * column, which the mapping table forbids (`unavailable` is stored via
 * `unavailable_reason = 'ai_unavailable'` with `ai_status` staying `null`). Declaring this as
 * a derivation keeps the two domains linked without widening the narrower one (forward
 * pointer from the `T-2b` Reviewer).
 */
export type BilateralQualityAiResponseStatus =
  | BilateralQualityAssessmentAiStatus
  | 'unavailable';

const RESPONSE_STATUSES: ReadonlyArray<BilateralQualityAiResponseStatus> = [
  'completed',
  'partial',
  'unavailable',
];

/** The 2xx body once it has passed {@link isValidAiResponse} (v0.2 required keys). */
interface AiResponseBodyV2 extends AiAssessmentResponse {
  status: BilateralQualityAiResponseStatus;
  degraded_reason: string | null;
}

export type AiClientFailureOutcome =
  | 'not_configured'
  | 'timeout'
  | 'http_error'
  | 'malformed';

export type AiClientOutcome =
  | {
      outcome: 'ok';
      response: AiAssessmentResponse;
      /** The AI's own `status`, verbatim — always `completed` or `partial` on this variant. */
      ai_status: BilateralQualityAssessmentAiStatus;
      /** Sanitised, truncated; `null` unless the AI reported a degradation. */
      degraded_reason: string | null;
      elapsed_ms: number;
    }
  | {
      /**
       * The AI answered well-formed with `status: "unavailable"` — no usable verdict, but a
       * reason. Kept off `AiClientFailureOutcome` on purpose (forward pointer from the `T-2b`
       * Reviewer): that variant carries no field for a reason, so folding this case into it
       * would make `degraded_reason` structurally unable to reach the orchestrator and lose
       * `BIL-QAI-R-7`'s unavailable-reason text. `ai_status` is not carried here — the
       * mapping table stores `ai_status = null` for this case (`unavailable_reason =
       * 'ai_unavailable'` carries the distinction instead).
       */
      outcome: 'ai_unavailable';
      degraded_reason: string | null;
      elapsed_ms: number;
    }
  | {
      outcome: AiClientFailureOutcome;
      elapsed_ms: number;
      http_status?: number;
    };

/** Internal marker rejected by the client-side timeout guard (never surfaced). */
class AiClientTimeoutError extends Error {}

function trimTrailingSlashes(value: string): string {
  let end = value.length;
  while (end > 0 && value[end - 1] === '/') {
    end -= 1;
  }
  return value.slice(0, end);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidSectionResult(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  if (!SECTION_VERDICTS.includes(value.verdict as QualityVerdict)) {
    return false;
  }
  return Array.isArray(value.strengths) && Array.isArray(value.issues);
}

function isValidEvidenceItem(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  if (typeof value.index !== 'number' || !Number.isInteger(value.index)) {
    return false;
  }
  return EVIDENCE_VERDICTS.includes(value.verdict as QualityVerdict);
}

/**
 * Light response schema check (design.md §5 "AI client"; mandatory forward pointer
 * from `BIL-QAI-T-3` review): the pure `applyGreyRule` downstream assumes `strengths`/
 * `issues` arrays exist on every section and that `evidence` is an array of
 * `{index, verdict}` — this is the only guard for that assumption. `comments` and
 * `score` are optional on every section and on `overall`; `score`'s value is not
 * checked here — {@link sanitizeScores} normalizes it once this check succeeds.
 *
 * **Known over-wide spot (carried from earlier Reviewers, `BIL-QAI-T-5` / `T-5b`):** the
 * *type* `AiAssessmentResponse` also declares `request_id`, `overall.summary`, per-section
 * `comments` and per-evidence `reason` as required, but this predicate does not check any of
 * them — it only guards what `applyGreyRule`/`sanitizeScores` actually read. Decision made
 * here rather than widening the check: **the type stays as the wire contract's documentation,
 * the predicate stays scoped to what this module dereferences.** `T-6`/`T-7` MUST NOT assume
 * this predicate guarantees `request_id`, `overall.summary`, section `comments` or evidence
 * `reason` are present/well-typed — read them defensively if a downstream rule needs them.
 *
 * **v0.2** (`BIL-QAI-T-5b`): `status` (∈ `completed | partial | unavailable`) and
 * `degraded_reason` (`string | null`) join the required keys — a body missing either is
 * `malformed`, same as a missing `overall`/`sections`/`evidence`. Section verdicts (not
 * `overall`) now accept `grey` via {@link isValidSectionResult}. Unknown response keys stay
 * ignored (forward compatibility, unchanged from v0.1) — this function never rejects on an
 * extra key, only on a missing/invalid required one.
 */
function isValidAiResponse(body: unknown): body is AiResponseBodyV2 {
  if (!isRecord(body)) {
    return false;
  }

  if (
    !RESPONSE_STATUSES.includes(body.status as BilateralQualityAiResponseStatus)
  ) {
    return false;
  }
  if (
    body.degraded_reason !== null &&
    typeof body.degraded_reason !== 'string'
  ) {
    return false;
  }

  const overall = body.overall;
  if (!isRecord(overall)) {
    return false;
  }
  if (!RESPONSE_VERDICTS.includes(overall.verdict as QualityVerdict)) {
    return false;
  }

  const sections = body.sections;
  if (!isRecord(sections)) {
    return false;
  }
  for (const key of REQUIRED_SECTION_KEYS) {
    if (!isValidSectionResult(sections[key])) {
      return false;
    }
  }
  // Absent is fine; present-but-malformed is not.
  for (const key of OPTIONAL_SECTION_KEYS) {
    if (sections[key] !== undefined && !isValidSectionResult(sections[key])) {
      return false;
    }
  }

  const evidence = body.evidence;
  if (!Array.isArray(evidence)) {
    return false;
  }
  for (const item of evidence) {
    if (!isValidEvidenceItem(item)) {
      return false;
    }
  }

  return true;
}

/** Strips the request_id/overall/sections/evidence subset back out of a v0.2 body — the
 * `'ok'` outcome's `response` field carries only the v0.1 shape; `status`/`degraded_reason`
 * travel as separate, top-level `AiClientOutcome` fields instead of being duplicated inside
 * `response` (keeps `sanitizeScores`'s input/output type exactly `AiAssessmentResponse`). */
function toAiAssessmentResponse(body: AiResponseBodyV2): AiAssessmentResponse {
  return {
    request_id: body.request_id,
    criteria_version: body.criteria_version,
    overall: body.overall,
    sections: body.sections,
    evidence: body.evidence,
  };
}

const MAX_DEGRADED_REASON_LENGTH = 255;
/** Matches a scheme-qualified URL in full, including its host, so the host never survives
 * into a truncated remainder. */
const URL_PATTERN = /\bhttps?:\/\/\S+/gi;
/** Matches a bare, dotted host-like token (e.g. `ai-internal.example`) left over once any
 * `scheme://` prefix is gone — defensive: not exercised by a specific test, but cheap
 * insurance against a host mentioned without a scheme (design.md §4.5 "stripped of anything
 * that looks like a URL or host"). */
const HOST_PATTERN =
  /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}\b/gi;
const REDACTED_PLACEHOLDER = '[redacted]';

/**
 * Sanitises the AI's plain-language `degraded_reason` before it leaves the client
 * (design.md §4.5, NFR *Privacy / secrets*, `BIL-QAI-AC-9`): strips anything URL- or
 * host-shaped (so a careless AI-side message naming its own host cannot leak it), then
 * truncates to 255 characters. `null` passes through unchanged — the AI has nothing to
 * redact when it reports no degradation. Order matters: stripping first means truncation
 * can never cut a URL in half and leave a dangling host fragment.
 */
/**
 * `fields` is an optional annotation, so a malformed one is cleaned away rather than rejected:
 * dropping the whole verdict over it would repeat the `type_specific` mistake of 2026-09-17, where
 * strictness about one non-load-bearing key turned four good sections into "Quality check
 * unavailable". Non-array, or a non-string entry, simply does not reach the column.
 */
function normalizeFields(value: unknown): { fields?: string[] } {
  if (!Array.isArray(value)) {
    return {};
  }
  const fields = value.filter(
    (item): item is string => typeof item === 'string',
  );
  return fields.length ? { fields } : {};
}

function sanitizeDegradedReason(reason: string | null): string | null {
  if (reason === null) {
    return null;
  }
  const withoutUrls = reason.replace(URL_PATTERN, REDACTED_PLACEHOLDER);
  const withoutHosts = withoutUrls.replace(HOST_PATTERN, REDACTED_PLACEHOLDER);
  return withoutHosts.length > MAX_DEGRADED_REASON_LENGTH
    ? withoutHosts.slice(0, MAX_DEGRADED_REASON_LENGTH)
    : withoutHosts;
}

const MIN_SCORE = 0;
const MAX_SCORE = 100;

/**
 * Keeps `score` only when it is a `0–100` integer; any other value — a string
 * (`"68"`), a float, out-of-range (`900`), or already absent — becomes `null`.
 * `null` (not dropping the key) is the chosen representation because it matches
 * the `number | null` type of `overall.score` / `sections[k].score` and the
 * nullable `overall_score` / `sections` JSON columns downstream (T-7); callers
 * never have to distinguish "missing key" from "sanitized away".
 */
function sanitizeScore(value: unknown): number | null {
  return typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= MIN_SCORE &&
    value <= MAX_SCORE
    ? value
    : null;
}

/**
 * Returns a new `AiAssessmentResponse` with `overall.score` and every
 * `sections[k].score` passed through {@link sanitizeScore}. Applied after
 * `isValidAiResponse` succeeds, before `assess()` returns `outcome: 'ok'`
 * (design.md §5 "AI client"; Reviewer B, BIL-QAI-T-5 attempt 2). Never mutates
 * the Axios response body — every level that changes is rebuilt.
 *
 * **Deliberate side effect (carried from an earlier Reviewer, kept and documented):**
 * `sections` is rebuilt from the known keys — required plus optional — rather than from
 * `Object.keys(body.sections)`, so a response carrying a sixth, unrecognised section key
 * silently drops it on this `ok` path. This matches the "unknown key ignored" forward-
 * compatibility rule the AI client already applies everywhere else (`BIL-QAI-T-9`'s scope
 * assumes the same rule downstream) — it is not an oversight.
 */
function sanitizeScores(body: AiAssessmentResponse): AiAssessmentResponse {
  const sections: Partial<Record<QualitySectionKey, QualitySectionResult>> = {};
  for (const key of [...REQUIRED_SECTION_KEYS, ...OPTIONAL_SECTION_KEYS]) {
    const section = body.sections[key];
    if (!section) continue;
    // `fields` is destructured OUT before the spread: re-adding it conditionally cannot remove a
    // malformed one that the spread already copied in, and `fields: undefined` would still leave
    // the key on the row.
    const { fields: rawFields, ...rest } = section;
    sections[key] = {
      ...rest,
      score: sanitizeScore(section.score),
      ...normalizeFields(rawFields),
    };
  }

  return {
    ...body,
    overall: { ...body.overall, score: sanitizeScore(body.overall.score) },
    sections,
  };
}

@Injectable()
export class BilateralQualityAssessmentClient {
  private readonly logger = new Logger(BilateralQualityAssessmentClient.name);

  constructor(private readonly httpService: HttpService) {}

  /** `BILATERAL_AI_QUALITY_TIMEOUT_MS`, default 60000; falls back unless the env value
   * parses to a positive integer. Read lazily so tests can toggle it per case. */
  timeoutMs(): number {
    const raw = env.BILATERAL_AI_QUALITY_TIMEOUT_MS;
    if (raw === undefined) {
      return DEFAULT_TIMEOUT_MS;
    }
    const parsed = Number(raw);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
  }

  /** Same value as {@link timeoutMs}, in whole seconds — the orchestrator/builder use
   * this to derive `constraints.timeout_seconds` from the single source of truth. */
  timeoutSeconds(): number {
    return Math.round(this.timeoutMs() / 1000);
  }

  private baseUrl(): string {
    return trimTrailingSlashes(env.BILATERAL_AI_QUALITY_URL?.trim() ?? '');
  }

  private apiKey(): string {
    return env.MICROSERVICE_API_KEY?.trim() ?? '';
  }

  /** URL and key both non-empty. */
  isConfigured(): boolean {
    return this.baseUrl().length > 0 && this.apiKey().length > 0;
  }

  /**
   * Runs the assessment call. Never throws — every failure class maps to a member of
   * `AiClientOutcome` instead (design.md §5 "AI client").
   */
  async assess(
    payload: QualityPayload,
    ctx: { resultId: number; userEmail?: string },
  ): Promise<AiClientOutcome> {
    // `BIL-QAI-T-6` forward pointer ("one `requestId` end to end"): the orchestrator mints the
    // one true id and passes it to the payload builder (`opts.requestId`), which stamps it onto
    // `payload.request_id`. Reusing it here — instead of minting a second one, as this client
    // did through `T-5b` — is what makes the outbound HTTP body, this client's own log lines,
    // and the orchestrator's log line all carry the same value. A caller that has no id yet
    // (fixture-driven unit tests calling `assess()` directly) still gets a working uuid.
    const requestId =
      typeof payload.request_id === 'string' && payload.request_id.length > 0
        ? payload.request_id
        : randomUUID();
    const started = Date.now();

    if (!this.isConfigured()) {
      return this.finish(ctx.resultId, requestId, 'not_configured', 0);
    }

    const url = `${this.baseUrl()}${QUALITY_ASSESSMENT_PATH}`;
    const timeoutMs = this.timeoutMs();
    const requestBody: QualityAssessmentRequest = {
      ...payload,
      request_id: requestId,
      user_id: ctx.userEmail?.trim() ?? '',
    };
    try {
      const response = await this.postWithTimeoutGuard(
        url,
        requestBody,
        timeoutMs,
      );
      const elapsedMs = Date.now() - started;

      if (!isValidAiResponse(response.data)) {
        return this.finish(
          ctx.resultId,
          requestId,
          'malformed',
          elapsedMs,
          response.status,
        );
      }

      const body = response.data;
      // Captured into a local so the narrowing below survives the `Logger` calls that
      // follow it — narrowing a repeated `body.status` property read can be invalidated by
      // an intervening function call; a local `const` cannot.
      const status = body.status;
      const degradedReason = sanitizeDegradedReason(body.degraded_reason);

      if (status === 'unavailable') {
        // AI-declared unavailable: well-formed 2xx, no usable verdict. Never logs
        // `degraded_reason` (BIL-QAI-AC-15) — only ids/status/elapsed, same as every other
        // outcome this client logs.
        this.logger.warn(
          `event=bilateral_quality_assessment_client result_id=${ctx.resultId} request_id=${requestId} outcome=ai_unavailable http_status=${response.status} elapsed_ms=${elapsedMs}`,
        );
        return {
          outcome: 'ai_unavailable',
          degraded_reason: degradedReason,
          elapsed_ms: elapsedMs,
        };
      }

      const sanitized = sanitizeScores(toAiAssessmentResponse(body));

      this.logger.log(
        `event=bilateral_quality_assessment_client result_id=${ctx.resultId} request_id=${requestId} outcome=ok http_status=${response.status} elapsed_ms=${elapsedMs}`,
      );

      return {
        outcome: 'ok',
        response: sanitized,
        // `status` is narrowed to `'completed' | 'partial'` here — the `'unavailable'`
        // branch above already returned.
        ai_status: status,
        degraded_reason: degradedReason,
        elapsed_ms: elapsedMs,
      };
    } catch (error: unknown) {
      const elapsedMs = Date.now() - started;
      const { outcome, httpStatus } = this.classify(error);
      return this.finish(
        ctx.resultId,
        requestId,
        outcome,
        elapsedMs,
        httpStatus,
      );
    }
  }

  /**
   * Races the Axios call against a same-duration timer so a call the mocked (or real)
   * HTTP client never settles still yields `timeout` at exactly `timeoutMs` — the
   * `timeout` passed to Axios covers the real-network case, this guard covers the rest.
   *
   * The guard timer is cleared as soon as the request settles on its own (open item from an
   * earlier Reviewer): without this, every call that resolves before the guard fires leaves
   * a pending Node timer behind, which is why the spec needs `--forceExit`. Clearing it here
   * does not remove that requirement (a timeout-path test still lets its own timer fire), but
   * it stops piling one extra leaked timer per successful/failed call.
   */
  private postWithTimeoutGuard(
    url: string,
    body: QualityAssessmentRequest,
    timeoutMs: number,
  ): Promise<{ data: unknown; status: number }> {
    let guardTimer: NodeJS.Timeout | undefined;

    const request$ = this.httpService.post(url, body, {
      timeout: timeoutMs,
      maxContentLength: MAX_RESPONSE_BYTES,
      maxBodyLength: MAX_RESPONSE_BYTES,
      headers: {
        'X-API-Key': this.apiKey(),
        'Content-Type': 'application/json',
      },
    });

    const requestPromise = firstValueFrom(request$).then((res) => {
      clearTimeout(guardTimer);
      return { data: res.data as unknown, status: res.status };
    });
    // The timeout guard may resolve first; avoid an unhandled rejection when the
    // underlying call later settles on its own (e.g. Axios' own timeout firing).
    requestPromise.catch(() => {
      clearTimeout(guardTimer);
    });

    const timeoutPromise = new Promise<never>((_resolve, reject) => {
      guardTimer = setTimeout(
        () => reject(new AiClientTimeoutError()),
        timeoutMs,
      );
    });

    return Promise.race([requestPromise, timeoutPromise]);
  }

  private classify(error: unknown): {
    outcome: AiClientFailureOutcome;
    httpStatus?: number;
  } {
    if (error instanceof AiClientTimeoutError) {
      return { outcome: 'timeout' };
    }

    const candidate = error as {
      code?: unknown;
      response?: { status?: unknown };
    };
    const code = typeof candidate?.code === 'string' ? candidate.code : '';
    if (code === 'ECONNABORTED' || code === 'ETIMEDOUT') {
      return { outcome: 'timeout' };
    }

    const status = candidate?.response?.status;
    if (typeof status === 'number') {
      return { outcome: 'http_error', httpStatus: status };
    }

    return { outcome: 'http_error' };
  }

  private finish(
    resultId: number,
    requestId: string,
    outcome: AiClientFailureOutcome,
    elapsedMs: number,
    httpStatus?: number,
  ): AiClientOutcome {
    const httpStatusLabel = httpStatus !== undefined ? String(httpStatus) : '-';
    this.logger.warn(
      `event=bilateral_quality_assessment_client result_id=${resultId} request_id=${requestId} outcome=${outcome} http_status=${httpStatusLabel} elapsed_ms=${elapsedMs}`,
    );
    return httpStatus !== undefined
      ? { outcome, elapsed_ms: elapsedMs, http_status: httpStatus }
      : { outcome, elapsed_ms: elapsedMs };
  }
}
