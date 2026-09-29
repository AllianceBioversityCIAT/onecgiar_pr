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

  describe('flagForField', () => {
    const flagged = () => view({
      sections: {
        general_information: { verdict: 'red', comments: 'x', issues: ['fix the description'], fields: ['description', 'title'] },
        contributors_and_partners: { verdict: 'green', comments: 'ok', issues: [], fields: [] },
        geographic_location: { verdict: 'amber', comments: 'x', issues: ['set a country'], fields: ['scope', 'countries'] },
        evidence: { verdict: 'grey', comments: 'x', issues: [], fields: ['evidence'] },
      },
    });

    it('flags a field the AI named, with its section comments', () => {
      service.assessment.set(flagged());

      expect(service.flagForField('general_information', 'description')).toEqual({
        verdict: 'red',
        issues: ['fix the description'],
      });
      expect(service.flagForField('geographic_location', 'scope')?.verdict).toBe('amber');
    });

    it('does not flag a field the AI did not name', () => {
      service.assessment.set(flagged());

      expect(service.flagForField('general_information', 'lead_contact_person')).toBeNull();
    });

    // Green has nothing to correct; grey means the AI could not evaluate it. Neither is a defect.
    it('never flags on green or grey', () => {
      service.assessment.set(flagged());

      expect(service.flagForField('contributors_and_partners', 'lead_center')).toBeNull();
      expect(service.flagForField('evidence', 'evidence')).toBeNull();
    });

    // 🛑 Editing invalidates an assessment for submit-for-review, but this marker is the guidance
    // the reporter needs while making that edit. Submission validates freshness separately.
    it('keeps the AI guidance visible after the assessment becomes stale', () => {
      service.assessment.set({ ...flagged(), is_current: false });

      expect(service.flagForField('general_information', 'description')).toEqual({
        verdict: 'red',
        issues: ['fix the description'],
      });
    });

    it('is null with no assessment at all', () => {
      expect(service.flagForField('general_information', 'description')).toBeNull();
    });
  });

  describe('flagForSection', () => {
    // 🛑 This is what makes the window's "Go to <section>" link honest: field flags only exist where
    // the AI named a field AND we placed a marker, so without a section-level note the reporter can
    // follow the link and arrive at a section showing nothing. That happened (2026-09-18).
    it('returns the section verdict and its issues', () => {
      service.assessment.set(view({
        sections: {
          geographic_location: { verdict: 'amber', comments: 'x', issues: ['set a country'], fields: ['scope'] },
        },
      }));

      expect(service.flagForSection('geographic_location')).toEqual({
        verdict: 'amber',
        issues: ['set a country'],
      });
    });

    it('stays silent on green, grey and an absent section, but keeps stale guidance', () => {
      service.assessment.set(view({
        sections: {
          contributors_and_partners: { verdict: 'green', comments: 'ok', issues: [] },
          evidence: { verdict: 'grey', comments: 'x', issues: [] },
        },
      }));

      expect(service.flagForSection('contributors_and_partners')).toBeNull();
      expect(service.flagForSection('evidence')).toBeNull();
      expect(service.flagForSection('type_specific')).toBeNull();

      service.assessment.set({
        ...view({ sections: { general_information: { verdict: 'red', comments: 'x', issues: ['a'] } } }),
        is_current: false,
      });
      expect(service.flagForSection('general_information')).toEqual({
        verdict: 'red',
        issues: ['a'],
      });
    });
  });

  // @akili-spec changes/qa-submit-stale-guard (QSG-T-1, QSG-R-1, QSG-R-3)
  describe('openStored', () => {
    it('goes busy while re-reading the latest row, and the dialog itself does not open until it lands', () => {
      service.assessment.set(view());

      service.openStored();

      // Refreshing is busy (rail stays disabled) but is deliberately NOT "the dialog is open" —
      // the drawer must not appear until the corrected row is in hand.
      expect(service.state()).toBe('refreshing');
      expect(service.isBusy()).toBe(true);
      expect(service.isDialogOpen()).toBe(false);
      httpMock.expectNone(postUrl(42));

      httpMock.expectOne(latestUrl(42)).flush({ response: view() });

      expect(service.state()).toBe('deciding');
      expect(service.isDialogOpen()).toBe(true);
    });

    // Falsifier (QSG-R-1): the held row is current; the server's fresh read of the SAME id is not.
    // Mutation (a) — skip the re-read — leaves `is_current` at the stale `true` and goes red here.
    it('reflects the server-fresh is_current for the SAME id it holds, hiding Submit on reopen', () => {
      service.assessment.set(view()); // id 9, is_current: true

      service.openStored();
      httpMock.expectOne(latestUrl(42)).flush({ response: view({ is_current: false }) }); // same id 9

      expect(service.assessment()?.id).toBe(9);
      expect(service.assessment()?.is_current).toBe(false);
      expect(service.state()).toBe('deciding');
    });

    // Regression: nothing changed server-side — Submit must still be offered exactly as today.
    it('regression: a current row still opens with Submit available', () => {
      service.assessment.set(view());

      service.openStored();
      httpMock.expectOne(latestUrl(42)).flush({ response: view() });

      expect(service.assessment()?.is_current).toBe(true);
      expect(service.state()).toBe('deciding');
      expect(service.isDialogOpen()).toBe(true);
    });

    // Falsifier (QSG-R-3): the re-read errors outright. Mutation (c) — on error, keep the row
    // as-is instead of marking it stale — leaves `is_current` at `true` and goes red here.
    it('fails closed when the re-read itself errors', () => {
      service.assessment.set(view()); // id 9, is_current: true

      service.openStored();
      httpMock.expectOne(latestUrl(42)).flush({ message: 'boom' }, { status: 500, statusText: 'Server Error' });

      expect(service.assessment()?.id).toBe(9);
      expect(service.assessment()?.is_current).toBe(false);
      expect(service.state()).toBe('deciding');
    });

    // QSG-R-3, DD-3: an empty `{ latest: null }` envelope is fail-closed the same as an error —
    // there is no fresh row to trust, so the held one is kept but marked stale.
    it('fails closed when the server has nothing to report (`latest: null`)', () => {
      service.assessment.set(view());

      service.openStored();
      httpMock.expectOne(latestUrl(42)).flush({ response: { latest: null } });

      expect(service.assessment()?.id).toBe(9);
      expect(service.assessment()?.is_current).toBe(false);
      expect(service.state()).toBe('deciding');
    });
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

    // @akili-spec changes/qa-submit-stale-guard (QSG-T-1, QSG-R-2, QSG-R-3)
    describe('a rejected Submit', () => {
      // Falsifier (QSG-R-2): the re-read of the SAME id comes back not current. Mutation (b) —
      // skip the re-read on this path — leaves `is_current` at the stale `true` and goes red here.
      it('re-reads the latest row and hides Submit when it is not current', () => {
        let error: unknown = null;
        service.assessment.set(view()); // id 9
        service.state.set('deciding');

        service.submit(42, 'submitted_anyway').subscribe({ error: (e) => (error = e) });
        // Busy (dialog open, Submit disabled) through the WHOLE re-read, not only the PATCH.
        httpMock.expectOne(submitUrl(42)).flush({ message: 'stale' }, { status: 400, statusText: 'Bad Request' });
        expect(service.state()).toBe('submitting');
        expect(service.isDialogOpen()).toBe(true);

        httpMock.expectOne(latestUrl(42)).flush({ response: view({ is_current: false }) });

        expect(service.assessment()?.id).toBe(9);
        expect(service.assessment()?.is_current).toBe(false);
        expect(service.state()).toBe('deciding');
        expect(service.isDialogOpen()).toBe(true);
        // The caller (the "Submit failed" toast) still gets the ORIGINAL server error.
        expect((error as { status?: number })?.status).toBe(400);
      });

      // Regression side of QSG-R-2: a newer row that IS current is offered — the guard hides
      // Submit only when it must, never unconditionally after a rejection.
      it('re-reads and offers Submit again when a newer row is current', () => {
        service.assessment.set(view()); // id 9
        service.state.set('deciding');

        service.submit(42, 'submitted_anyway').subscribe({ error: () => undefined });
        httpMock.expectOne(submitUrl(42)).flush({ message: 'stale' }, { status: 400, statusText: 'Bad Request' });
        httpMock.expectOne(latestUrl(42)).flush({ response: view({ id: 11, is_current: true }) });

        expect(service.assessment()?.id).toBe(11);
        expect(service.assessment()?.is_current).toBe(true);
        expect(service.state()).toBe('deciding');
      });

      // Falsifier (QSG-R-3): the re-read itself errors. Mutation (c) applies here too — keeping
      // the row as-is instead of marking it stale goes red on the `is_current` assertion.
      it('fails closed when the re-read itself errors', () => {
        service.assessment.set(view()); // id 9, is_current: true

        service.submit(42, 'submitted_anyway').subscribe({ error: () => undefined });
        httpMock.expectOne(submitUrl(42)).flush({ message: 'nope' }, { status: 400, statusText: 'Bad Request' });
        httpMock.expectOne(latestUrl(42)).flush({ message: 'boom' }, { status: 500, statusText: 'Server Error' });

        expect(service.assessment()?.id).toBe(9);
        expect(service.assessment()?.is_current).toBe(false);
        expect(service.state()).toBe('deciding');
        expect(service.isDialogOpen()).toBe(true);
      });
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
