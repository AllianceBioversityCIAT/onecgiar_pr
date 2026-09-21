import { RawBilateralAiJob } from './bilateral-ai-job.model';

/**
 * Captured-shape `getJob` fixtures (`KZ-changes--bilateral-review-center-strip-and-phase-1`):
 * ids/counters as strings, booleans as `0/1`, dates as ISO strings — mirroring
 * `onecgiar-pr-server/src/api/bilateral-ai/entities/bilateral-ai-job.entity.ts` plus the additive
 * `stage` / `stage_updated_date` / `retrying` / `retried_date` / `queue_position` / `max_attempts`
 * fields from `design.md` §3.1/§4.1. Used by `bilateral-ai-job.model.spec.ts` and
 * `bilateral-ai.service.spec.ts` so neither test invents a shape the server would never send.
 */

const BASE_DATE = '2026-09-15T10:00:00.000Z';

export function rawJob(overrides: Partial<RawBilateralAiJob> = {}): RawBilateralAiJob {
  return {
    job_id: 'a1b2c3d4-0000-0000-0000-000000000001',
    user_id: '501',
    center_id: '12',
    project_id: '77',
    program_code: 'SP-01',
    bucket_name: 'prms-bilateral-ai-test',
    document_keys: ['docs/report.pdf'],
    audio_keys: [],
    text_context: null,
    status: 'PENDING',
    stage: 'queued',
    stage_updated_date: null,
    attempts: '0',
    max_attempts: '3',
    retrying: 0,
    queue_position: '2',
    external_interaction_id: null,
    response_snapshot: null,
    result_count: '0',
    error_code: null,
    error_message: null,
    created_date: BASE_DATE,
    started_date: null,
    completed_date: null,
    retried_date: null,
    last_updated_date: BASE_DATE,
    ...overrides,
  };
}

// ── Pending, with queue position ────────────────────────────────────────

export const FIXTURE_PENDING_WITH_POSITION = rawJob({ status: 'PENDING', stage: 'queued', queue_position: '2' });

/** `retried_date: null` — `queueEntryDate` must fall back to `created_date` (Kaizen lesson). */
export const FIXTURE_NO_RETRY_DATE = rawJob({ retried_date: null });

/** A retried job — `queueEntryDate` resolves to `retried_date`, restarting every age-based rule. */
export const FIXTURE_RETRIED = rawJob({
  created_date: '2026-09-15T09:00:00.000Z',
  retried_date: '2026-09-15T10:20:00.000Z',
  status: 'PENDING',
  stage: 'queued',
  attempts: '0',
  queue_position: '1',
});

// ── Processing, one fixture per server stage ────────────────────────────

export const FIXTURE_PROCESSING_UPLOADING = rawJob({
  status: 'PROCESSING',
  stage: 'uploading',
  stage_updated_date: BASE_DATE,
  started_date: BASE_DATE,
  queue_position: null,
});

export const FIXTURE_PROCESSING_READING = rawJob({
  status: 'PROCESSING',
  stage: 'reading',
  document_keys: ['docs/report.pdf'],
  audio_keys: [],
  stage_updated_date: BASE_DATE,
  started_date: BASE_DATE,
  queue_position: null,
});

export const FIXTURE_PROCESSING_TRANSCRIBING = rawJob({
  status: 'PROCESSING',
  stage: 'transcribing',
  document_keys: [],
  audio_keys: ['audio/interview.mp3'],
  stage_updated_date: BASE_DATE,
  started_date: BASE_DATE,
  queue_position: null,
});

export const FIXTURE_PROCESSING_READING_TRANSCRIBING = rawJob({
  status: 'PROCESSING',
  stage: 'reading_transcribing',
  document_keys: ['docs/report.pdf'],
  audio_keys: ['audio/interview.mp3'],
  stage_updated_date: BASE_DATE,
  started_date: BASE_DATE,
  queue_position: null,
});

export const FIXTURE_PROCESSING_EXTRACTING = rawJob({
  status: 'PROCESSING',
  stage: 'extracting',
  document_keys: ['docs/report.pdf'],
  audio_keys: ['audio/interview.mp3'],
  stage_updated_date: BASE_DATE,
  started_date: BASE_DATE,
  queue_position: null,
});

export const FIXTURE_PROCESSING_VALIDATING = rawJob({
  status: 'PROCESSING',
  stage: 'validating',
  stage_updated_date: BASE_DATE,
  started_date: BASE_DATE,
  queue_position: null,
});

export const FIXTURE_PROCESSING_CREATING_DRAFTS = rawJob({
  status: 'PROCESSING',
  stage: 'creating_drafts',
  stage_updated_date: BASE_DATE,
  started_date: BASE_DATE,
  queue_position: null,
});

// ── Retrying ─────────────────────────────────────────────────────────────

export const FIXTURE_RETRYING = rawJob({
  status: 'PROCESSING',
  stage: 'queued',
  attempts: '2',
  max_attempts: '3',
  retrying: 1,
  error_code: 'HTTP_503',
  error_message: 'Bad gateway from the mining service',
  started_date: BASE_DATE,
  queue_position: null,
});

// ── Completed ────────────────────────────────────────────────────────────

export const FIXTURE_COMPLETED = rawJob({
  status: 'COMPLETED',
  stage: 'creating_drafts',
  result_count: '3',
  started_date: BASE_DATE,
  completed_date: '2026-09-15T10:06:00.000Z',
  queue_position: null,
});

export const FIXTURE_COMPLETED_NO_CANDIDATES = rawJob({
  status: 'COMPLETED',
  stage: 'creating_drafts',
  result_count: 0,
  started_date: BASE_DATE,
  completed_date: '2026-09-15T10:04:00.000Z',
  queue_position: null,
});

// ── Failed, one fixture per error_code ───────────────────────────────────

const failedFixture = (code: string): RawBilateralAiJob =>
  rawJob({
    status: 'FAILED',
    stage: 'extracting',
    error_code: code,
    error_message: `${code} from the mining service`,
    started_date: BASE_DATE,
    completed_date: '2026-09-15T10:08:00.000Z',
    queue_position: null,
  });

export const FIXTURE_FAILED_HTTP_413 = failedFixture('HTTP_413');
export const FIXTURE_FAILED_HTTP_415 = failedFixture('HTTP_415');
export const FIXTURE_FAILED_HTTP_502 = failedFixture('HTTP_502');
export const FIXTURE_FAILED_HTTP_503 = failedFixture('HTTP_503');
export const FIXTURE_FAILED_PROCESSING_ERROR = failedFixture('PROCESSING_ERROR');
export const FIXTURE_FAILED_TIMED_OUT = failedFixture('TIMED_OUT');
export const FIXTURE_FAILED_QUEUE_STALLED = failedFixture('QUEUE_STALLED');
export const FIXTURE_FAILED_QUEUE_NOT_AVAILABLE = failedFixture('QUEUE_NOT_AVAILABLE');
/** A code the server can emit that the client's `errorCopy` table does not map — the default arm. */
export const FIXTURE_FAILED_UNMAPPED = failedFixture('HTTP_418');
