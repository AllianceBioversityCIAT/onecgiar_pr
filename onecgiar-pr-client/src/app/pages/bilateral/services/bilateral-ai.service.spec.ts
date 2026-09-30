import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { BilateralAiService } from './bilateral-ai.service';
import { rawListJob } from '../bilateral-ai-job.fixtures';
import { BilateralApiService } from '../../../shared/services/api/bilateral-api.service';
import { ResultsApiService } from '../../../shared/services/api/results-api.service';
import { BilateralContextService } from './bilateral-context.service';
import { BilateralCreationService } from './bilateral-creation.service';
import { PrToastService } from '../../../shared/components/pr-toast/pr-toast.service';

/**
 * `AIQ-T-5` (`design.md` §6.2): the multi-job list service. One poll fetches every active/recent
 * job at once (never one request per job, `AIQ-R-8` A), diffs consecutive polls to raise sticky
 * completion toasts (`AIQ-R-11`), and keeps the adaptive cadence of `APF-R-7` measured from the
 * most recent active job's queue-entry clock.
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
  const HAS_ACTIVE_JOBS_KEY = 'prms.bilateral-ai.has-active-jobs';
  const LEGACY_ACTIVE_JOB_KEY = 'prms.bilateral-ai.active-job';

  const NOW_ISO = '2026-09-15T10:00:00.000Z';
  const NOW_MS = Date.parse(NOW_ISO);

  const summary = (over: Partial<{ lanes_total: number; lanes_busy: number; others_waiting: number }> = {}) => ({
    lanes_total: 2,
    lanes_busy: 0,
    others_waiting: 0,
    ...over,
  });

  const listResponse = (jobs: ReturnType<typeof rawListJob>[] = [], summaryOver = {}) => ({ response: { jobs, summary: summary(summaryOver) } });

  /** Lets the `await toPromise()` inside `pollList` settle; fake timers do not touch microtasks. */
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
        { provide: PrToastService, useValue: toast },
      ],
    });
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW_MS);
    localStorage.clear();

    bilateralApi = {
      GET_bilateralAiJobs: jest.fn().mockReturnValue(of(listResponse([]))),
      GET_bilateralAiJob: jest.fn().mockReturnValue(of({ response: rawListJob() })),
      GET_bilateralAiDrafts: jest.fn().mockReturnValue(of([])),
      GET_bilateralAiDraft: jest.fn().mockReturnValue(of({ response: null })),
      POST_promoteBilateralAiDraft: jest.fn().mockReturnValue(of({ response: {} })),
      DELETE_bilateralAiDraft: jest.fn().mockReturnValue(of({})),
      POST_bilateralAiJobRetry: jest.fn().mockReturnValue(of({ response: { jobId: 'job-1', jobStatus: 'PENDING' } })),
      GET_bilateralAiJobExpectations: jest.fn().mockReturnValue(of({ response: { mix: 'documents', sampleSize: 8, p25Minutes: 3, p75Minutes: 6 } })),
    };
    resultsApi = {
      GET_AllInitiatives: jest.fn().mockReturnValue(of({ response: [] })),
      GET_ClarisaProjects: jest.fn().mockReturnValue(of({ response: [] })),
    };
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

  it('should be created, with an empty job list and no summary yet', () => {
    expect(service).toBeTruthy();
    expect(service.jobs()).toEqual([]);
    expect(service.summary()).toBeNull();
    expect(service.uploadState().status).toBe('idle');
  });

  // ── promoteDraft: lands on the canonical editor URL (unaffected by AIQ-T-5) ──────────────

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

  // ── addSubmittedJob: optimistic insert (`AIQ-R-7` B) ──────────────────────────────────────

  describe('addSubmittedJob', () => {
    it('the new job appears in the drawer (jobs()) at once, before any poll lands', () => {
      service.addSubmittedJob({ jobId: 'job-9', jobStatus: 'PENDING' });

      expect(service.jobs().some(j => j.jobId === 'job-9')).toBe(true);
    });

    it('does not insert a duplicate when the job id is already present', () => {
      service.addSubmittedJob({ jobId: 'job-9', jobStatus: 'PENDING' });
      service.addSubmittedJob({ jobId: 'job-9', jobStatus: 'PENDING' });

      expect(service.jobs().filter(j => j.jobId === 'job-9').length).toBe(1);
    });

    it('is a no-op with no jobId in the response', () => {
      service.addSubmittedJob({ jobStatus: 'PENDING' });
      service.addSubmittedJob(null);
      service.addSubmittedJob(undefined);

      expect(service.jobs()).toEqual([]);
    });

    it('sets the has-active-jobs hint and starts polling', async () => {
      bilateralApi.GET_bilateralAiJobs.mockReturnValue(of(listResponse([rawListJob({ job_id: 'job-9', status: 'PENDING' })])));

      service.addSubmittedJob({ jobId: 'job-9', jobStatus: 'PENDING' });
      await flush();

      expect(localStorage.getItem(HAS_ACTIVE_JOBS_KEY)).not.toBeNull();
      expect(bilateralApi.GET_bilateralAiJobs).toHaveBeenCalledTimes(1);
    });
  });

  // ── openDrawer (`AIQ-R-8` D, `AIQ-R-10` B) ────────────────────────────────────────────────

  describe('openDrawer', () => {
    it('opens the drawer and, given a job id, highlights it', () => {
      service.openDrawer('job-3');

      expect(service.drawerOpen()).toBe(true);
      expect(service.highlightJobId()).toBe('job-3');
    });

    it('marks unseen finished jobs as seen', () => {
      (service as unknown as { unseenFinishedIds: { set: (v: ReadonlySet<string>) => void } }).unseenFinishedIds.set(new Set(['job-1', 'job-2']));

      service.openDrawer();

      expect(service.unseenFinishedIds().size).toBe(0);
    });

    it('starts polling even with zero active jobs, so a drawer left open keeps refreshing', async () => {
      service.openDrawer();
      await flush();

      expect(bilateralApi.GET_bilateralAiJobs).toHaveBeenCalledTimes(1);
    });
  });

  // ── HTTP count: one list request per poll, never one per job (`AIQ-R-8` A) ───────────────

  describe('the list poller', () => {
    it('issues exactly one GET .../ai/jobs per tick for 3 active jobs, and zero GET .../ai/jobs/:id calls', async () => {
      bilateralApi.GET_bilateralAiJobs.mockReturnValue(
        of(
          listResponse([
            rawListJob({ job_id: 'job-1', status: 'PENDING' }),
            rawListJob({ job_id: 'job-2', status: 'PROCESSING' }),
            rawListJob({ job_id: 'job-3', status: 'PENDING' }),
          ]),
        ),
      );

      service.addSubmittedJob({ jobId: 'job-1', jobStatus: 'PENDING' });
      await flush();
      expect(bilateralApi.GET_bilateralAiJobs).toHaveBeenCalledTimes(1);

      await advance(POLL_INTERVAL_INITIAL);
      expect(bilateralApi.GET_bilateralAiJobs).toHaveBeenCalledTimes(2);

      expect(bilateralApi.GET_bilateralAiJob).not.toHaveBeenCalled();
      expect(service.jobs().length).toBe(3);
    });

    it('normalizes the list and the summary from the §4.1 shape (string ids, retrying: 1)', async () => {
      bilateralApi.GET_bilateralAiJobs.mockReturnValue(of(listResponse([rawListJob({ job_id: 'job-1', status: 'PROCESSING' })], { lanes_busy: 1, others_waiting: 3 })));

      service.addSubmittedJob({ jobId: 'job-1' });
      await flush();

      const job = service.jobs()[0];
      expect(job.jobId).toBe('job-1');
      expect(job.retrying).toBe(true);
      expect(job.queueEntryDate).toBeInstanceOf(Date);
      expect(service.summary()).toEqual({ lanesTotal: 2, lanesBusy: 1, othersWaiting: 3 });
    });

    it('stops when idle (no active jobs) and the drawer is closed', async () => {
      bilateralApi.GET_bilateralAiJobs.mockReturnValue(of(listResponse([rawListJob({ job_id: 'job-1', status: 'PENDING' })])));
      service.addSubmittedJob({ jobId: 'job-1' });
      await flush();
      expect(bilateralApi.GET_bilateralAiJobs).toHaveBeenCalledTimes(1);

      bilateralApi.GET_bilateralAiJobs.mockReturnValue(of(listResponse([rawListJob({ job_id: 'job-1', status: 'COMPLETED', result_count: '1' })])));
      await advance(POLL_INTERVAL_INITIAL);
      const callsAtIdle = bilateralApi.GET_bilateralAiJobs.mock.calls.length;

      await advance(POLL_INTERVAL_INITIAL * 5);
      expect(bilateralApi.GET_bilateralAiJobs).toHaveBeenCalledTimes(callsAtIdle);
      expect(localStorage.getItem(HAS_ACTIVE_JOBS_KEY)).toBeNull();
    });

    it('restarts on the next submission after going idle', async () => {
      bilateralApi.GET_bilateralAiJobs.mockReturnValue(of(listResponse([rawListJob({ job_id: 'job-1', status: 'COMPLETED', result_count: '1' })])));
      service.addSubmittedJob({ jobId: 'job-1' });
      await flush();
      // First poll already sees it COMPLETED (idle) — stops.
      const callsAtIdle = bilateralApi.GET_bilateralAiJobs.mock.calls.length;
      await advance(POLL_INTERVAL_INITIAL * 3);
      expect(bilateralApi.GET_bilateralAiJobs).toHaveBeenCalledTimes(callsAtIdle);

      service.addSubmittedJob({ jobId: 'job-2' });
      await flush();
      expect(bilateralApi.GET_bilateralAiJobs.mock.calls.length).toBeGreaterThan(callsAtIdle);
    });

    it('does not restart the interval merely because a poll landed with the same cadence', async () => {
      bilateralApi.GET_bilateralAiJobs.mockReturnValue(of(listResponse([rawListJob({ job_id: 'job-1', status: 'PENDING' })])));
      service.addSubmittedJob({ jobId: 'job-1' });
      await flush();

      const setIntervalSpy = jest.spyOn(globalThis, 'setInterval');
      await advance(POLL_INTERVAL_INITIAL * 2);
      expect(setIntervalSpy).not.toHaveBeenCalled();
    });

    // Reviewer issue (AIQ-T-5 attempt 2): `ensurePolling()` used to return early when a timer
    // already existed, so submitting a job while another was already running left the cadence at
    // 15 s/30 s and delayed the first poll of the new job by up to a whole interval — contradicting
    // `addSubmittedJob`'s own doc comment ("kicks off immediately", `AIQ-R-8` A "measured from the
    // most recent active job").
    it('after addSubmittedJob with an existing (slowed) timer, a list request fires immediately and the next tick uses the initial interval', async () => {
      bilateralApi.GET_bilateralAiJobs.mockReturnValue(of(listResponse([rawListJob({ job_id: 'job-1', status: 'PROCESSING', queue_entry_date: NOW_ISO })])));
      service.addSubmittedJob({ jobId: 'job-1' });
      await flush();
      await advance(CEILING_MS); // cadence is now 30 s

      bilateralApi.GET_bilateralAiJobs.mockClear();
      service.addSubmittedJob({ jobId: 'job-2', jobStatus: 'PENDING' });
      await flush();
      expect(bilateralApi.GET_bilateralAiJobs).toHaveBeenCalledTimes(1); // fired immediately

      bilateralApi.GET_bilateralAiJobs.mockClear();
      await advance(POLL_INTERVAL_INITIAL);
      expect(bilateralApi.GET_bilateralAiJobs).toHaveBeenCalledTimes(1); // next tick is 5 s, not 30 s
    });
  });

  // ── Cadence buckets, measured from the most recent active job's queueEntryDate (`APF-R-7`) ─

  describe('cadence buckets', () => {
    beforeEach(async () => {
      bilateralApi.GET_bilateralAiJobs.mockReturnValue(of(listResponse([rawListJob({ job_id: 'job-1', status: 'PROCESSING', queue_entry_date: NOW_ISO })])));
      service.addSubmittedJob({ jobId: 'job-1' });
      await flush();
    });

    it('polls every 5 s inside the first 2 minutes', async () => {
      bilateralApi.GET_bilateralAiJobs.mockClear();
      await advance(POLL_INTERVAL_INITIAL * 2);
      expect(bilateralApi.GET_bilateralAiJobs).toHaveBeenCalledTimes(2);
    });

    it('switches to 15 s after the first 2 minutes', async () => {
      await advance(ADAPTIVE_SWITCH_MS);
      bilateralApi.GET_bilateralAiJobs.mockClear();

      await advance(60_000);
      // At 15 s cadence, 60 s / 15 s = 4 polls.
      expect(bilateralApi.GET_bilateralAiJobs).toHaveBeenCalledTimes(4);
    });

    it('slows to 30 s past the 30-minute ceiling', async () => {
      await advance(CEILING_MS);
      bilateralApi.GET_bilateralAiJobs.mockClear();

      await advance(90_000);
      // At 30 s cadence, 90 s / 30 s = 3 polls.
      expect(bilateralApi.GET_bilateralAiJobs).toHaveBeenCalledTimes(3);
    });

    it('is measured from the freshest active job, not the oldest, when several are active', async () => {
      // job-1 is old (past the 2-minute switch); job-2 just entered — the freshest wins, so the
      // cadence should still be 5 s, not 15 s.
      const oldEntry = new Date(NOW_MS - ADAPTIVE_SWITCH_MS - 1_000).toISOString();
      bilateralApi.GET_bilateralAiJobs.mockReturnValue(
        of(
          listResponse([
            rawListJob({ job_id: 'job-1', status: 'PROCESSING', queue_entry_date: oldEntry }),
            rawListJob({ job_id: 'job-2', status: 'PENDING', queue_entry_date: NOW_ISO }),
          ]),
        ),
      );
      await advance(POLL_INTERVAL_INITIAL);
      bilateralApi.GET_bilateralAiJobs.mockClear();

      await advance(POLL_INTERVAL_INITIAL * 2);
      expect(bilateralApi.GET_bilateralAiJobs).toHaveBeenCalledTimes(2);
    });
  });

  // ── 401 handling (`AIQ-R-5`, design §7 — keeps `handlePollError`'s stop-on-401) ───────────

  describe('a failed poll', () => {
    it('401: stops polling silently — the session is gone, a retry would only produce more 401s', async () => {
      bilateralApi.GET_bilateralAiJobs.mockReturnValue(of(listResponse([rawListJob({ job_id: 'job-1', status: 'PROCESSING' })])));
      service.addSubmittedJob({ jobId: 'job-1' });
      await flush();

      bilateralApi.GET_bilateralAiJobs.mockReturnValue(throwError(() => ({ status: 401 })));
      await advance(POLL_INTERVAL_INITIAL);

      const calls = bilateralApi.GET_bilateralAiJobs.mock.calls.length;
      await advance(POLL_INTERVAL_INITIAL * 5);
      expect(bilateralApi.GET_bilateralAiJobs).toHaveBeenCalledTimes(calls);
    });

    it('500: keeps polling on the current interval — a network blip is not proof the list is gone', async () => {
      bilateralApi.GET_bilateralAiJobs.mockReturnValue(of(listResponse([rawListJob({ job_id: 'job-1', status: 'PROCESSING' })])));
      service.addSubmittedJob({ jobId: 'job-1' });
      await flush();

      bilateralApi.GET_bilateralAiJobs.mockReturnValue(throwError(() => ({ status: 500 })));
      await advance(POLL_INTERVAL_INITIAL);
      const callsAfterFirstError = bilateralApi.GET_bilateralAiJobs.mock.calls.length;
      expect(callsAfterFirstError).toBeGreaterThan(0);

      bilateralApi.GET_bilateralAiJobs.mockReturnValue(of(listResponse([rawListJob({ job_id: 'job-1', status: 'PROCESSING' })])));
      await advance(POLL_INTERVAL_INITIAL * 3);
      expect(bilateralApi.GET_bilateralAiJobs.mock.calls.length).toBeGreaterThan(callsAfterFirstError);
    });
  });

  // ── Terminal-transition diff → toasts (`AIQ-R-11`) ────────────────────────────────────────

  describe('terminal diff toasts', () => {
    it('never toasts on the very first poll, even if it already shows finished jobs', async () => {
      bilateralApi.GET_bilateralAiJobs.mockReturnValue(of(listResponse([rawListJob({ job_id: 'job-1', status: 'COMPLETED', result_count: '2' })])));
      service.openDrawer();
      await flush();

      expect(toast.add).not.toHaveBeenCalled();
    });

    it('one sticky toast, with an action, for a single job that turns COMPLETED between polls', async () => {
      bilateralApi.GET_bilateralAiJobs.mockReturnValue(of(listResponse([rawListJob({ job_id: 'job-1', status: 'PROCESSING', project_name: 'Alpha' })])));
      service.addSubmittedJob({ jobId: 'job-1' });
      await flush();

      bilateralApi.GET_bilateralAiJobs.mockReturnValue(
        of(listResponse([rawListJob({ job_id: 'job-1', status: 'COMPLETED', project_name: 'Alpha', result_count: '4' })])),
      );
      await advance(POLL_INTERVAL_INITIAL);

      expect(toast.add).toHaveBeenCalledTimes(1);
      const call = toast.add.mock.calls[0][0];
      expect(call.key).toBe('globalUserNotification');
      expect(call.sticky).toBe(true);
      expect(call.action).toBeDefined();
      expect(typeof call.action.run).toBe('function');
      expect(call.summary).toContain('Alpha');
    });

    // Reviewer issue (AIQ-T-5 attempt 2): `addSubmittedJob` inserted into `jobs()` but not into
    // `previousJobsById`, so a job that turned terminal on the very FIRST poll after submission —
    // fast failures, or ~30 s text jobs under a 30 s cadence — found `prev === undefined` and
    // silently dropped both the toast and the `unseenFinishedIds` entry. Exactly `AIQ-R-7` A: P-1
    // running, submit P-2.
    it('toasts a job that is already FAILED on the very first (immediate) poll after submission, even while another job has been running past the ceiling', async () => {
      bilateralApi.GET_bilateralAiJobs.mockReturnValue(of(listResponse([rawListJob({ job_id: 'job-1', status: 'PROCESSING', queue_entry_date: NOW_ISO })])));
      service.addSubmittedJob({ jobId: 'job-1' });
      await flush();
      // job-1 has been running long enough that the cadence has already slowed down.
      await advance(CEILING_MS);

      // job-2 fails so fast that even the immediate poll `addSubmittedJob` triggers already
      // reports it FAILED — the server response already includes it, so there is no later poll
      // for the carried-forward placeholder to be reconciled on; only a `previousJobsById` seed
      // made at submission time can prove the transition was FROM active TO terminal.
      bilateralApi.GET_bilateralAiJobs.mockReturnValue(
        of(
          listResponse([
            rawListJob({ job_id: 'job-1', status: 'PROCESSING', queue_entry_date: NOW_ISO }),
            rawListJob({ job_id: 'job-2', status: 'FAILED', error_code: 'TIMED_OUT' }),
          ]),
        ),
      );
      service.addSubmittedJob({ jobId: 'job-2', jobStatus: 'PENDING' });
      await flush();

      expect(toast.add).toHaveBeenCalledTimes(1);
      expect(service.unseenFinishedIds().has('job-2')).toBe(true);
    });

    it('carries a just-submitted placeholder forward when the very next poll has not caught up with it yet', async () => {
      bilateralApi.GET_bilateralAiJobs.mockReturnValue(of(listResponse([rawListJob({ job_id: 'job-1', status: 'PROCESSING' })])));
      service.addSubmittedJob({ jobId: 'job-1' });
      await flush();

      // The server response for job-2's own immediate poll has not caught up yet.
      service.addSubmittedJob({ jobId: 'job-2', jobStatus: 'PENDING' });
      await flush();

      expect(service.jobs().some(j => j.jobId === 'job-2')).toBe(true);
    });

    it('one toast per job when exactly 2 finish in the same poll', async () => {
      bilateralApi.GET_bilateralAiJobs.mockReturnValue(
        of(
          listResponse([
            rawListJob({ job_id: 'job-1', status: 'PROCESSING' }),
            rawListJob({ job_id: 'job-2', status: 'PROCESSING' }),
          ]),
        ),
      );
      service.addSubmittedJob({ jobId: 'job-1' });
      await flush();

      bilateralApi.GET_bilateralAiJobs.mockReturnValue(
        of(
          listResponse([
            rawListJob({ job_id: 'job-1', status: 'COMPLETED', result_count: '1' }),
            rawListJob({ job_id: 'job-2', status: 'FAILED', error_code: 'TIMED_OUT' }),
          ]),
        ),
      );
      await advance(POLL_INTERVAL_INITIAL);

      expect(toast.add).toHaveBeenCalledTimes(2);
    });

    it('a single grouped toast when more than 2 jobs finish in the same poll', async () => {
      bilateralApi.GET_bilateralAiJobs.mockReturnValue(
        of(
          listResponse([
            rawListJob({ job_id: 'job-1', status: 'PROCESSING' }),
            rawListJob({ job_id: 'job-2', status: 'PROCESSING' }),
            rawListJob({ job_id: 'job-3', status: 'PROCESSING' }),
          ]),
        ),
      );
      service.addSubmittedJob({ jobId: 'job-1' });
      await flush();

      bilateralApi.GET_bilateralAiJobs.mockReturnValue(
        of(
          listResponse([
            rawListJob({ job_id: 'job-1', status: 'COMPLETED', result_count: '1' }),
            rawListJob({ job_id: 'job-2', status: 'COMPLETED', result_count: '2' }),
            rawListJob({ job_id: 'job-3', status: 'FAILED', error_code: 'TIMED_OUT' }),
          ]),
        ),
      );
      await advance(POLL_INTERVAL_INITIAL);

      expect(toast.add).toHaveBeenCalledTimes(1);
      const call = toast.add.mock.calls[0][0];
      expect(call.summary).toContain('3 jobs finished');
      expect(call.sticky).toBe(true);
    });

    it('does not re-toast a job that was already terminal on a previous poll', async () => {
      bilateralApi.GET_bilateralAiJobs.mockReturnValue(of(listResponse([rawListJob({ job_id: 'job-1', status: 'PROCESSING' })])));
      service.addSubmittedJob({ jobId: 'job-1' });
      await flush();

      bilateralApi.GET_bilateralAiJobs.mockReturnValue(of(listResponse([rawListJob({ job_id: 'job-1', status: 'COMPLETED', result_count: '1' })])));
      await advance(POLL_INTERVAL_INITIAL);
      expect(toast.add).toHaveBeenCalledTimes(1);

      // Falsifier target: removing the diff guard makes every subsequent poll re-toast the same
      // already-finished job. Re-open the drawer (which keeps polling alive even though idle) and
      // advance once more — the count must stay at 1.
      service.openDrawer();
      await advance(POLL_INTERVAL_INITIAL);
      expect(toast.add).toHaveBeenCalledTimes(1);
    });

    it('adds newly-terminal jobs to unseenFinishedIds', async () => {
      bilateralApi.GET_bilateralAiJobs.mockReturnValue(of(listResponse([rawListJob({ job_id: 'job-1', status: 'PROCESSING' })])));
      service.addSubmittedJob({ jobId: 'job-1' });
      await flush();

      bilateralApi.GET_bilateralAiJobs.mockReturnValue(of(listResponse([rawListJob({ job_id: 'job-1', status: 'COMPLETED', result_count: '1' })])));
      await advance(POLL_INTERVAL_INITIAL);

      expect(service.unseenFinishedIds().has('job-1')).toBe(true);
    });
  });

  // ── Legacy single-job key migration (`AIQ-R-8` C) ─────────────────────────────────────────

  describe('the legacy prms.bilateral-ai.active-job key', () => {
    it('is read once on construction, its job id kept for the drawer highlight, and the key removed', async () => {
      localStorage.setItem(LEGACY_ACTIVE_JOB_KEY, JSON.stringify({ jobId: 'job-legacy', centerAcronym: 'ALLIANCE', startedAt: NOW_MS }));
      bilateralApi.GET_bilateralAiJobs.mockReturnValue(of(listResponse([rawListJob({ job_id: 'job-legacy', status: 'PROCESSING' })])));

      TestBed.resetTestingModule();
      configureTestBed();
      const resumed = TestBed.inject(BilateralAiService);
      await flush();

      expect(resumed.highlightJobId()).toBe('job-legacy');
      expect(localStorage.getItem(LEGACY_ACTIVE_JOB_KEY)).toBeNull();
      expect(bilateralApi.GET_bilateralAiJobs).toHaveBeenCalledTimes(1);
      resumed.stopPolling();
    });

    it('does not start polling when neither the legacy key nor the hint key is present', () => {
      expect(bilateralApi.GET_bilateralAiJobs).not.toHaveBeenCalled();
    });

    it('is tolerant of a malformed legacy record — never throws during construction', () => {
      localStorage.setItem(LEGACY_ACTIVE_JOB_KEY, '{not json');

      expect(() => {
        TestBed.resetTestingModule();
        configureTestBed();
        TestBed.inject(BilateralAiService);
      }).not.toThrow();
      expect(localStorage.getItem(LEGACY_ACTIVE_JOB_KEY)).toBeNull();
    });
  });

  // ── has-active-jobs hint (`AIQ-R-8` C) ─────────────────────────────────────────────────────

  describe('the prms.bilateral-ai.has-active-jobs hint', () => {
    it('resumes polling on construction when the hint key is already set (reload with active jobs)', async () => {
      localStorage.setItem(HAS_ACTIVE_JOBS_KEY, '1');
      bilateralApi.GET_bilateralAiJobs.mockReturnValue(of(listResponse([rawListJob({ job_id: 'job-1', status: 'PROCESSING' })])));

      TestBed.resetTestingModule();
      configureTestBed();
      const resumed = TestBed.inject(BilateralAiService);
      await flush();

      expect(bilateralApi.GET_bilateralAiJobs).toHaveBeenCalledTimes(1);
      resumed.stopPolling();
    });

    it('is cleared once a poll finds no active job', async () => {
      localStorage.setItem(HAS_ACTIVE_JOBS_KEY, '1');
      bilateralApi.GET_bilateralAiJobs.mockReturnValue(of(listResponse([rawListJob({ job_id: 'job-1', status: 'COMPLETED', result_count: '1' })])));

      TestBed.resetTestingModule();
      configureTestBed();
      const resumed = TestBed.inject(BilateralAiService);
      await flush();

      expect(localStorage.getItem(HAS_ACTIVE_JOBS_KEY)).toBeNull();
      resumed.stopPolling();
    });
  });

  // ── retryJob: APF-R-5 / APF-R-9 (kept, unaffected by the list refactor) ──────────────────

  describe('retryJob', () => {
    it('calls the retry endpoint and marks the upload form pending', async () => {
      bilateralApi.GET_bilateralAiJobs.mockReturnValue(of(listResponse([rawListJob({ job_id: 'job-7', status: 'PENDING' })])));

      service.retryJob('job-7');
      expect(bilateralApi.POST_bilateralAiJobRetry).toHaveBeenCalledWith('job-7');
      await flush();

      expect(service.uploadState()).toEqual({ jobId: 'job-7', status: 'pending', uploadProgress: 100 });
      expect(localStorage.getItem(HAS_ACTIVE_JOBS_KEY)).not.toBeNull();
    });

    it('on 410 (sources gone), resets to the upload form with an explanation', async () => {
      bilateralApi.POST_bilateralAiJobRetry.mockReturnValue(throwError(() => ({ status: 410 })));

      service.retryJob('job-7');
      await flush();

      expect(service.uploadState().status).toBe('idle');
      expect(service.uploadState().jobId).toBeNull();
      expect(service.uploadState().errorMessage).toBeTruthy();
    });

    it('on any other error, surfaces a failed state', async () => {
      bilateralApi.POST_bilateralAiJobRetry.mockReturnValue(throwError(() => ({ status: 409 })));

      service.retryJob('job-7');
      await flush();

      expect(service.uploadState().status).toBe('failed');
    });
  });

  // ── expectations: cached per mix for the session (kept, unaffected) ──────────────────────

  describe('expectations', () => {
    it('calls the API once per mix even when requested repeatedly', () => {
      service.expectations('documents').subscribe();
      service.expectations('documents').subscribe();
      service.expectations('documents').subscribe();

      expect(bilateralApi.GET_bilateralAiJobExpectations).toHaveBeenCalledTimes(1);
      expect(bilateralApi.GET_bilateralAiJobExpectations).toHaveBeenCalledWith('documents');
    });

    it('unwraps the response envelope', done => {
      service.expectations('documents').subscribe(result => {
        expect(result).toEqual({ mix: 'documents', sampleSize: 8, p25Minutes: 3, p75Minutes: 6 });
        done();
      });
    });
  });

  // ── clearUploadState: narrowed to the upload form (`AIQ-DD-11`) ──────────────────────────

  it('clearUploadState wipes the upload form back to idle', () => {
    service.uploadState.set({ jobId: 'job-1', status: 'uploading', uploadProgress: 40 });

    service.clearUploadState();

    expect(service.uploadState()).toEqual({ jobId: null, status: 'idle', uploadProgress: 0 });
  });

  // ── Teardown ────────────────────────────────────────────────────────────

  describe('stopPolling', () => {
    it('kills the interval when the service is destroyed', async () => {
      bilateralApi.GET_bilateralAiJobs.mockReturnValue(of(listResponse([rawListJob({ job_id: 'job-1', status: 'PROCESSING' })])));
      service.addSubmittedJob({ jobId: 'job-1' });
      await flush();
      const calls = bilateralApi.GET_bilateralAiJobs.mock.calls.length;

      service.ngOnDestroy();
      await advance(POLL_INTERVAL_INITIAL * 10);

      expect(bilateralApi.GET_bilateralAiJobs).toHaveBeenCalledTimes(calls);
    });

    it('is safe to call with nothing running, and twice in a row', () => {
      expect(() => service.stopPolling()).not.toThrow();
      service.stopPolling();
      expect(() => service.stopPolling()).not.toThrow();
    });
  });
});
