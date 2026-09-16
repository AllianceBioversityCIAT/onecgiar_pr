// @akili-spec bilateral/qa-ai-traffic-light (BIL-QAI-T-5)
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { env } from 'node:process';
import { firstValueFrom } from 'rxjs';
import {
  AiAssessmentResponse,
  QualityPayload,
  QualitySectionKey,
  QualitySectionResult,
  QualityVerdict,
} from './bilateral-quality-rules';

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
 */

const QUALITY_ASSESSMENT_PATH = '/prms/quality-assessment';
const DEFAULT_TIMEOUT_MS = 60_000;

/** The three colours a response's `overall`/section verdict may carry (never `grey`). */
const RESPONSE_VERDICTS: ReadonlyArray<QualityVerdict> = [
  'green',
  'amber',
  'red',
];
/** Evidence items additionally allow `grey` (contract v0.1). */
const EVIDENCE_VERDICTS: ReadonlyArray<QualityVerdict> = [
  'green',
  'amber',
  'red',
  'grey',
];

const SECTION_KEYS: ReadonlyArray<QualitySectionKey> = [
  'general_information',
  'contributors_and_partners',
  'geographic_location',
  'evidence',
  'type_specific',
];

export type AiClientFailureOutcome =
  | 'not_configured'
  | 'timeout'
  | 'http_error'
  | 'malformed';

export type AiClientOutcome =
  | { outcome: 'ok'; response: AiAssessmentResponse; elapsed_ms: number }
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
  if (!RESPONSE_VERDICTS.includes(value.verdict as QualityVerdict)) {
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
 */
function isValidAiResponse(body: unknown): body is AiAssessmentResponse {
  if (!isRecord(body)) {
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
  for (const key of SECTION_KEYS) {
    if (!isValidSectionResult(sections[key])) {
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
 */
function sanitizeScores(body: AiAssessmentResponse): AiAssessmentResponse {
  const sections = {} as Record<QualitySectionKey, QualitySectionResult>;
  for (const key of SECTION_KEYS) {
    const section = body.sections[key];
    sections[key] = { ...section, score: sanitizeScore(section.score) };
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
    ctx: { resultId: number },
  ): Promise<AiClientOutcome> {
    const requestId = randomUUID();
    const started = Date.now();

    if (!this.isConfigured()) {
      return this.finish(ctx.resultId, requestId, 'not_configured', 0);
    }

    const url = `${this.baseUrl()}${QUALITY_ASSESSMENT_PATH}`;
    const timeoutMs = this.timeoutMs();
    const body: QualityPayload = { ...payload, request_id: requestId };

    try {
      const response = await this.postWithTimeoutGuard(url, body, timeoutMs);
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

      const sanitized = sanitizeScores(response.data);

      this.logger.log(
        `event=bilateral_quality_assessment_client result_id=${ctx.resultId} request_id=${requestId} outcome=ok http_status=${response.status} elapsed_ms=${elapsedMs}`,
      );

      return { outcome: 'ok', response: sanitized, elapsed_ms: elapsedMs };
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
   */
  private postWithTimeoutGuard(
    url: string,
    body: QualityPayload,
    timeoutMs: number,
  ): Promise<{ data: unknown; status: number }> {
    const request$ = this.httpService.post(url, body, {
      timeout: timeoutMs,
      headers: {
        'X-API-Key': this.apiKey(),
        'Content-Type': 'application/json',
      },
    });

    const requestPromise = firstValueFrom(request$).then((res) => ({
      data: res.data as unknown,
      status: res.status,
    }));
    // The timeout guard may resolve first; avoid an unhandled rejection when the
    // underlying call later settles on its own (e.g. Axios' own timeout firing).
    requestPromise.catch(() => undefined);

    const timeoutPromise = new Promise<never>((_resolve, reject) => {
      setTimeout(() => reject(new AiClientTimeoutError()), timeoutMs);
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
