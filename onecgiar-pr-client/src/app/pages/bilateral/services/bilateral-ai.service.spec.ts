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
 * stop by itself on COMPLETED / FAILED, give up after 5 minutes, and never outlive the service.
 * A leaked interval keeps hitting the API for the rest of the session, so every exit is pinned
 * here by counting the polls that happen AFTER the machine should have stopped.
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
  const MAX_POLL_DURATION = 300_000;

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
    router = { navigate: jest.fn().mockResolvedValue(true) };
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
      expect(router.navigate).toHaveBeenCalledWith(['/bilateral', 'ALLIANCE', 'drafts']);

      // COMPLETED stops the machine: no poll may happen after it.
      const callsAtCompletion = bilateralApi.GET_bilateralAiJob.mock.calls.length;
      await advance(POLL_INTERVAL * 5);
      expect(bilateralApi.GET_bilateralAiJob).toHaveBeenCalledTimes(callsAtCompletion);
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

    const calls = bilateralApi.GET_bilateralAiJob.mock.calls.length;
    await advance(POLL_INTERVAL * 4);
    expect(bilateralApi.GET_bilateralAiJob).toHaveBeenCalledTimes(calls);
  });

  // ── The 5-minute ceiling ────────────────────────────────────────────────

  describe('MAX_POLL_DURATION', () => {
    beforeEach(async () => {
      // A request that never answers: the job would otherwise stay PENDING forever and the only
      // thing that can end the loop is the elapsed-time guard.
      bilateralApi.GET_bilateralAiJob.mockReturnValue(new Subject());
      service.startJob('job-1');
      await flush();
    });

    it('keeps polling right up to the 5-minute mark', async () => {
      await advance(MAX_POLL_DURATION);

      expect(service.uploadState().status).toBe('pending');
      // 1 immediate poll + one per interval elapsed.
      expect(bilateralApi.GET_bilateralAiJob).toHaveBeenCalledTimes(1 + MAX_POLL_DURATION / POLL_INTERVAL);
    });

    it('gives up once the 5 minutes are exceeded, with a retry message', async () => {
      await advance(MAX_POLL_DURATION + POLL_INTERVAL);

      expect(service.uploadState().status).toBe('failed');
      expect(service.uploadState().errorMessage).toBe('Processing timed out. Please try again.');
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
