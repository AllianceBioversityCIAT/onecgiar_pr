import { BilateralAiJobStatus } from './services/bilateral-ai.interfaces';

/**
 * `bilateral-ai-job.model.ts` — pure, side-effect-free transforms for the AI job lifecycle
 * (`APF-T-5`, `docs/specs/bilateral/ai-processing-feedback/design.md` §6.2).
 *
 * Every function here is a plain data transform: no HTTP, no signals, no DOM. `BilateralAiService`
 * calls these on each poll; `AiProcessingPanelComponent` (a later task) renders the result.
 */

// ── Raw payload contract ────────────────────────────────────────────────

/**
 * The shape `GET /api/bilateral/center/ai/jobs/:jobId` actually sends on the wire, mirroring
 * `bilateral-ai-job.entity.ts` plus the additive fields from `design.md` §3.1/§4.1. Kept separate
 * from the strongly-typed `BilateralAiJob` interface (used elsewhere for drafts) because the real
 * payload carries ids/counters as strings and booleans as `0/1` (`KZ-changes--bilateral-review-
 * center-strip-and-phase-1`) — `normalizeJob` is the only place that shape should leak into.
 */
export interface RawBilateralAiJob {
  job_id: string;
  user_id?: string | number | null;
  center_id?: string | number | null;
  project_id?: string | number | null;
  program_code?: string | null;
  bucket_name?: string | null;
  document_keys?: string[] | null;
  audio_keys?: string[] | null;
  text_context?: string | null;
  status: string;
  stage?: string | null;
  stage_updated_date?: string | null;
  attempts?: string | number | null;
  max_attempts?: string | number | null;
  retrying?: string | number | boolean | null;
  queue_position?: string | number | null;
  external_interaction_id?: string | null;
  response_snapshot?: Record<string, unknown> | null;
  result_count?: string | number | null;
  error_code?: string | null;
  error_message?: string | null;
  created_date: string;
  started_date?: string | null;
  completed_date?: string | null;
  retried_date?: string | null;
  last_updated_date?: string | null;
}

/** The 8 server-controlled stage values (`design.md` §3.1). Nothing else is ever written here. */
export type BilateralAiStage =
  | 'queued'
  | 'uploading'
  | 'reading'
  | 'transcribing'
  | 'reading_transcribing'
  | 'extracting'
  | 'validating'
  | 'creating_drafts';

export type BilateralAiMixClass = 'documents' | 'audio';

export interface BilateralAiExpectations {
  mix: BilateralAiMixClass;
  sampleSize: number;
  p25Minutes: number | null;
  p75Minutes: number | null;
}

/** The normalized, strongly-typed job the client works with after `normalizeJob`. */
export interface NormalizedBilateralAiJob {
  jobId: string;
  userId: number | null;
  centerId: number | null;
  projectId: number | null;
  programCode: string;
  bucketName: string;
  documentKeys: string[];
  audioKeys: string[];
  textContext: string | null;
  status: BilateralAiJobStatus;
  stage: BilateralAiStage;
  stageUpdatedDate: Date | null;
  attempts: number;
  maxAttempts: number;
  retrying: boolean;
  queuePosition: number | null;
  externalInteractionId: string | null;
  resultCount: number;
  errorCode: string | null;
  errorMessage: string | null;
  createdDate: Date;
  startedDate: Date | null;
  completedDate: Date | null;
  retriedDate: Date | null;
  /** `COALESCE(retried_date, created_date)` — every age-based rule uses this, not `createdDate`. */
  queueEntryDate: Date;
  lastUpdatedDate: Date | null;
}

// ── normalizeJob ─────────────────────────────────────────────────────────

/**
 * `Number(null) === 0` shipped a real bug once (`KZ-changes--bilateral-review-center-strip-and-
 * phase-1`) — every numeric/date field here checks for `null`/`undefined` explicitly instead of
 * trusting a bare `Number(...)`/`new Date(...)` coercion.
 */
const toNumberOr = (value: unknown, fallback: number): number =>
  value === null || value === undefined || value === '' ? fallback : Number(value);

const toNullableNumber = (value: unknown): number | null =>
  value === null || value === undefined || value === '' ? null : Number(value);

const toBoolean = (value: unknown): boolean => value === true || value === 1 || value === '1' || value === 'true';

const toDate = (value: string | null | undefined): Date | null =>
  value === null || value === undefined ? null : new Date(value);

const toDateOr = (value: string | null | undefined, fallback: Date): Date => toDate(value) ?? fallback;

export function normalizeJob(raw: RawBilateralAiJob): NormalizedBilateralAiJob {
  const createdDate = toDateOr(raw.created_date, new Date(0));
  const retriedDate = toDate(raw.retried_date);
  // The queue-entry clock (`requirements.md` §2): a retry restarts every age-based rule from the
  // retry moment, not the original upload.
  const queueEntryDate = retriedDate ?? createdDate;

  return {
    jobId: String(raw.job_id),
    userId: toNullableNumber(raw.user_id),
    centerId: toNullableNumber(raw.center_id),
    projectId: toNullableNumber(raw.project_id),
    programCode: raw.program_code ?? '',
    bucketName: raw.bucket_name ?? '',
    documentKeys: Array.isArray(raw.document_keys) ? raw.document_keys : [],
    audioKeys: Array.isArray(raw.audio_keys) ? raw.audio_keys : [],
    textContext: raw.text_context ?? null,
    status: (raw.status as BilateralAiJobStatus) ?? 'PENDING',
    stage: (raw.stage as BilateralAiStage) ?? 'queued',
    stageUpdatedDate: toDate(raw.stage_updated_date),
    attempts: toNumberOr(raw.attempts, 0),
    maxAttempts: toNumberOr(raw.max_attempts, 3),
    retrying: toBoolean(raw.retrying),
    queuePosition: toNullableNumber(raw.queue_position),
    externalInteractionId: raw.external_interaction_id ?? null,
    resultCount: toNumberOr(raw.result_count, 0),
    errorCode: raw.error_code ?? null,
    errorMessage: raw.error_message ?? null,
    createdDate,
    startedDate: toDate(raw.started_date),
    completedDate: toDate(raw.completed_date),
    retriedDate,
    queueEntryDate,
    lastUpdatedDate: toDate(raw.last_updated_date),
  };
}

// ── buildStepperModel ────────────────────────────────────────────────────

/** The 6 UI steps — the server's `reading` / `transcribing` / `reading_transcribing` collapse to one. */
export type BilateralAiStepId = 'queued' | 'uploading' | 'reading_transcribing' | 'extracting' | 'validating' | 'creating_drafts';

export type BilateralAiStepState = 'done' | 'active' | 'pending';

export interface BilateralAiStepModel {
  id: BilateralAiStepId;
  label: string;
  state: BilateralAiStepState;
  /** True for the steps PRMS pre-sets from the source mix rather than observes (`APF-DD-1`). */
  estimated: boolean;
}

const STEP_IDS: BilateralAiStepId[] = ['queued', 'uploading', 'reading_transcribing', 'extracting', 'validating', 'creating_drafts'];

const STAGE_TO_STEP_INDEX: Record<BilateralAiStage, number> = {
  queued: 0,
  uploading: 1,
  reading: 2,
  transcribing: 2,
  reading_transcribing: 2,
  extracting: 3,
  validating: 4,
  creating_drafts: 5,
};

/**
 * The `reading_transcribing` step's label. Once the server has moved on to `extracting`, the
 * current `stage` no longer tells us which of `reading` / `transcribing` / `reading_transcribing`
 * it passed through — the source mix (which keys the job actually carries) is the only thing that
 * still knows, which is why the label is derived from it rather than from `job.stage`.
 */
function readingTranscribingLabel(job: NormalizedBilateralAiJob): string {
  const hasDocs = job.documentKeys.length > 0;
  const hasAudio = job.audioKeys.length > 0;
  if (hasDocs && hasAudio) return 'Reading and transcribing your sources (estimated)';
  if (hasAudio) return 'Transcribing audio (estimated)';
  return 'Reading your documents (estimated)';
}

const STEP_LABELS: Record<Exclude<BilateralAiStepId, 'reading_transcribing'>, string> = {
  queued: 'Queued',
  uploading: 'Uploading your sources to the AI service',
  extracting: 'Extracting results (estimated)',
  validating: 'Validating and mapping',
  creating_drafts: 'Creating drafts',
};

/** The two UI steps PRMS pre-sets from the source mix rather than observes (`APF-DD-1`). */
const ESTIMATED_STEPS: ReadonlySet<BilateralAiStepId> = new Set(['reading_transcribing', 'extracting']);

export function buildStepperModel(job: NormalizedBilateralAiJob): BilateralAiStepModel[] {
  const allDone = job.status === 'COMPLETED';
  // PENDING jobs always carry stage='queued' server-side, and a retrying job resets stage to
  // 'queued' too (APF-R-3) — both land on step 0 through the same STAGE_TO_STEP_INDEX lookup.
  const activeIndex = STAGE_TO_STEP_INDEX[job.stage] ?? 0;

  return STEP_IDS.map((id, index) => {
    const state: BilateralAiStepState = allDone
      ? 'done'
      : index < activeIndex
        ? 'done'
        : index === activeIndex
          ? 'active'
          : 'pending';
    const label = id === 'reading_transcribing' ? readingTranscribingLabel(job) : STEP_LABELS[id];
    return { id, label, state, estimated: ESTIMATED_STEPS.has(id) };
  });
}

// ── elapsedSeconds ───────────────────────────────────────────────────────

/** Elapsed time from the queue-entry clock, not `createdDate` — a retry restarts the timer. */
export function elapsedSeconds(job: NormalizedBilateralAiJob, now: number): number {
  return Math.max(0, Math.floor((now - job.queueEntryDate.getTime()) / 1000));
}

// ── mixClass ─────────────────────────────────────────────────────────────

/** The two classes the expectations endpoint understands — there is no third "mixed" class. */
export function mixClass(job: NormalizedBilateralAiJob): BilateralAiMixClass {
  return job.audioKeys.length > 0 ? 'audio' : 'documents';
}

// ── errorCopy ────────────────────────────────────────────────────────────

export interface BilateralAiErrorCopy {
  message: string;
  actionLabel: string;
}

const ERROR_COPY: Readonly<Record<string, BilateralAiErrorCopy>> = {
  HTTP_413: { message: 'The files you uploaded are too large for the AI service to process.', actionLabel: 'Upload smaller files' },
  HTTP_415: { message: "One of the files you uploaded is a format the AI service doesn't support.", actionLabel: 'Upload a supported file type' },
  HTTP_502: { message: 'The AI service is temporarily unavailable.', actionLabel: 'Try again later' },
  HTTP_503: { message: 'The AI service is temporarily unavailable.', actionLabel: 'Try again later' },
  PROCESSING_ERROR: { message: 'The AI service ran into a problem while processing your sources.', actionLabel: 'Try again' },
  TIMED_OUT: { message: 'The AI service took too long to respond, so the job was stopped.', actionLabel: 'Try again' },
  QUEUE_STALLED: { message: 'The job queue stalled and this job could not be processed.', actionLabel: 'Try again' },
  QUEUE_NOT_AVAILABLE: { message: 'The AI service is not available right now.', actionLabel: 'Contact support' },
};

/**
 * The server can emit any `HTTP_<status>` — the eight mapped codes above are the known set, not
 * the possible set (`design.md` §6.2) — so an unmapped code renders the default arm instead of an
 * empty failure block.
 */
export function errorCopy(code: string | null | undefined): BilateralAiErrorCopy {
  if (code && ERROR_COPY[code]) return ERROR_COPY[code];
  return {
    message: `The AI service reported an error (${code ?? 'unknown'}). Try again or contact support.`,
    actionLabel: 'Try again',
  };
}
