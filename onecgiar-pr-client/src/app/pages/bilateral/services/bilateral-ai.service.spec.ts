import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { BilateralAiService } from './bilateral-ai.service';
import { RawBilateralAiJob } from '../bilateral-ai-job.model';
import { BilateralApiService } from '../../../shared/services/api/bilateral-api.service';
import { ResultsApiService } from '../../../shared/services/api/results-api.service';
import { BilateralContextService } from './bilateral-context.service';
import { BilateralCreationService } from './bilateral-creation.service';
import { PrToastService } from '../../../shared/components/pr-toast/pr-toast.service';

/**
 * The AI-upload job is the only bilateral piece with a real state machine: an adaptive poll
 * (5 s → 15 s after 2 min → 30 s past the 30-minute ceiling) that has to stop by itself on
 * COMPLETED / FAILED / 404 / 410 / 401, never outlive the service, and never declare a failure the
 * server did not (`APF-R-7`, `APF-DD-6`).
 *
 * Every terminal state ends in `completionNotice` — the app-wide dialog — unless the processing
 * panel is the live outcome surface (`panelVisible`, `APF-DD-7`), and NEVER in a navigation or a
 * toast (2026-09-07): the redirect yanked people out of their work and the toast went unnoticed.
 * The job also survives a reload through localStorage, regardless of its age (`APF-R-7`).
 */
describe('BilateralAiService', () => {
  let service: BilateralAiService;
  let bilateralApi: any;
  let resultsApi: any;
  let router: any;
  let ctx: { centerInstitutionId: any; centerAcronym: any };
  let creation: any;
  let toast: any;

  const POLL_INTERVAL_INITIAL = 5_000;
  const POLL_INTERVAL_MID = 15_000;
  const POLL_INTERVAL_CEILING = 30_000;
  const ADAPTIVE_SWITCH_MS = 120_000;
  const CEILING_MS = 1_800_000;
  const ACTIVE_JOB_STORAGE_KEY = 'prms.bilateral-ai.active-job';

  const NOW_ISO = '2026-09-15T10:00:00.000Z';
  const NOW_MS = Date.parse(NOW_ISO);

  const job = (over: Partial<RawBilateralAiJob> = {}): RawBilateralAiJob =>
    ({
      job_id: 'job-1',
      status: 'PENDING',
      stage: 'queued',
      created_date: NOW_ISO,
      result_count: 0,
      error_message: null,
      document_keys: ['docs/report.pdf'],
      audio_keys: [],
      ...over,
    }) as RawBilateralAiJob;

  /** Lets the `await toPromise()` inside pollJob settle; fake timers do not touch microtasks. */
  const flush = async () => {
    for (let i = 0; i < 10; i++) await Promise.resolve();
  };

  /** Advance the fake clock and let every poll that fired resolve. */
  const advance = async (ms: number) => {
    jest.advanceTimersByTime(ms);
    await flush();
  };

  const configureTestBed = () => {
    TestBed.configureTestingModule({
      providers: [
        BilateralAiService,
        { provide: BilateralApiService, useValue: bilateralApi },
        { provide: ResultsApiService, useValue: resultsApi },
        { provide: Router, useValue: router },
        { provide: BilateralContextService, useValue: ctx },
        { provide: BilateralCreationService, useValue: creation },
        { provide: PrToastService, useValue: toast }
      ]
    });
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW_MS);
    localStorage.clear();

    bilateralApi = {
      GET_bilateralAiJob: jest.fn().mockReturnValue(of({ response: job() })),
      GET_bilateralAiDrafts: jest.fn().mockReturnValue(of([])),
      GET_bilateralAiDraft: jest.fn().mockReturnValue(of({ response: null })),
      POST_promoteBilateralAiDraft: jest.fn().mockReturnValue(of({ response: {} })),
      DELETE_bilateralAiDraft: jest.fn().mockReturnValue(of({})),
      POST_bilateralAiJobRetry: jest.fn().mockReturnValue(of({ response: { jobId: 'job-1', jobStatus: 'PENDING' } })),
      GET_bilateralAiJobExpectations: jest.fn().mockReturnValue(of({ response: { mix: 'documents', sampleSize: 8, p25Minutes: 3, p75Minutes: 6 } }))
    };
    resultsApi = {
      GET_AllInitiatives: jest.fn().mockReturnValue(of({ response: [] })),
      GET_ClarisaProjects: jest.fn().mockReturnValue(of({ response: [] }))
    };
    // The create wizard URL — where completion used to auto-redirect. It must not matter anymore.
    router = { navigate: jest.fn().mockResolvedValue(true), url: '/bilateral/ALLIANCE/create' };
    ctx = { centerInstitutionId: signal<number | null>(null), centerAcronym: signal('ALLIANCE') };
    creation = { isAiGenerated: signal(false) };
    toast = { add: jest.fn() };

    configureTestBed();
    service = TestBed.inject(BilateralAiService);
  });

  afterEach(() => {
    service.stopPolling();
    localStorage.clear();
    jest.useRealTimers();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
    expect(service.uploadState().status).toBe('idle');
  });

  // ── promoteDraft: lands on the canonical editor URL ──────────────────────
  describe('promoteDraft', () => {
    it('navigates with the result CODE and the phase — the URL the results list opens (2026-09-04)', () => {
      bilateralApi.POST_promoteBilateralAiDraft.mockReturnValue(of({ response: { resultId: 11514, resultCode: 9046, versionId: 36 } }));

      service.promoteDraft(1);

      expect(router.navigate).toHaveBeenCalledWith(['/bilateral', 'ALLIANCE', 'result', 9046], { queryParams: { phase: 36 } });
      expect(creation.isAiGenerated()).toBe(true);
    });

    it('falls back to the internal id when an older server omits code/version', () => {
      bilateralApi.POST_promoteBilateralAiDraft.mockReturnValue(of({ response: { resultId: 11514 } }));

      service.promoteDraft(1);

      expect(router.navigate).toHaveBeenCalledWith(['/bilateral', 'ALLIANCE', 'result', 11514]);
    });

    it('returns to the drafts list when the response carries no result at all', () => {
      bilateralApi.POST_promoteBilateralAiDraft.mockReturnValue(of({ response: {} }));

      service.promoteDraft(1);

      expect(router.navigate).toHaveBeenCalledWith(['/bilateral', 'ALLIANCE', 'drafts']);
    });
  });

  // ── startJob: the machine boots, polls straight away, and normalizes the response ───────

  describe('startJob', () => {
    it('records the job, jumps to pending at 100% and polls immediately', async () => {
      service.startJob('job-1');
      await flush();

      expect(service.currentJobId()).toBe('job-1');
      expect(service.uploadState()).toEqual({ jobId: 'job-1', status: 'pending', uploadProgress: 100 });
      // The first poll must NOT wait a whole interval — the user is staring at the screen.
      expect(bilateralApi.GET_bilateralAiJob).toHaveBeenCalledTimes(1);
      expect(bilateralApi.GET_bilateralAiJob).toHaveBeenCalledWith('job-1');
    });

    it('normalizes every poll onto currentJob (string ids, ISO dates, 0/1 booleans)', async () => {
      bilateralApi.GET_bilateralAiJob.mockReturnValue(
        of({ response: job({ status: 'PROCESSING', stage: 'extracting', attempts: '2', retrying: 1, queue_position: null }) })
      );
      service.startJob('job-1');
      await flush();

      const normalized = service.currentJob();
      expect(normalized?.attempts).toBe(2);
      expect(typeof normalized?.attempts).toBe('number');
      expect(normalized?.retrying).toBe(true);
      expect(normalized?.stage).toBe('extracting');
      expect(normalized?.createdDate).toBeInstanceOf(Date);
    });

    it('keeps polling every 5 s while the job is PENDING, inside the first 2 minutes', async () => {
      service.startJob('job-1');
      await flush();

      await advance(POLL_INTERVAL_INITIAL);
      expect(bilateralApi.GET_bilateralAiJob).toHaveBeenCalledTimes(2);

      await advance(POLL_INTERVAL_INITIAL * 2);
      expect(bilateralApi.GET_bilateralAiJob).toHaveBeenCalledTimes(4);

      expect(service.currentJob()?.status).toBe('PENDING');
      expect(service.uploadState().status).toBe('pending');
    });

    it('moves to processing and then completes, without restarting the clock', async () => {
      bilateralApi.GET_bilateralAiJob.mockReturnValue(of({ response: job({ status: 'PROCESSING', stage: 'extracting' }) }));
      service.startJob('job-1');
      await flush();
      expect(service.uploadState().status).toBe('processing');

      bilateralApi.GET_bilateralAiJob.mockReturnValue(of({ response: job({ status: 'COMPLETED', stage: 'creating_drafts', result_count: 3 }) }));
      await advance(POLL_INTERVAL_INITIAL);

      expect(service.uploadState().status).toBe('completed');
      expect(service.completionNotice()).toEqual({
        jobId: 'job-1',
        centerAcronym: 'ALLIANCE',
        status: 'completed',
        resultCount: 3,
        errorMessage: undefined
      });

      // COMPLETED stops the machine: no poll may happen after it.
      const callsAtCompletion = bilateralApi.GET_bilateralAiJob.mock.calls.length;
      await advance(POLL_INTERVAL_INITIAL * 5);
      expect(bilateralApi.GET_bilateralAiJob).toHaveBeenCalledTimes(callsAtCompletion);
    });

    // 2026-09-04: the forced redirect yanked people out of their work. 2026-09-07: the toast that
    // replaced it went unnoticed ("no feedback at all"). Completion now NEVER navigates and NEVER
    // toasts — on the create wizard or anywhere else — it raises the dialog notice and reloads
    // the drafts, and the server mails the uploader a link as the durable half.
    it('never redirects nor toasts on completion — the outcome is the dialog notice', async () => {
      bilateralApi.GET_bilateralAiJob.mockReturnValue(of({ response: job({ status: 'COMPLETED', stage: 'creating_drafts', result_count: 2 }) }));
      for (const url of ['/bilateral/ALLIANCE/create', '/bilateral/Bioversity%20%28Alliance%29/create', '/bilateral/ALLIANCE/result/9046']) {
        router.url = url;
        service.dismissCompletionNotice();
        service.startJob('job-1');
        await flush();

        expect(service.uploadState().status).toBe('completed');
        expect(router.navigate).not.toHaveBeenCalled();
        expect(toast.add).not.toHaveBeenCalled();
        expect(service.completionNotice()?.status).toBe('completed');
        expect(service.completionNotice()?.resultCount).toBe(2);
        expect(bilateralApi.GET_bilateralAiDrafts).not.toHaveBeenCalled(); // centerInstitutionId is null here
      }
    });

    // The centre is captured when the job STARTS. By the time it ends the user may be on another
    // centre, outside bilateral, or back from a reload — the context signal is not trustworthy.
    it('the notice carries the centre of the job, not whatever centre is in context at the end', async () => {
      bilateralApi.GET_bilateralAiJob.mockReturnValue(of({ response: job({ status: 'PROCESSING', stage: 'extracting' }) }));
      service.startJob('job-1');
      await flush();

      ctx.centerAcronym.set('CIP');
      bilateralApi.GET_bilateralAiJob.mockReturnValue(of({ response: job({ status: 'COMPLETED', stage: 'creating_drafts', result_count: 1 }) }));
      await advance(POLL_INTERVAL_INITIAL);

      expect(service.completionNotice()?.centerAcronym).toBe('ALLIANCE');
    });

    it('openDraftsFromNotice navigates to that centre\'s Drafts list and clears the notice', async () => {
      bilateralApi.GET_bilateralAiJob.mockReturnValue(of({ response: job({ status: 'COMPLETED', stage: 'creating_drafts', result_count: 2 }) }));
      service.startJob('job-1');
      await flush();

      service.openDraftsFromNotice();

      expect(router.navigate).toHaveBeenCalledWith(['/bilateral', 'ALLIANCE', 'drafts']);
      expect(service.completionNotice()).toBeNull();
    });

    it('dismissCompletionNotice clears the notice without navigating', async () => {
      bilateralApi.GET_bilateralAiJob.mockReturnValue(of({ response: job({ status: 'COMPLETED', stage: 'creating_drafts', result_count: 2 }) }));
      service.startJob('job-1');
      await flush();

      service.dismissCompletionNotice();

      expect(service.completionNotice()).toBeNull();
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('replaces a running job instead of stacking a second interval', async () => {
      service.startJob('job-1');
      await flush();
      service.startJob('job-2');
      await flush();

      bilateralApi.GET_bilateralAiJob.mockClear();
      await advance(POLL_INTERVAL_INITIAL);

      // One interval alive, and it polls the NEW job.
      expect(bilateralApi.GET_bilateralAiJob).toHaveBeenCalledTimes(1);
      expect(bilateralApi.GET_bilateralAiJob).toHaveBeenCalledWith('job-2');
    });
  });

  // ── COMPLETED with nothing to show ──────────────────────────────────────

  describe('a completed job that produced no candidates', () => {
    beforeEach(async () => {
      bilateralApi.GET_bilateralAiJob.mockReturnValue(of({ response: job({ status: 'COMPLETED', stage: 'creating_drafts', result_count: 0 }) }));
      service.startJob('job-1');
      await flush();
    });

    it('lands on completed_no_candidates instead of completed', () => {
      expect(service.uploadState().status).toBe('completed_no_candidates');
    });

    // Finishing empty-handed is still finishing: the user waiting somewhere else must hear it.
    it('raises the notice too, with zero results', () => {
      expect(service.completionNotice()).toEqual(expect.objectContaining({ status: 'completed_no_candidates', resultCount: 0 }));
    });

    // The empty-handed branch must not send the user to an empty Drafts list, nor refresh it.
    it('does not navigate to the drafts list nor reload it', () => {
      expect(router.navigate).not.toHaveBeenCalled();
      expect(bilateralApi.GET_bilateralAiDrafts).not.toHaveBeenCalled();
    });

    it('stops polling', async () => {
      const calls = bilateralApi.GET_bilateralAiJob.mock.calls.length;
      await advance(POLL_INTERVAL_INITIAL * 4);
      expect(bilateralApi.GET_bilateralAiJob).toHaveBeenCalledTimes(calls);
    });
  });

  it('surfaces the server message and stops polling when the job FAILS', async () => {
    bilateralApi.GET_bilateralAiJob.mockReturnValue(of({ response: job({ status: 'FAILED', stage: 'extracting', error_message: 'Bad document' }) }));
    service.startJob('job-1');
    await flush();

    expect(service.uploadState().status).toBe('failed');
    expect(service.uploadState().errorMessage).toBe('Bad document');
    expect(service.completionNotice()).toEqual(expect.objectContaining({ status: 'failed', errorMessage: 'Bad document' }));

    const calls = bilateralApi.GET_bilateralAiJob.mock.calls.length;
    await advance(POLL_INTERVAL_INITIAL * 4);
    expect(bilateralApi.GET_bilateralAiJob).toHaveBeenCalledTimes(calls);
  });

  // ── panelVisible: the single-outcome-surface gate (APF-DD-7, D3) ────────────────────────

  describe('panelVisible', () => {
    it('panelVisible true: the terminal state does NOT set completionNotice (the panel shows it inline)', async () => {
      service.setPanelVisible(true);
      bilateralApi.GET_bilateralAiJob.mockReturnValue(of({ response: job({ status: 'COMPLETED', stage: 'creating_drafts', result_count: 2 }) }));

      service.startJob('job-1');
      await flush();

      expect(service.completionNotice()).toBeNull();
      expect(service.uploadState().status).toBe('completed'); // the panel still has the outcome to render
    });

    it('panelVisible false: the terminal state DOES set completionNotice (the dialog is the only surface)', async () => {
      service.setPanelVisible(false);
      bilateralApi.GET_bilateralAiJob.mockReturnValue(of({ response: job({ status: 'COMPLETED', stage: 'creating_drafts', result_count: 2 }) }));

      service.startJob('job-1');
      await flush();

      expect(service.completionNotice()).not.toBeNull();
    });

    it('setPanelVisible(false) after a suppressed notice does not retroactively raise it', async () => {
      service.setPanelVisible(true);
      bilateralApi.GET_bilateralAiJob.mockReturnValue(of({ response: job({ status: 'COMPLETED', stage: 'creating_drafts', result_count: 2 }) }));
      service.startJob('job-1');
      await flush();

      service.setPanelVisible(false);

      expect(service.completionNotice()).toBeNull();
    });
  });

  // ── retryJob: APF-R-5 / APF-R-9 ──────────────────────────────────────────────────────────

  describe('retryJob', () => {
    it('calls the retry endpoint and restarts polling on the same job id', async () => {
      service.retryJob('job-7');
      expect(bilateralApi.POST_bilateralAiJobRetry).toHaveBeenCalledWith('job-7');
      await flush();

      expect(service.currentJobId()).toBe('job-7');
      expect(service.uploadState().status).toBe('pending');
      expect(bilateralApi.GET_bilateralAiJob).toHaveBeenCalledWith('job-7');

      bilateralApi.GET_bilateralAiJob.mockClear();
      await advance(POLL_INTERVAL_INITIAL);
      expect(bilateralApi.GET_bilateralAiJob).toHaveBeenCalledWith('job-7');
    });

    it('on 410 (sources gone), resets to the upload form with an explanation, and does not poll', async () => {
      bilateralApi.POST_bilateralAiJobRetry.mockReturnValue(throwError(() => ({ status: 410 })));

      service.retryJob('job-7');
      await flush();

      expect(service.uploadState().status).toBe('idle');
      expect(service.uploadState().jobId).toBeNull();
      expect(service.uploadState().errorMessage).toBeTruthy();
      expect(service.currentJobId()).toBeNull();

      bilateralApi.GET_bilateralAiJob.mockClear();
      await advance(POLL_INTERVAL_INITIAL * 3);
      expect(bilateralApi.GET_bilateralAiJob).not.toHaveBeenCalled();
    });

    it('on any other error, surfaces a failed state without starting to poll', async () => {
      bilateralApi.POST_bilateralAiJobRetry.mockReturnValue(throwError(() => ({ status: 409 })));

      service.retryJob('job-7');
      await flush();

      expect(service.uploadState().status).toBe('failed');
      bilateralApi.GET_bilateralAiJob.mockClear();
      await advance(POLL_INTERVAL_INITIAL * 3);
      expect(bilateralApi.GET_bilateralAiJob).not.toHaveBeenCalled();
    });
  });

  // ── expectations: cached per mix for the session ─────────────────────────────────────────

  describe('expectations', () => {
    it('calls the API once per mix even when requested repeatedly', () => {
      service.expectations('documents').subscribe();
      service.expectations('documents').subscribe();
      service.expectations('documents').subscribe();

      expect(bilateralApi.GET_bilateralAiJobExpectations).toHaveBeenCalledTimes(1);
      expect(bilateralApi.GET_bilateralAiJobExpectations).toHaveBeenCalledWith('documents');
    });

    it('caches per mix independently — "audio" gets its own call', () => {
      service.expectations('documents').subscribe();
      service.expectations('audio').subscribe();
      service.expectations('audio').subscribe();

      expect(bilateralApi.GET_bilateralAiJobExpectations).toHaveBeenCalledTimes(2);
    });

    it('unwraps the response envelope', done => {
      service.expectations('documents').subscribe(result => {
        expect(result).toEqual({ mix: 'documents', sampleSize: 8, p25Minutes: 3, p75Minutes: 6 });
        done();
      });
    });
  });

  // ── Surviving a reload ──────────────────────────────────────────────────

  describe('the active job in localStorage', () => {
    it('is written when a job starts and removed when it ends', async () => {
      bilateralApi.GET_bilateralAiJob.mockReturnValue(of({ response: job({ status: 'PROCESSING', stage: 'extracting' }) }));
      service.startJob('job-1');
      await flush();

      const stored = JSON.parse(localStorage.getItem(ACTIVE_JOB_STORAGE_KEY) ?? 'null');
      expect(stored).toEqual(expect.objectContaining({ jobId: 'job-1', centerAcronym: 'ALLIANCE' }));
      expect(typeof stored.startedAt).toBe('number');

      bilateralApi.GET_bilateralAiJob.mockReturnValue(of({ response: job({ status: 'COMPLETED', stage: 'creating_drafts', result_count: 1 }) }));
      await advance(POLL_INTERVAL_INITIAL);
      expect(localStorage.getItem(ACTIVE_JOB_STORAGE_KEY)).toBeNull();
    });

    // A reload used to lose the job for good: polling lived in memory only, so the user never
    // heard the outcome unless they went to Drafts by themselves.
    it('is picked up by a fresh service instance, which polls it to its outcome', async () => {
      localStorage.setItem(
        ACTIVE_JOB_STORAGE_KEY,
        JSON.stringify({ jobId: 'job-9', centerAcronym: 'Bioversity (Alliance)', startedAt: Date.now() - 60_000 })
      );
      bilateralApi.GET_bilateralAiJob.mockReturnValue(
        of({ response: job({ job_id: 'job-9', status: 'COMPLETED', stage: 'creating_drafts', result_count: 4 }) })
      );

      TestBed.resetTestingModule();
      configureTestBed();
      const resumed = TestBed.inject(BilateralAiService);
      await flush();

      expect(bilateralApi.GET_bilateralAiJob).toHaveBeenCalledWith('job-9');
      expect(resumed.completionNotice()).toEqual(
        expect.objectContaining({ jobId: 'job-9', centerAcronym: 'Bioversity (Alliance)', status: 'completed', resultCount: 4 })
      );
      expect(router.navigate).not.toHaveBeenCalled();
      resumed.stopPolling();
    });

    // APF-R-7 AND-IT-MUST: removed the old MAX_POLL_DURATION-age drop on resume. Old assertion
    // (record kept for history): a record older than the 30-minute ceiling was NOT resumed at all
    // and the poller never fired. That is no longer true — only a terminal server state or a
    // 404/410 on poll drops the record now.
    it('is resumed regardless of age, as long as the server still reports a non-terminal status', async () => {
      const OLD_MS = NOW_MS - CEILING_MS - 3_600_000;
      localStorage.setItem(
        ACTIVE_JOB_STORAGE_KEY,
        JSON.stringify({ jobId: 'job-old', centerAcronym: 'CIP', startedAt: OLD_MS })
      );
      bilateralApi.GET_bilateralAiJob.mockReturnValue(
        of({ response: job({ job_id: 'job-old', status: 'PROCESSING', stage: 'extracting', created_date: new Date(OLD_MS).toISOString() }) })
      );

      TestBed.resetTestingModule();
      configureTestBed();
      const resumed = TestBed.inject(BilateralAiService);
      await flush();

      expect(bilateralApi.GET_bilateralAiJob).toHaveBeenCalledWith('job-old');
      expect(localStorage.getItem(ACTIVE_JOB_STORAGE_KEY)).not.toBeNull();
      expect(resumed.uploadState().status).toBe('still_running');
      resumed.stopPolling();
    });
  });

  // ── The 30-minute ceiling: "still running", never a client-declared failure (APF-R-7, D2) ──

  describe('the 30-minute ceiling', () => {
    beforeEach(async () => {
      // The server keeps answering PROCESSING forever — nothing here ever completes on its own.
      bilateralApi.GET_bilateralAiJob.mockReturnValue(of({ response: job({ status: 'PROCESSING', stage: 'extracting' }) }));
      service.startJob('job-1');
      await flush();
    });

    it('switches from 5 s to 15 s after the first 2 minutes', async () => {
      await advance(ADAPTIVE_SWITCH_MS);
      bilateralApi.GET_bilateralAiJob.mockClear();

      await advance(60_000);
      // At 15 s cadence, 60 s / 15 s = 4 polls.
      expect(bilateralApi.GET_bilateralAiJob).toHaveBeenCalledTimes(4);
    });

    it('never sets a client-declared failure at the ceiling — flips to still_running instead', async () => {
      await advance(CEILING_MS);

      expect(service.uploadState().status).toBe('still_running');
      // Old assertion (record kept for history, APF-DD-6 — reversion challenged):
      // expect(service.uploadState().status).toBe('failed');
      // expect(service.uploadState().errorMessage).toBe('Processing t' + 'imed out. Please try again.');
      expect(service.uploadState().status).not.toBe('failed');
    });

    it('keeps the resume record at and past the ceiling — nothing is dropped', async () => {
      await advance(CEILING_MS + POLL_INTERVAL_CEILING);
      expect(localStorage.getItem(ACTIVE_JOB_STORAGE_KEY)).not.toBeNull();
    });

    it('slows to a 30 s cadence once still_running', async () => {
      await advance(CEILING_MS);
      bilateralApi.GET_bilateralAiJob.mockClear();

      await advance(90_000);
      // At 30 s cadence, 90 s / 30 s = 3 polls.
      expect(bilateralApi.GET_bilateralAiJob).toHaveBeenCalledTimes(3);
    });

    it('keeps polling past the ceiling — the machine never stops on its own past 30 minutes', async () => {
      await advance(CEILING_MS + POLL_INTERVAL_CEILING * 10);
      expect(bilateralApi.GET_bilateralAiJob.mock.calls.length).toBeGreaterThan(1);
    });
  });

  // ── pollJob branches on the HTTP status of a failed poll (APF-R-7, APF-DD-6) ────────────

  describe('a failed poll', () => {
    it('404: stops polling and drops the resume record — the job is gone', async () => {
      bilateralApi.GET_bilateralAiJob.mockReturnValue(of({ response: job({ status: 'PROCESSING', stage: 'extracting' }) }));
      service.startJob('job-1');
      await flush();

      bilateralApi.GET_bilateralAiJob.mockReturnValue(throwError(() => ({ status: 404 })));
      await advance(POLL_INTERVAL_INITIAL);

      expect(localStorage.getItem(ACTIVE_JOB_STORAGE_KEY)).toBeNull();
      const calls = bilateralApi.GET_bilateralAiJob.mock.calls.length;
      await advance(POLL_INTERVAL_INITIAL * 5);
      expect(bilateralApi.GET_bilateralAiJob).toHaveBeenCalledTimes(calls);
    });

    it('404: resets to the upload form with an explanation — never a live-looking job with a dead timer', async () => {
      bilateralApi.GET_bilateralAiJob.mockReturnValue(of({ response: job({ status: 'PROCESSING', stage: 'extracting' }) }));
      service.startJob('job-1');
      await flush();

      bilateralApi.GET_bilateralAiJob.mockReturnValue(throwError(() => ({ status: 404 })));
      await advance(POLL_INTERVAL_INITIAL);

      expect(service.uploadState().status).toBe('idle');
      expect(service.uploadState().jobId).toBeNull();
      expect(service.uploadState().errorMessage).toBeTruthy();
      expect(service.currentJobId()).toBeNull();
      expect(service.currentJob()).toBeNull();
    });

    it('410: stops polling and drops the resume record — same as 404', async () => {
      bilateralApi.GET_bilateralAiJob.mockReturnValue(of({ response: job({ status: 'PROCESSING', stage: 'extracting' }) }));
      service.startJob('job-1');
      await flush();

      bilateralApi.GET_bilateralAiJob.mockReturnValue(throwError(() => ({ status: 410 })));
      await advance(POLL_INTERVAL_INITIAL);

      expect(localStorage.getItem(ACTIVE_JOB_STORAGE_KEY)).toBeNull();
      const calls = bilateralApi.GET_bilateralAiJob.mock.calls.length;
      await advance(POLL_INTERVAL_INITIAL * 5);
      expect(bilateralApi.GET_bilateralAiJob).toHaveBeenCalledTimes(calls);
    });

    it('410: resets to the upload form with an explanation, same as the retry endpoint\'s own 410 branch', async () => {
      bilateralApi.GET_bilateralAiJob.mockReturnValue(of({ response: job({ status: 'PENDING', stage: 'queued' }) }));
      service.startJob('job-1');
      await flush();

      bilateralApi.GET_bilateralAiJob.mockReturnValue(throwError(() => ({ status: 410 })));
      await advance(POLL_INTERVAL_INITIAL);

      expect(service.uploadState().status).toBe('idle');
      expect(service.uploadState().errorMessage).toBeTruthy();
      expect(service.currentJob()).toBeNull();
    });

    it('401: stops polling silently — the session is gone, a retry would only produce more 401s', async () => {
      bilateralApi.GET_bilateralAiJob.mockReturnValue(of({ response: job({ status: 'PROCESSING', stage: 'extracting' }) }));
      service.startJob('job-1');
      await flush();

      bilateralApi.GET_bilateralAiJob.mockReturnValue(throwError(() => ({ status: 401 })));
      await advance(POLL_INTERVAL_INITIAL);

      const calls = bilateralApi.GET_bilateralAiJob.mock.calls.length;
      await advance(POLL_INTERVAL_INITIAL * 5);
      expect(bilateralApi.GET_bilateralAiJob).toHaveBeenCalledTimes(calls);
      // Silent: no failed state, no notice — this is a session problem, not a job outcome.
      expect(service.completionNotice()).toBeNull();
    });

    it('500: keeps polling on the current interval — a network blip is not a terminal signal', async () => {
      bilateralApi.GET_bilateralAiJob.mockReturnValue(of({ response: job({ status: 'PROCESSING', stage: 'extracting' }) }));
      service.startJob('job-1');
      await flush();

      bilateralApi.GET_bilateralAiJob.mockReturnValue(throwError(() => ({ status: 500 })));
      await advance(POLL_INTERVAL_INITIAL);
      const callsAfterFirstError = bilateralApi.GET_bilateralAiJob.mock.calls.length;
      expect(callsAfterFirstError).toBeGreaterThan(0);

      await advance(POLL_INTERVAL_INITIAL * 3);
      expect(bilateralApi.GET_bilateralAiJob.mock.calls.length).toBeGreaterThan(callsAfterFirstError);
      expect(localStorage.getItem(ACTIVE_JOB_STORAGE_KEY)).not.toBeNull();
    });
  });

  // ── Teardown ────────────────────────────────────────────────────────────

  describe('stopPolling', () => {
    it('kills the interval when the service is destroyed', async () => {
      service.startJob('job-1');
      await flush();
      const calls = bilateralApi.GET_bilateralAiJob.mock.calls.length;

      service.ngOnDestroy();
      await advance(POLL_INTERVAL_INITIAL * 10);

      expect(bilateralApi.GET_bilateralAiJob).toHaveBeenCalledTimes(calls);
    });

    it('is safe to call with no job running, and twice in a row', async () => {
      expect(() => service.stopPolling()).not.toThrow();

      service.startJob('job-1');
      await flush();
      service.stopPolling();
      expect(() => service.stopPolling()).not.toThrow();

      const calls = bilateralApi.GET_bilateralAiJob.mock.calls.length;
      await advance(POLL_INTERVAL_INITIAL * 3);
      expect(bilateralApi.GET_bilateralAiJob).toHaveBeenCalledTimes(calls);
    });
  });

  it('clearUploadState wipes the job back to idle', async () => {
    service.startJob('job-1');
    await flush();

    service.clearUploadState();

    expect(service.uploadState()).toEqual({ jobId: null, status: 'idle', uploadProgress: 0 });
    expect(service.currentJobId()).toBeNull();
    expect(service.currentJob()).toBeNull();
  });
});
