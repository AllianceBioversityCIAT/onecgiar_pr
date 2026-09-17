import { TestBed, fakeAsync, tick, discardPeriodicTasks } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import {
  BilateralQualityAssessmentUiService,
  BilateralQualityAssessmentView,
} from './bilateral-quality-assessment-ui.service';

// 🛑 `src/environments/environment.ts` is gitignored and written per environment by CI, so a spec
// that reaches it dies with "Cannot find module" on a fresh worktree. The API service reads the
// base URL from it, so stub it here rather than letting the real file decide the asserted URLs.
jest.mock('../../../../environments/environment', () => ({
  environment: { production: false, apiBaseUrl: 'http://api.test/' },
}));

const BASE = 'http://api.test/api/bilateral/center';
const postUrl = (id: number) => `${BASE}/quality-assessment/${id}`;
const latestUrl = (id: number) => `${BASE}/quality-assessment/${id}/latest`;
const submitUrl = (id: number) => `${BASE}/submit-for-review/${id}`;

function view(overrides: Partial<BilateralQualityAssessmentView> = {}): BilateralQualityAssessmentView {
  return {
    id: 9,
    result_id: 42,
    status: 'completed',
    is_current: true,
    ai_status: 'completed',
    degraded_reason: null,
    unavailable_reason: null,
    overall: { verdict: 'green', score: 88, summary: 'Looks good.' },
    sections: {},
    evidence: [],
    ...overrides,
  };
}

describe('BilateralQualityAssessmentUiService', () => {
  let service: BilateralQualityAssessmentUiService;
  let httpMock: HttpTestingController;
  let router: { navigate: jest.Mock };

  beforeEach(() => {
    router = { navigate: jest.fn() };
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: Router, useValue: router }],
    });
    service = TestBed.inject(BilateralQualityAssessmentUiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    jest.restoreAllMocks();
  });

  describe('run', () => {
    it('is ready on the first response when the server answers with a terminal row', () => {
      const emitted: BilateralQualityAssessmentView[] = [];
      service.run(42).subscribe(a => emitted.push(a));
      expect(service.isRunning()).toBe(true);

      httpMock.expectOne(postUrl(42)).flush({ response: view() });

      expect(emitted).toHaveLength(1);
      expect(service.assessment()?.id).toBe(9);
      expect(service.state()).toBe('deciding');
      // A terminal row means no polling at all.
      httpMock.expectNone(latestUrl(42));
    });

    it('polls latest every 3s while the claimed row is still running', fakeAsync(() => {
      const emitted: BilateralQualityAssessmentView[] = [];
      service.run(42).subscribe(a => emitted.push(a));
      httpMock.expectOne(postUrl(42)).flush({ response: view({ status: 'running', overall: { verdict: null, score: null, summary: null } }) });

      // Nothing is polled before the first tick of the interval.
      tick(2999);
      httpMock.expectNone(latestUrl(42));

      tick(1);
      httpMock.expectOne(latestUrl(42)).flush({ response: view({ status: 'running' }) });
      expect(emitted).toHaveLength(0);
      expect(service.isRunning()).toBe(true);

      tick(3000);
      httpMock.expectOne(latestUrl(42)).flush({ response: view({ status: 'completed' }) });

      expect(emitted).toHaveLength(1);
      expect(service.state()).toBe('deciding');
      discardPeriodicTasks();
    }));

    it('gives up after the 70s window with a message that names what happened', fakeAsync(() => {
      let error: Error | null = null;
      service.run(42).subscribe({ error: (e: Error) => (error = e) });
      httpMock.expectOne(postUrl(42)).flush({ response: view({ status: 'running' }) });

      for (let elapsed = 3000; elapsed <= 69_000; elapsed += 3000) {
        tick(3000);
        httpMock.expectOne(latestUrl(42)).flush({ response: view({ status: 'running' }) });
      }
      tick(1000);

      // 🛑 Never a bare TimeoutError: the component reads `message`, and "Unknown error" on the most
      // likely failure of the whole flow is what this assertion exists to prevent.
      expect(error!.message).toContain('still running');
      expect(service.error()).toContain('still running');
      // The row stays on the rail so the user can reopen it later; no decision is offered, because
      // submit-for-review rejects a decision against a `running` row.
      expect(service.assessment()?.status).toBe('running');
      expect(service.state()).toBe('idle');
      discardPeriodicTasks();
    }));
  });

  it('openStored reopens the persisted verdict without issuing a single request', () => {
    service.assessment.set(view());

    service.openStored();

    expect(service.state()).toBe('deciding');
    expect(service.isDialogOpen()).toBe(true);
    httpMock.expectNone(postUrl(42));
    httpMock.expectNone(latestUrl(42));
  });

  it('openStored and close are no-ops while a request is in flight', () => {
    service.run(42).subscribe({ error: () => undefined });
    service.assessment.set(view());

    service.openStored();
    expect(service.state()).toBe('assessing');

    httpMock.expectOne(postUrl(42)).flush({ response: view() });
    service.state.set('submitting');
    service.close();
    expect(service.state()).toBe('submitting');
  });

  describe('submit', () => {
    it('sends the decision with the assessment id and keeps the dialog open meanwhile', () => {
      service.assessment.set(view());
      service.state.set('deciding');

      service.submit(42, 'submitted_anyway').subscribe();

      expect(service.isSubmitting()).toBe(true);
      expect(service.isDialogOpen()).toBe(true);
      // The rail's Submit greys out on the submit too, not only on the check.
      expect(service.isBusy()).toBe(true);
      expect(service.isRunning()).toBe(false);

      const req = httpMock.expectOne(submitUrl(42));
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ assessment_id: 9, decision: 'submitted_anyway' });
      req.flush({ response: { resultId: 42, status: 5 } });
    });

    // 🛑 The window used to survive its own submit: the component closed it on `next`, but `close()`
    // is gated on `isBusy()` and the state was still `submitting`, so the call was a no-op — and
    // `finalize` then put the state back to `deciding`. The user saw the success toast behind a
    // window still offering Submit for review and Make adjustments.
    it('closes once the submit succeeds', () => {
      service.assessment.set(view());
      service.state.set('deciding');

      service.submit(42, 'submitted_anyway').subscribe();
      httpMock.expectOne(submitUrl(42)).flush({ response: { resultId: 42, status: 5 } });

      expect(service.isDialogOpen()).toBe(false);
      expect(service.state()).toBe('idle');
      // The verdict stays on the rail as history — only the detail window closed.
      expect(service.assessment()).not.toBeNull();
    });

    it('returns to the verdict when the submit fails, so the decision is still on screen', () => {
      service.assessment.set(view());
      service.state.set('deciding');

      service.submit(42, 'submitted_anyway').subscribe({ error: () => undefined });
      httpMock.expectOne(submitUrl(42)).flush({ message: 'nope' }, { status: 400, statusText: 'Bad Request' });

      expect(service.state()).toBe('deciding');
      expect(service.isDialogOpen()).toBe(true);
    });

    it('refuses to submit with no assessment in hand', () => {
      expect(() => service.submit(42, 'submitted_anyway')).toThrow(/No quality assessment/);
    });

    // 🛑 Test-candado (moved here from bilateral-creation.service.spec when its dead submitResult was
    // deleted): the Center User's Submit once hit the REVIEWER's approve endpoint, which 409s on an
    // Editing result and would have self-approved it had it ever succeeded. Never again.
    it('never calls the reviewer review-decision endpoint', () => {
      service.assessment.set(view());
      service.submit(42, 'submitted_anyway').subscribe();
      httpMock.expectOne(submitUrl(42)).flush({});

      httpMock.expectNone('http://api.test/api/results/bilateral/42/review-decision');
    });

    it('never navigates: routing after a submit belongs to the component', () => {
      service.assessment.set(view());
      service.submit(42, 'submitted_without_check').subscribe();
      httpMock.expectOne(submitUrl(42)).flush({});

      expect(router.navigate).not.toHaveBeenCalled();
    });
  });

  describe('loadLatest', () => {
    it('rehydrates the stored row on navigation without opening the dialog', () => {
      service.loadLatest(42).subscribe();
      httpMock.expectOne(latestUrl(42)).flush({ response: view({ is_current: false }) });

      expect(service.assessment()?.is_current).toBe(false);
      expect(service.state()).toBe('idle');
      expect(service.isDialogOpen()).toBe(false);
    });

    it('unwraps the { latest: null } envelope a result with no assessment returns', () => {
      service.assessment.set(view());

      service.loadLatest(42).subscribe();
      httpMock.expectOne(latestUrl(42)).flush({ response: { latest: null } });

      expect(service.assessment()).toBeNull();
    });
  });
});
