import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router } from '@angular/router';
import { of, Subject } from 'rxjs';

import { BilateralAiService } from './bilateral-ai.service';
import { BilateralAiJob } from './bilateral-ai.interfaces';
import { BilateralApiService } from '../../../shared/services/api/bilateral-api.service';
import { ResultsApiService } from '../../../shared/services/api/results-api.service';
import { BilateralContextService } from './bilateral-context.service';
import { BilateralCreationService } from './bilateral-creation.service';
import { PrToastService } from '../../../shared/components/pr-toast/pr-toast.service';

/**
 * The AI-upload job is the only bilateral piece with a real state machine: a 5 s poll that has to
 * stop by itself on COMPLETED / FAILED, give up after 30 minutes, and never outlive the service.
 * A leaked interval keeps hitting the API for the rest of the session, so every exit is pinned
 * here by counting the polls that happen AFTER the machine should have stopped.
 *
 * Every terminal state ends in `completionNotice` — the app-wide dialog — and NEVER in a
 * navigation or a toast (2026-09-07): the redirect yanked people out of their work and the toast
 * went unnoticed. The job also survives a reload through localStorage.
 */
describe('BilateralAiService', () => {
  let service: BilateralAiService;
  let bilateralApi: any;
  let resultsApi: any;
  let router: any;
  let ctx: { centerInstitutionId: any; centerAcronym: any };
  let creation: any;
  let toast: any;

  const POLL_INTERVAL = 5000;
  const MAX_POLL_DURATION = 1_800_000;
  const ACTIVE_JOB_STORAGE_KEY = 'prms.bilateral-ai.active-job';

  const job = (over: Partial<BilateralAiJob> = {}): BilateralAiJob =>
    ({ job_id: 'job-1', status: 'PENDING', result_count: 0, error_message: null, ...over }) as BilateralAiJob;

  /** Lets the `await toPromise()` inside pollJob settle; fake timers do not touch microtasks. */
  const flush = async () => {
    for (let i = 0; i < 10; i++) await Promise.resolve();
  };

  /** Advance the fake clock and let every poll that fired resolve. */
  const advance = async (ms: number) => {
    jest.advanceTimersByTime(ms);
    await flush();
  };

  beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();

    bilateralApi = {
      GET_bilateralAiJob: jest.fn().mockReturnValue(of({ response: job() })),
      GET_bilateralAiDrafts: jest.fn().mockReturnValue(of([])),
      GET_bilateralAiDraft: jest.fn().mockReturnValue(of({ response: null })),
      POST_promoteBilateralAiDraft: jest.fn().mockReturnValue(of({ response: {} })),
      DELETE_bilateralAiDraft: jest.fn().mockReturnValue(of({}))
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

  // ── startJob: the machine boots and polls straight away ─────────────────

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

    it('keeps polling every 5 s while the job is PENDING', async () => {
      service.startJob('job-1');
      await flush();

      await advance(POLL_INTERVAL);
      expect(bilateralApi.GET_bilateralAiJob).toHaveBeenCalledTimes(2);

      await advance(POLL_INTERVAL * 2);
      expect(bilateralApi.GET_bilateralAiJob).toHaveBeenCalledTimes(4);

      expect(service.currentJob()?.status).toBe('PENDING');
      expect(service.uploadState().status).toBe('pending');
    });

    it('moves to processing and then completes, without restarting the clock', async () => {
      bilateralApi.GET_bilateralAiJob.mockReturnValue(of({ response: job({ status: 'PROCESSING' }) }));
      service.startJob('job-1');
      await flush();
      expect(service.uploadState().status).toBe('processing');

      bilateralApi.GET_bilateralAiJob.mockReturnValue(of({ response: job({ status: 'COMPLETED', result_count: 3 }) }));
      await advance(POLL_INTERVAL);

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
      await advance(POLL_INTERVAL * 5);
      expect(bilateralApi.GET_bilateralAiJob).toHaveBeenCalledTimes(callsAtCompletion);
    });

    // 2026-09-04: the forced redirect yanked people out of their work. 2026-09-07: the toast that
    // replaced it went unnoticed ("no feedback at all"). Completion now NEVER navigates and NEVER
    // toasts — on the create wizard or anywhere else — it raises the dialog notice and reloads
    // the drafts, and the server mails the uploader a link as the durable half.
    it('never redirects nor toasts on completion — the outcome is the dialog notice', async () => {
      bilateralApi.GET_bilateralAiJob.mockReturnValue(of({ response: job({ status: 'COMPLETED', result_count: 2 }) }));
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
      bilateralApi.GET_bilateralAiJob.mockReturnValue(of({ response: job({ status: 'PROCESSING' }) }));
      service.startJob('job-1');
      await flush();

      ctx.centerAcronym.set('CIP');
      bilateralApi.GET_bilateralAiJob.mockReturnValue(of({ response: job({ status: 'COMPLETED', result_count: 1 }) }));
      await advance(POLL_INTERVAL);

      expect(service.completionNotice()?.centerAcronym).toBe('ALLIANCE');
    });

    it('openDraftsFromNotice navigates to that centre\'s Drafts list and clears the notice', async () => {
      bilateralApi.GET_bilateralAiJob.mockReturnValue(of({ response: job({ status: 'COMPLETED', result_count: 2 }) }));
      service.startJob('job-1');
      await flush();

      service.openDraftsFromNotice();

      expect(router.navigate).toHaveBeenCalledWith(['/bilateral', 'ALLIANCE', 'drafts']);
      expect(service.completionNotice()).toBeNull();
    });

    it('dismissCompletionNotice clears the notice without navigating', async () => {
      bilateralApi.GET_bilateralAiJob.mockReturnValue(of({ response: job({ status: 'COMPLETED', result_count: 2 }) }));
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
      await advance(POLL_INTERVAL);

      // One interval alive, and it polls the NEW job.
      expect(bilateralApi.GET_bilateralAiJob).toHaveBeenCalledTimes(1);
      expect(bilateralApi.GET_bilateralAiJob).toHaveBeenCalledWith('job-2');
    });
  });

  // ── COMPLETED with nothing to show ──────────────────────────────────────

  describe('a completed job that produced no candidates', () => {
    beforeEach(async () => {
      bilateralApi.GET_bilateralAiJob.mockReturnValue(of({ response: job({ status: 'COMPLETED', result_count: 0 }) }));
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
      await advance(POLL_INTERVAL * 4);
      expect(bilateralApi.GET_bilateralAiJob).toHaveBeenCalledTimes(calls);
    });
  });

  it('surfaces the server message and stops polling when the job FAILS', async () => {
    bilateralApi.GET_bilateralAiJob.mockReturnValue(of({ response: job({ status: 'FAILED', error_message: 'Bad document' }) }));
    service.startJob('job-1');
    await flush();

    expect(service.uploadState().status).toBe('failed');
    expect(service.uploadState().errorMessage).toBe('Bad document');
    expect(service.completionNotice()).toEqual(expect.objectContaining({ status: 'failed', errorMessage: 'Bad document' }));

    const calls = bilateralApi.GET_bilateralAiJob.mock.calls.length;
    await advance(POLL_INTERVAL * 4);
    expect(bilateralApi.GET_bilateralAiJob).toHaveBeenCalledTimes(calls);
  });

  // ── Surviving a reload ──────────────────────────────────────────────────

  describe('the active job in localStorage', () => {
    it('is written when a job starts and removed when it ends', async () => {
      bilateralApi.GET_bilateralAiJob.mockReturnValue(of({ response: job({ status: 'PROCESSING' }) }));
      service.startJob('job-1');
      await flush();

      const stored = JSON.parse(localStorage.getItem(ACTIVE_JOB_STORAGE_KEY) ?? 'null');
      expect(stored).toEqual(expect.objectContaining({ jobId: 'job-1', centerAcronym: 'ALLIANCE' }));
      expect(typeof stored.startedAt).toBe('number');

      bilateralApi.GET_bilateralAiJob.mockReturnValue(of({ response: job({ status: 'COMPLETED', result_count: 1 }) }));
      await advance(POLL_INTERVAL);
      expect(localStorage.getItem(ACTIVE_JOB_STORAGE_KEY)).toBeNull();
    });

    // A reload used to lose the job for good: polling lived in memory only, so the user never
    // heard the outcome unless they went to Drafts by themselves.
    it('is picked up by a fresh service instance, which polls it to its outcome', async () => {
      localStorage.setItem(
        ACTIVE_JOB_STORAGE_KEY,
        JSON.stringify({ jobId: 'job-9', centerAcronym: 'Bioversity (Alliance)', startedAt: Date.now() - 60_000 })
      );
      bilateralApi.GET_bilateralAiJob.mockReturnValue(of({ response: job({ job_id: 'job-9', status: 'COMPLETED', result_count: 4 }) }));

      TestBed.resetTestingModule();
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
      const resumed = TestBed.inject(BilateralAiService);
      await flush();

      expect(bilateralApi.GET_bilateralAiJob).toHaveBeenCalledWith('job-9');
      expect(resumed.completionNotice()).toEqual(
        expect.objectContaining({ jobId: 'job-9', centerAcronym: 'Bioversity (Alliance)', status: 'completed', resultCount: 4 })
      );
      expect(router.navigate).not.toHaveBeenCalled();
      resumed.stopPolling();
    });

    it('is dropped, not resumed, once it is older than the polling ceiling', async () => {
      localStorage.setItem(
        ACTIVE_JOB_STORAGE_KEY,
        JSON.stringify({ jobId: 'job-old', centerAcronym: 'CIP', startedAt: Date.now() - MAX_POLL_DURATION - 1 })
      );
      bilateralApi.GET_bilateralAiJob.mockClear();

      TestBed.resetTestingModule();
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
      const resumed = TestBed.inject(BilateralAiService);
      await flush();

      expect(bilateralApi.GET_bilateralAiJob).not.toHaveBeenCalled();
      expect(localStorage.getItem(ACTIVE_JOB_STORAGE_KEY)).toBeNull();
      expect(resumed.uploadState().status).toBe('idle');
    });
  });

  // ── The 30-minute ceiling ───────────────────────────────────────────────

  describe('MAX_POLL_DURATION', () => {
    beforeEach(async () => {
      // A request that never answers: the job would otherwise stay PENDING forever and the only
      // thing that can end the loop is the elapsed-time guard.
      bilateralApi.GET_bilateralAiJob.mockReturnValue(new Subject());
      service.startJob('job-1');
      await flush();
    });

    it('keeps polling right up to the 30-minute mark', async () => {
      await advance(MAX_POLL_DURATION);

      expect(service.uploadState().status).toBe('pending');
      // 1 immediate poll + one per interval elapsed.
      expect(bilateralApi.GET_bilateralAiJob).toHaveBeenCalledTimes(1 + MAX_POLL_DURATION / POLL_INTERVAL);
    });

    it('gives up once the 30 minutes are exceeded, with a retry message — and says so in the notice', async () => {
      await advance(MAX_POLL_DURATION + POLL_INTERVAL);

      expect(service.uploadState().status).toBe('failed');
      expect(service.uploadState().errorMessage).toBe('Processing timed out. Please try again.');
      expect(service.completionNotice()).toEqual(
        expect.objectContaining({ status: 'failed', errorMessage: 'Processing timed out. Please try again.' })
      );
      expect(localStorage.getItem(ACTIVE_JOB_STORAGE_KEY)).toBeNull();
    });

    it('stops the interval when it times out — no request may outlive the ceiling', async () => {
      await advance(MAX_POLL_DURATION + POLL_INTERVAL);
      const callsAtTimeout = bilateralApi.GET_bilateralAiJob.mock.calls.length;

      await advance(POLL_INTERVAL * 10);
      expect(bilateralApi.GET_bilateralAiJob).toHaveBeenCalledTimes(callsAtTimeout);
    });
  });

  // ── Teardown ────────────────────────────────────────────────────────────

  describe('stopPolling', () => {
    it('kills the interval when the service is destroyed', async () => {
      service.startJob('job-1');
      await flush();
      const calls = bilateralApi.GET_bilateralAiJob.mock.calls.length;

      service.ngOnDestroy();
      await advance(POLL_INTERVAL * 10);

      expect(bilateralApi.GET_bilateralAiJob).toHaveBeenCalledTimes(calls);
    });

    it('is safe to call with no job running, and twice in a row', async () => {
      expect(() => service.stopPolling()).not.toThrow();

      service.startJob('job-1');
      await flush();
      service.stopPolling();
      expect(() => service.stopPolling()).not.toThrow();

      const calls = bilateralApi.GET_bilateralAiJob.mock.calls.length;
      await advance(POLL_INTERVAL * 3);
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
