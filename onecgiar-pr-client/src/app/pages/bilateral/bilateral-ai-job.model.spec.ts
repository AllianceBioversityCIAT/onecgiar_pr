import { buildStepperModel, elapsedSeconds, errorCopy, mixClass, normalizeJob } from './bilateral-ai-job.model';
import {
  FIXTURE_COMPLETED,
  FIXTURE_FAILED_HTTP_413,
  FIXTURE_FAILED_HTTP_415,
  FIXTURE_FAILED_HTTP_502,
  FIXTURE_FAILED_HTTP_503,
  FIXTURE_FAILED_PROCESSING_ERROR,
  FIXTURE_FAILED_QUEUE_NOT_AVAILABLE,
  FIXTURE_FAILED_QUEUE_STALLED,
  FIXTURE_FAILED_TIMED_OUT,
  FIXTURE_FAILED_UNMAPPED,
  FIXTURE_NO_RETRY_DATE,
  FIXTURE_PENDING_WITH_POSITION,
  FIXTURE_PROCESSING_CREATING_DRAFTS,
  FIXTURE_PROCESSING_EXTRACTING,
  FIXTURE_PROCESSING_READING,
  FIXTURE_PROCESSING_READING_TRANSCRIBING,
  FIXTURE_PROCESSING_TRANSCRIBING,
  FIXTURE_PROCESSING_UPLOADING,
  FIXTURE_PROCESSING_VALIDATING,
  FIXTURE_RETRIED,
  FIXTURE_RETRYING,
  rawJob,
} from './bilateral-ai-job.fixtures';

describe('bilateral-ai-job.model', () => {
  // ── normalizeJob ─────────────────────────────────────────────────────

  describe('normalizeJob', () => {
    it.each([
      ['pending with queue position', FIXTURE_PENDING_WITH_POSITION],
      ['no retry date', FIXTURE_NO_RETRY_DATE],
      ['retried', FIXTURE_RETRIED],
      ['processing: uploading', FIXTURE_PROCESSING_UPLOADING],
      ['processing: reading', FIXTURE_PROCESSING_READING],
      ['processing: transcribing', FIXTURE_PROCESSING_TRANSCRIBING],
      ['processing: reading_transcribing', FIXTURE_PROCESSING_READING_TRANSCRIBING],
      ['processing: extracting', FIXTURE_PROCESSING_EXTRACTING],
      ['processing: validating', FIXTURE_PROCESSING_VALIDATING],
      ['processing: creating_drafts', FIXTURE_PROCESSING_CREATING_DRAFTS],
      ['retrying', FIXTURE_RETRYING],
      ['completed', FIXTURE_COMPLETED],
      ['failed: HTTP_413', FIXTURE_FAILED_HTTP_413],
      ['failed: HTTP_415', FIXTURE_FAILED_HTTP_415],
      ['failed: HTTP_502', FIXTURE_FAILED_HTTP_502],
      ['failed: HTTP_503', FIXTURE_FAILED_HTTP_503],
      ['failed: PROCESSING_ERROR', FIXTURE_FAILED_PROCESSING_ERROR],
      ['failed: TIMED_OUT', FIXTURE_FAILED_TIMED_OUT],
      ['failed: QUEUE_STALLED', FIXTURE_FAILED_QUEUE_STALLED],
      ['failed: QUEUE_NOT_AVAILABLE', FIXTURE_FAILED_QUEUE_NOT_AVAILABLE],
      ['failed: unmapped code', FIXTURE_FAILED_UNMAPPED],
    ])('normalizes every captured-shape fixture without throwing: %s', (_name, fixture) => {
      expect(() => normalizeJob(fixture)).not.toThrow();
      const job = normalizeJob(fixture);
      expect(job.jobId).toBe(fixture.job_id);
      expect(job.createdDate).toBeInstanceOf(Date);
      expect(job.queueEntryDate).toBeInstanceOf(Date);
    });

    it('converts a string `attempts` to a number', () => {
      const job = normalizeJob(rawJob({ attempts: '2' }));
      expect(job.attempts).toBe(2);
      expect(typeof job.attempts).toBe('number');
    });

    it('converts `retrying: 1` to `true`', () => {
      const job = normalizeJob(rawJob({ retrying: 1 }));
      expect(job.retrying).toBe(true);
    });

    it('converts `retrying: 0` to `false`', () => {
      const job = normalizeJob(rawJob({ retrying: 0 }));
      expect(job.retrying).toBe(false);
    });

    it('parses ISO date strings into real Date objects', () => {
      const job = normalizeJob(rawJob({ created_date: '2026-09-15T10:00:00.000Z' }));
      expect(job.createdDate.toISOString()).toBe('2026-09-15T10:00:00.000Z');
    });

    it('falls back queueEntryDate to created_date when retried_date is null (Number(null)===0 trap)', () => {
      const job = normalizeJob(FIXTURE_NO_RETRY_DATE);
      expect(job.retriedDate).toBeNull();
      expect(job.queueEntryDate.toISOString()).toBe(job.createdDate.toISOString());
    });

    it('resolves queueEntryDate to retried_date, restarting the clock after a retry', () => {
      const job = normalizeJob(FIXTURE_RETRIED);
      expect(job.queueEntryDate.toISOString()).toBe('2026-09-15T10:20:00.000Z');
      expect(job.createdDate.toISOString()).toBe('2026-09-15T09:00:00.000Z');
    });

    it('does not collapse a null queue_position to 0 (Number(null)===0 trap)', () => {
      const job = normalizeJob(rawJob({ queue_position: null }));
      expect(job.queuePosition).toBeNull();
    });

    it('keeps a numeric queue_position intact when sent as a string', () => {
      const job = normalizeJob(rawJob({ queue_position: '2' }));
      expect(job.queuePosition).toBe(2);
    });

    it('defaults document_keys/audio_keys to an empty array when null', () => {
      const job = normalizeJob(rawJob({ document_keys: null, audio_keys: null }));
      expect(job.documentKeys).toEqual([]);
      expect(job.audioKeys).toEqual([]);
    });
  });

  // ── buildStepperModel ────────────────────────────────────────────────

  describe('buildStepperModel', () => {
    const stateOf = (job: ReturnType<typeof normalizeJob>, id: string) => buildStepperModel(job).find(s => s.id === id)?.state;
    const estimatedOf = (job: ReturnType<typeof normalizeJob>, id: string) => buildStepperModel(job).find(s => s.id === id)?.estimated;

    it('has exactly 6 UI steps', () => {
      expect(buildStepperModel(normalizeJob(FIXTURE_PENDING_WITH_POSITION))).toHaveLength(6);
    });

    it('PENDING: queued active, everything else pending', () => {
      const job = normalizeJob(FIXTURE_PENDING_WITH_POSITION);
      const steps = buildStepperModel(job);
      expect(steps.map(s => s.state)).toEqual(['active', 'pending', 'pending', 'pending', 'pending', 'pending']);
    });

    it('PROCESSING/extracting: uploading and reading_transcribing done, extracting active, later pending', () => {
      const job = normalizeJob(FIXTURE_PROCESSING_EXTRACTING);
      const steps = buildStepperModel(job);
      expect(steps.map(s => s.state)).toEqual(['done', 'done', 'done', 'active', 'pending', 'pending']);
    });

    it.each([
      ['reading', FIXTURE_PROCESSING_READING],
      ['transcribing', FIXTURE_PROCESSING_TRANSCRIBING],
      ['reading_transcribing', FIXTURE_PROCESSING_READING_TRANSCRIBING],
    ])('all three server "reading" stages (%s) map onto the single reading_transcribing UI step, active', (_name, fixture) => {
      const job = normalizeJob(fixture);
      expect(stateOf(job, 'reading_transcribing')).toBe('active');
    });

    it('the reading_transcribing and extracting UI steps are the estimated ones', () => {
      const job = normalizeJob(FIXTURE_PROCESSING_EXTRACTING);
      expect(estimatedOf(job, 'reading_transcribing')).toBe(true);
      expect(estimatedOf(job, 'extracting')).toBe(true);
      expect(estimatedOf(job, 'queued')).toBe(false);
      expect(estimatedOf(job, 'uploading')).toBe(false);
      expect(estimatedOf(job, 'validating')).toBe(false);
      expect(estimatedOf(job, 'creating_drafts')).toBe(false);
    });

    it('labels the reading_transcribing step by source mix — documents only', () => {
      const job = normalizeJob(FIXTURE_PROCESSING_READING);
      const step = buildStepperModel(job).find(s => s.id === 'reading_transcribing');
      expect(step?.label).toBe('Reading your documents (estimated)');
    });

    it('labels the reading_transcribing step by source mix — audio only', () => {
      const job = normalizeJob(FIXTURE_PROCESSING_TRANSCRIBING);
      const step = buildStepperModel(job).find(s => s.id === 'reading_transcribing');
      expect(step?.label).toBe('Transcribing audio (estimated)');
    });

    it('labels the reading_transcribing step by source mix — documents and audio', () => {
      const job = normalizeJob(FIXTURE_PROCESSING_READING_TRANSCRIBING);
      const step = buildStepperModel(job).find(s => s.id === 'reading_transcribing');
      expect(step?.label).toBe('Reading and transcribing your sources (estimated)');
    });

    it('retrying: keeps the stepper at queued (reset), not a failed state', () => {
      const job = normalizeJob(FIXTURE_RETRYING);
      expect(job.retrying).toBe(true);
      expect(stateOf(job, 'queued')).toBe('active');
    });

    it('COMPLETED: every step is done', () => {
      const job = normalizeJob(FIXTURE_COMPLETED);
      const steps = buildStepperModel(job);
      expect(steps.every(s => s.state === 'done')).toBe(true);
    });

    it('PROCESSING/validating and creating_drafts steps are never marked estimated', () => {
      const validating = normalizeJob(FIXTURE_PROCESSING_VALIDATING);
      const creatingDrafts = normalizeJob(FIXTURE_PROCESSING_CREATING_DRAFTS);
      expect(estimatedOf(validating, 'validating')).toBe(false);
      expect(estimatedOf(creatingDrafts, 'creating_drafts')).toBe(false);
    });
  });

  // ── elapsedSeconds ───────────────────────────────────────────────────

  describe('elapsedSeconds', () => {
    it('measures from queueEntryDate, not createdDate', () => {
      const job = normalizeJob(FIXTURE_RETRIED); // queueEntryDate = 2026-09-15T10:20:00.000Z
      const now = Date.parse('2026-09-15T10:21:30.000Z');
      expect(elapsedSeconds(job, now)).toBe(90);
    });

    it('never returns a negative number', () => {
      const job = normalizeJob(FIXTURE_PENDING_WITH_POSITION);
      const before = job.queueEntryDate.getTime() - 5000;
      expect(elapsedSeconds(job, before)).toBe(0);
    });
  });

  // ── mixClass ─────────────────────────────────────────────────────────

  describe('mixClass', () => {
    it('is "documents" when there is no audio source', () => {
      expect(mixClass(normalizeJob(FIXTURE_PROCESSING_READING))).toBe('documents');
    });

    it('is "audio" when any audio source is present, even alongside documents', () => {
      expect(mixClass(normalizeJob(FIXTURE_PROCESSING_TRANSCRIBING))).toBe('audio');
      expect(mixClass(normalizeJob(FIXTURE_PROCESSING_READING_TRANSCRIBING))).toBe('audio');
    });
  });

  // ── errorCopy ────────────────────────────────────────────────────────

  describe('errorCopy', () => {
    it.each(['HTTP_413', 'HTTP_415', 'HTTP_502', 'HTTP_503', 'PROCESSING_ERROR', 'TIMED_OUT', 'QUEUE_STALLED', 'QUEUE_NOT_AVAILABLE'])(
      'maps %s to plain-words copy, not the raw code',
      code => {
        const copy = errorCopy(code);
        expect(copy.message).not.toBe(code);
        expect(copy.message.length).toBeGreaterThan(0);
        expect(copy.actionLabel.length).toBeGreaterThan(0);
      },
    );

    it('renders the default arm for a code the table does not map, without throwing', () => {
      expect(() => errorCopy('HTTP_418')).not.toThrow();
      const copy = errorCopy('HTTP_418');
      expect(copy.message).toBe('The AI service reported an error (HTTP_418). Try again or contact support.');
    });

    it('renders the default arm for a null/undefined code, without throwing', () => {
      expect(() => errorCopy(null)).not.toThrow();
      expect(() => errorCopy(undefined)).not.toThrow();
    });
  });
});
