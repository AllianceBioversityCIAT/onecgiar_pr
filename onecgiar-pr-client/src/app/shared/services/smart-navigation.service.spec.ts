import { TestBed } from '@angular/core/testing';
import { NavigationEnd, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { SmartNavigationService } from './smart-navigation.service';

describe('SmartNavigationService', () => {
  let service: SmartNavigationService;
  let routerEvents$: Subject<unknown>;
  let mockRouter: Partial<Router> & { events: Subject<unknown>; navigateByUrl: jest.Mock; url: string };

  beforeEach(() => {
    routerEvents$ = new Subject<unknown>();
    mockRouter = {
      url: '/result-framework-reporting/home',
      events: routerEvents$,
      navigateByUrl: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        SmartNavigationService,
        { provide: Router, useValue: mockRouter }
      ]
    });

    service = TestBed.inject(SmartNavigationService);
  });

  it('initializes with current router url in history', () => {
    expect(service.getHistory()).toEqual(['/result-framework-reporting/home']);
  });

  it('filters out "/" and "/login" roots', () => {
    service.recordUrl('/');
    service.recordUrl('/login');
    service.recordUrl('/result-framework-reporting/home');

    expect(service.getHistory()).toEqual(['/result-framework-reporting/home']);
  });

  it('records subsequent NavigationEnd events without duplicates', () => {
    routerEvents$.next(new NavigationEnd(1, '/result-framework-reporting/entity-details/SP02', '/result-framework-reporting/entity-details/SP02'));
    routerEvents$.next(new NavigationEnd(2, '/result-framework-reporting/entity-details/SP02', '/result-framework-reporting/entity-details/SP02'));
    routerEvents$.next(new NavigationEnd(3, '/result-framework-reporting/entity-details/SP02?tocView=byAow&tocAow=AOW01', '/result-framework-reporting/entity-details/SP02?tocView=byAow&tocAow=AOW01'));

    expect(service.getHistory()).toEqual([
      '/result-framework-reporting/home',
      '/result-framework-reporting/entity-details/SP02',
      '/result-framework-reporting/entity-details/SP02?tocView=byAow&tocAow=AOW01'
    ]);
  });

  describe('getBackTarget and getPreviousUrl', () => {
    it('detects coming from Science programs when user is on entity details', () => {
      mockRouter.url = '/result-framework-reporting/entity-details/SP02';
      service.recordUrl('/result-framework-reporting/home');
      service.recordUrl('/result-framework-reporting/entity-details/SP02');

      const target = service.getBackTarget();
      expect(target.label).toBe('Back to Science programs');
      expect(target.url).toBe('/result-framework-reporting/home');
    });

    it('returns to Science programs even after switching tabs inside the program (not looped)', () => {
      mockRouter.url = '/result-framework-reporting/entity-details/SP03?tocView=aows';
      service.recordUrl('/result-framework-reporting/home');
      service.recordUrl('/result-framework-reporting/entity-details/SP03/overview');
      service.recordUrl('/result-framework-reporting/entity-details/SP03?tocView=aows');

      const target = service.getBackTarget();
      expect(target.label).toBe('Back to Science programs');
      expect(target.url).toBe('/result-framework-reporting/home');
    });

    it('detects coming from Overview tab to By-AOW reporting view', () => {
      mockRouter.url = '/result-framework-reporting/entity-details/SP02?tocView=byAow&tocAow=AOW01';
      service.recordUrl('/result-framework-reporting/entity-details/SP02/overview');
      service.recordUrl('/result-framework-reporting/entity-details/SP02?tocView=byAow&tocAow=AOW01');

      const target = service.getBackTarget();
      expect(target.label).toBe('Back to Overview');
      expect(target.url).toBe('/result-framework-reporting/entity-details/SP02/overview');
    });

    it('detects coming from grouped AoW table to By-AOW reporting view', () => {
      mockRouter.url = '/result-framework-reporting/entity-details/SP02?tocView=byAow&tocAow=AOW01';
      service.recordUrl('/result-framework-reporting/entity-details/SP02');
      service.recordUrl('/result-framework-reporting/entity-details/SP02?tocView=byAow&tocAow=AOW01');

      const target = service.getBackTarget();
      expect(target.label).toBe('Back to all Areas of Work');
      expect(target.url).toBe('/result-framework-reporting/entity-details/SP02');
    });

    it('detects coming from Portfolio overview', () => {
      mockRouter.url = '/result-framework-reporting/entity-details/SP02';
      service.recordUrl('/result-framework-reporting/portfolio-overview');
      service.recordUrl('/result-framework-reporting/entity-details/SP02');

      const target = service.getBackTarget();
      expect(target.label).toBe('Back to Portfolio overview');
      expect(target.url).toBe('/result-framework-reporting/portfolio-overview');
    });

    it('detects coming from Results list', () => {
      mockRouter.url = '/result-framework-reporting/entity-details/SP02';
      service.recordUrl('/result/results-outlet/results-list');
      service.recordUrl('/result-framework-reporting/entity-details/SP02');

      const target = service.getBackTarget();
      expect(target.label).toBe('Back to Results list');
      expect(target.url).toBe('/result/results-outlet/results-list');
    });

    it('provides fallback when direct landing on By-AOW without prior history', () => {
      mockRouter.url = '/result-framework-reporting/entity-details/SP02?tocView=byAow&tocAow=AOW01';
      (service as unknown as { history: string[] }).history = [mockRouter.url];

      const target = service.getBackTarget(mockRouter.url, 'SP02');
      expect(target.label).toBe('Back to Overview');
      expect(target.url).toBe('/result-framework-reporting/entity-details/SP02/overview');
    });

    it('provides fallback when direct landing on entity details root without prior history', () => {
      mockRouter.url = '/result-framework-reporting/entity-details/SP02';
      (service as unknown as { history: string[] }).history = [mockRouter.url];

      const target = service.getBackTarget(mockRouter.url, 'SP02');
      expect(target.label).toBe('Back to Science programs');
      expect(target.url).toBe('/result-framework-reporting/home');
    });
  });

  // ─── SBB-T-1: Sibling-SP hop, ping-pong, and Center→SP regressions ────────────
  // Per spec: docs/specs/bugfix/smart-back-button/tasks.md §SBB-T-1
  // SBB-TEST-1 and SBB-TEST-2 MUST fail on unmodified service code.
  // SBB-TEST-3 is expected to pass today — recorded per task DoD.

  describe('SBB-T-1: Sibling SP hop, ping-pong, and Center → SP regressions', () => {
    // SBB-TEST-1 — SBB-R-1 (THEN/AND/BUT): MUST FAIL on current code.
    // Current code returns { label: 'Back', url: '…/entity-details/SP08' }
    // because the SP-shell branch skips the same-program siblings but treats
    // any other /entity-details/* as a generic fallback instead of a sibling.
    it('resolves to Science programs home after sidebar hop (home → SP08 → SP01 → SP01/overview) — SBB-TEST-1 [red]', () => {
      // GIVEN: user opened home, then SP08, then SP01, then SP01/overview
      mockRouter.url = '/result-framework-reporting/entity-details/SP01/overview';
      service.recordUrl('/result-framework-reporting/home'); // no-op; already seeded by constructor
      service.recordUrl('/result-framework-reporting/entity-details/SP08');
      service.recordUrl('/result-framework-reporting/entity-details/SP01');
      service.recordUrl('/result-framework-reporting/entity-details/SP01/overview');

      // WHEN: Back is resolved on SP01 Overview
      const target = service.getBackTarget();

      // THEN: catalog label + home URL (SBB-R-1 THEN + AND)
      expect(target.label).toBe('Back to Science programs');
      expect(target.url).toBe('/result-framework-reporting/home');
      // BUT NOT generic 'Back' and NOT any /entity-details/ destination (SBB-R-1 BUT)
      expect(target.label).not.toBe('Back');
      expect(target.url).not.toContain('/entity-details/');
    });

    // SBB-TEST-2 — SBB-R-2 (BUT not SP01 ping-pong): MUST FAIL on current code.
    // After the buggy first back() (→ SP08), a NavigationEnd fires and SP08 is
    // appended to history.  The second resolve finds SP01/overview as the nearest
    // non-same-program entry and returns it — ping-pong.
    it('does not ping-pong back to SP01 after following Back from a sibling hop — SBB-TEST-2 [red]', () => {
      // GIVEN: same sibling-hop history
      mockRouter.url = '/result-framework-reporting/entity-details/SP01/overview';
      service.recordUrl('/result-framework-reporting/home');
      service.recordUrl('/result-framework-reporting/entity-details/SP08');
      service.recordUrl('/result-framework-reporting/entity-details/SP01');
      service.recordUrl('/result-framework-reporting/entity-details/SP01/overview');

      // WHEN: user clicks Back once
      service.back();
      const navigatedUrl = (mockRouter.navigateByUrl as jest.Mock).mock.calls[0][0] as string;

      // Simulate the NavigationEnd the real Router would fire
      routerEvents$.next(new NavigationEnd(10, navigatedUrl, navigatedUrl));
      mockRouter.url = navigatedUrl;

      // THEN: a second resolve MUST NOT send user back to SP01 (SBB-R-2 BUT)
      const secondTarget = service.getBackTarget();
      expect(secondTarget.url).not.toContain('/entity-details/SP01');
    });

    // SBB-TEST-3 — SBB-R-3 (Center → SP): verify bilateral label is kept.
    // NOTE: this test is expected to PASS on current service code (recorded per DoD).
    // The SP-shell branch already matches /bilateral in history and returns the
    // correct label before falling through to the generic 'Back' fallback.
    it('keeps "Back to Bilateral results" label when navigating from a Center surface to a Science Program shell — SBB-TEST-3', () => {
      // GIVEN: user opened a Center surface, then a Science Program shell
      mockRouter.url = '/result-framework-reporting/entity-details/SP01';
      service.recordUrl('/result-framework-reporting/bilateral/CIMMYT/overview');
      service.recordUrl('/result-framework-reporting/entity-details/SP01');

      // WHEN: Back is resolved on the SP shell
      const target = service.getBackTarget();

      // THEN: bilateral label + Center URL (SBB-R-3 THEN + AND)
      expect(target.label).toBe('Back to Bilateral results');
      expect(target.url).toContain('/bilateral/CIMMYT');
      // BUT NOT generic 'Back' and NOT forced home (SBB-R-3 BUT)
      expect(target.label).not.toBe('Back');
      expect(target.url).not.toBe('/result-framework-reporting/home');
    });
  });
  // ────────────────────────────────────────────────────────────────────────────

  describe('back navigation execution', () => {
    it('navigates to previous URL on back()', () => {
      mockRouter.url = '/result-framework-reporting/entity-details/SP02?tocView=byAow&tocAow=AOW01';
      service.recordUrl('/result-framework-reporting/entity-details/SP02/overview');
      service.recordUrl('/result-framework-reporting/entity-details/SP02?tocView=byAow&tocAow=AOW01');

      service.back();

      expect(mockRouter.navigateByUrl).toHaveBeenCalledWith('/result-framework-reporting/entity-details/SP02/overview');
    });

    it('navigates to fallback URL if explicitly provided', () => {
      service.back('/custom-fallback');

      expect(mockRouter.navigateByUrl).toHaveBeenCalledWith('/custom-fallback');
    });
  });

  describe('getResultDetailBackTarget', () => {
    const detail = '/result/result-detail/9042/general-information?phase=36';
    const contributors = '/result/result-detail/9042/rd-contributors-and-partners?phase=36';
    const programmeResults = '/result-framework-reporting/entity-details/SP12/results?phase=Reporting%202026&createdBy=42';
    const resultsCenter = '/result/results-outlet/results-list?phase=36';
    const overview = '/result-framework-reporting/entity-details/SP12/overview';
    const resultsReview = '/result-framework-reporting/entity-details/SP12/results-review';

    it('returns the Science Program Results tab when that is the first non-detail origin', () => {
      service.recordUrl(programmeResults);
      service.recordUrl(detail);

      const target = service.getResultDetailBackTarget(detail);

      expect(target.url).toBe(programmeResults);
      expect(target.label).toBe('Back to results');
    });

    it('skips sibling result-detail section hops and still finds the programme Results tab', () => {
      service.recordUrl(programmeResults);
      service.recordUrl(detail);
      service.recordUrl(contributors);

      expect(service.getResultDetailBackTarget(contributors).url).toBe(programmeResults);
    });

    it('preserves Results Center query params when that is the origin', () => {
      service.recordUrl(resultsCenter);
      service.recordUrl(detail);

      expect(service.getResultDetailBackTarget(detail).url).toBe(resultsCenter);
    });

    it('falls back to Results Center when the origin is Overview', () => {
      service.recordUrl(overview);
      service.recordUrl(detail);

      expect(service.getResultDetailBackTarget(detail).url).toBe('/result/results-outlet/results-list');
    });

    it('does not treat results-review as the programme Results tab', () => {
      service.recordUrl(resultsReview);
      service.recordUrl(detail);

      expect(service.getResultDetailBackTarget(detail).url).toBe('/result/results-outlet/results-list');
    });

    it('falls back to Results Center when history is empty or only the current detail URL', () => {
      mockRouter.url = detail;
      expect(service.getResultDetailBackTarget(detail).url).toBe('/result/results-outlet/results-list');
    });
  });
});
