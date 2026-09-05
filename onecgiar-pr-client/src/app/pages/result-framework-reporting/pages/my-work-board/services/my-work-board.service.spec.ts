// @akili-spec changes/my-work-board (MWB-T-3)
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { ApiService } from '../../../../../shared/services/api/api.service';
import { ResultsApiService } from '../../../../../shared/services/api/results-api.service';
import { SaveButtonService } from '../../../../../custom-fields/save-button/save-button.service';
import { ScienceProgramIdService } from '../../../services/science-program-id.service';
import { ProgrammeResultsFilterService } from '../../programme-results/services/programme-results-filter.service';
import { MyWorkCountService } from './my-work-count.service';
import { MyWorkBoardService } from './my-work-board.service';

/**
 * The seam under test is the real HTTP boundary for `GET_AllResultsWithUseRole` (`httpMock`), not
 * a mocked call-count — `MWB-R-3`'s "exactly one request" and "neither flag in All" claims are
 * only provable by inspecting the real query string `ResultsApiService` builds. `resolve()`'s own
 * memoisation already has its dedicated suite (`science-program-id.service.spec.ts`), so it is
 * stubbed here to a plain `jest.fn`. `MyWorkCountService` is stubbed too — its own `ensure`/`set`
 * contract is proven by `my-work-count.service.spec.ts`; here only the "did the board call `set`"
 * seam matters.
 */
describe('MyWorkBoardService', () => {
  let service: MyWorkBoardService;
  let filter: ProgrammeResultsFilterService;
  let httpMock: HttpTestingController;
  let resolve: jest.Mock;
  let countSet: jest.Mock;
  const userId = 7;

  function rawResult(partial: Record<string, any> = {}): Record<string, any> {
    return {
      id: '8101',
      result_code: '5834',
      title: 'Breeding pipeline optimisation',
      result_type: 'Impact contribution',
      status_id: '1',
      status_name: 'Editing',
      created_date: '2025-08-29T16:37:46.000Z',
      create_first_name: 'Guest',
      create_last_name: 'Tester',
      source_name: 'W1/W2',
      lead_center: null,
      version_id: '34',
      phase_name: 'Reporting 2026',
      submitter: 'SP01',
      ...partial
    };
  }

  function resultsResponse(items: Record<string, any>[]) {
    return { response: { items } };
  }

  function build() {
    TestBed.resetTestingModule();
    resolve = jest.fn().mockReturnValue(of(50));
    countSet = jest.fn();

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        MyWorkBoardService,
        // @akili-spec changes/my-work-board (MWB-T-9) — page-provided beside the board service on
        // `MyWorkBoardComponent`; the board reads it to narrow `visibleRows`.
        ProgrammeResultsFilterService,
        ResultsApiService,
        { provide: SaveButtonService, useValue: { isCreatingPipe: jest.fn(), isGettingSectionPipe: jest.fn(), isSavingPipe: jest.fn(), showSaveSpinner: jest.fn(), isSavingPipeNextStep: jest.fn() } },
        {
          provide: ApiService,
          useFactory: (resultsApi: ResultsApiService) => ({ resultsSE: resultsApi, authSE: { localStorageUser: { id: userId } } }),
          deps: [ResultsApiService]
        },
        { provide: ScienceProgramIdService, useValue: { resolve } },
        { provide: MyWorkCountService, useValue: { set: countSet, ensure: jest.fn(), count: jest.fn() } }
      ]
    });

    service = TestBed.inject(MyWorkBoardService);
    filter = TestBed.inject(ProgrammeResultsFilterService);
    httpMock = TestBed.inject(HttpTestingController);
  }

  beforeEach(() => build());

  afterEach(() => {
    httpMock.verify();
  });

  function expectListRequest() {
    return httpMock.expectOne(req => req.url.includes(`get/all/roles/filter/${userId}`));
  }

  it('Mine scope: one request carrying filter_created_by_me=true and include_completeness=true', () => {
    service.load('SP01');

    const req = expectListRequest();
    expect(req.request.url).toContain('submitter_id=50');
    expect(req.request.url).toContain('filter_created_by_me=true');
    expect(req.request.url).toContain('include_completeness=true');

    req.flush(resultsResponse([rawResult()]));

    expect(service.rows().length).toBe(1);
    expect(service.error()).toBeNull();
  });

  it('switching to All issues exactly one more request with neither flag', () => {
    service.load('SP01');
    expectListRequest().flush(resultsResponse([rawResult()]));

    service.setScope('all');
    const req = expectListRequest();
    expect(req.request.url).not.toContain('filter_created_by_me');
    expect(req.request.url).not.toContain('include_completeness');
    req.flush(resultsResponse([rawResult(), rawResult({ id: '8102', result_code: '5835', status_id: '3', status_name: 'Submitted' })]));

    expect(service.rows().length).toBe(2);
  });

  it('switching phase re-groups in memory: no request', () => {
    service.load('SP01');
    expectListRequest().flush(resultsResponse([rawResult({ phase_name: 'Reporting 2026' }), rawResult({ id: '8102', result_code: '5835', phase_name: 'Reporting 2025' })]));

    expect(service.rows().length).toBe(2);

    service.setPhase('Reporting 2025');
    httpMock.expectNone(req => req.url.includes('get/all/roles/filter'));

    expect(service.visibleRows().length).toBe(1);
    expect(service.visibleRows()[0].phaseName).toBe('Reporting 2025');
  });

  it('HTTP 404 is treated as an empty board, not an error', () => {
    service.load('SP01');
    expectListRequest().flush('Results Not Found', { status: 404, statusText: 'Not Found' });

    expect(service.rows()).toEqual([]);
    expect(service.error()).toBeNull();
    expect(service.loading()).toBe(false);
  });

  it('a 500 sets an error and leaves the rows untouched; retry() re-issues the request', () => {
    service.load('SP01');
    expectListRequest().flush(resultsResponse([rawResult()]));
    expect(service.rows().length).toBe(1);

    service.retry();
    expectListRequest().flush('boom', { status: 500, statusText: 'Server Error' });

    expect(service.error()).toBe('The results of this program could not be loaded.');
    expect(service.rows().length).toBe(1); // unchanged

    service.retry();
    const req = expectListRequest();
    req.flush(resultsResponse([rawResult(), rawResult({ id: '8102', result_code: '5835' })]));

    expect(service.error()).toBeNull();
    expect(service.rows().length).toBe(2);
  });

  it('a stale response is ignored once a later load() has superseded it', () => {
    service.load('SP01');
    const staleReq = expectListRequest();

    service.load('SP01');
    const freshReq = expectListRequest();

    staleReq.flush(resultsResponse([rawResult({ id: '9999', result_code: '9999' })]));
    expect(service.rows()).toEqual([]); // the stale response never lands

    freshReq.flush(resultsResponse([rawResult()]));
    expect(service.rows().length).toBe(1);
    expect(service.rows()[0].code).toBe('5834');
  });

  it('after a Mine load, writes the Editing badge to MyWorkCountService for the effective phase', () => {
    service.currentPhaseName.set('Reporting 2026');
    service.load('SP01');
    expectListRequest().flush(
      resultsResponse([
        rawResult({ phase_name: 'Reporting 2026' }),
        rawResult({ id: '8102', result_code: '5835', phase_name: 'Reporting 2026' }),
        rawResult({ id: '8103', result_code: '5836', status_id: '3', status_name: 'Submitted', phase_name: 'Reporting 2026' })
      ])
    );

    expect(service.badge()).toBe(2);
    expect(countSet).toHaveBeenCalledWith('SP01', 'Reporting 2026', 2);
  });

  it('an All load never touches the badge or MyWorkCountService', () => {
    service.scope.set('all');
    service.load('SP01');
    expectListRequest().flush(resultsResponse([rawResult()]));

    expect(service.badge()).toBeNull();
    expect(countSet).not.toHaveBeenCalled();
  });

  // @akili-spec changes/my-work-board (MWB-T-4 REWORK — Reviewer issue 1, MWB-T-3 forward pointer (b))
  it('a zero-row Mine load (404) still writes 0 to MyWorkCountService, falling back to the page phase when no row can supply one', () => {
    service.currentPhaseName.set('Reporting 2026');
    service.load('SP01');
    expectListRequest().flush('Results Not Found', { status: 404, statusText: 'Not Found' });

    expect(service.badge()).toBe(0);
    expect(countSet).toHaveBeenCalledWith('SP01', 'Reporting 2026', 0);
  });

  // @akili-spec changes/my-work-board (MWB-T-4, MWB-R-3 "Switch scope" — segment counts)
  describe('scopeTotals', () => {
    it('starts with both segments unknown', () => {
      expect(service.scopeTotals()).toEqual({ mine: null, all: null });
    });

    it('freezes the loaded scope total and leaves the other segment cached until IT loads', () => {
      service.load('SP01');
      expectListRequest().flush(resultsResponse([rawResult(), rawResult({ id: '8102', result_code: '5835' })]));
      expect(service.scopeTotals()).toEqual({ mine: 2, all: null });

      service.setScope('all');
      expectListRequest().flush(resultsResponse([rawResult()]));
      expect(service.scopeTotals()).toEqual({ mine: 2, all: 1 });

      // Switching back to Mine does not re-request (same rows already held) and does not touch
      // the frozen All total.
      service.setScope('mine');
      expectListRequest().flush(resultsResponse([rawResult()]));
      expect(service.scopeTotals()).toEqual({ mine: 1, all: 1 });
    });

    it('records a 404 as a total of 0 for that scope', () => {
      service.load('SP01');
      expectListRequest().flush('Results Not Found', { status: 404, statusText: 'Not Found' });

      expect(service.scopeTotals()).toEqual({ mine: 0, all: null });
    });

    // @akili-spec changes/my-work-board (MWB-T-4 REWORK — Reviewer issue 2, MWB-R-3 "Switch scope")
    it('re-freezes the ACTIVE segment total for the newly selected phase on setPhase(), leaving the inactive one cached', () => {
      service.load('SP01');
      expectListRequest().flush(
        resultsResponse([
          rawResult({ phase_name: 'Reporting 2026' }),
          rawResult({ id: '8102', result_code: '5835', phase_name: 'Reporting 2026' }),
          rawResult({ id: '8103', result_code: '5836', phase_name: 'Reporting 2025' })
        ])
      );
      // No phase requested yet -> effectivePhase defaults to the newest option, 'Reporting 2026' (2 rows).
      expect(service.scopeTotals()).toEqual({ mine: 2, all: null });

      service.setPhase('Reporting 2025');

      // The active (Mine) segment must now read the Reporting 2025 total (1 row), not the frozen 2026 value.
      expect(service.scopeTotals()).toEqual({ mine: 1, all: null });
    });

    // @akili-spec changes/my-work-board (MWB-T-4 REWORK attempt 3 — Reviewer issue 1, MWB-T-3 forward pointer (c))
    it('does not fabricate a total when setPhase() runs before the first load has completed (deep link with ?phase=)', () => {
      service.load('SP01');
      const req = expectListRequest();

      // The page's URL effect fires on the very first flush, while the list request is still in
      // flight: `rows()` is empty, but the segment must still read `–`, not a fabricated 0.
      service.setPhase('Reporting 2025');
      expect(service.scopeTotals()).toEqual({ mine: null, all: null });

      req.flush(resultsResponse([rawResult({ phase_name: 'Reporting 2025' })]));
      expect(service.scopeTotals()).toEqual({ mine: 1, all: null });
    });

    it('leaves the All segment unknown when a phase change lands before the All response', () => {
      service.load('SP01');
      expectListRequest().flush(resultsResponse([rawResult(), rawResult({ id: '8102', result_code: '5835' })]));
      expect(service.scopeTotals()).toEqual({ mine: 2, all: null });

      service.setScope('all');
      const req = expectListRequest();

      // The still-held Mine rows must not be counted under the All segment.
      service.setPhase('Reporting 2025');
      expect(service.scopeTotals()).toEqual({ mine: 2, all: null });

      req.flush(resultsResponse([rawResult({ phase_name: 'Reporting 2025' })]));
      expect(service.scopeTotals()).toEqual({ mine: 2, all: 1 });
    });
  });

  // @akili-spec changes/my-work-board (MWB-T-9) — the toolbar's non-phase dimensions.
  describe('toolbar filters (MWB-T-9)', () => {
    /**
     * Six rows in ONE phase, deliberately sharing values ACROSS dimensions (three `W1/W2`, three
     * `Knowledge product`, but only TWO rows carrying both) — the task's disqualifier: a fixture
     * with one row per value cannot tell an AND from an OR.
     */
    function loadSixRows() {
      service.currentPhaseName.set('Reporting 2026');
      service.load('SP01');
      expectListRequest().flush(
        resultsResponse([
          rawResult({ id: '1', result_code: '5101', result_type: 'Knowledge product', source_name: 'W1/W2', lead_center: 'CIAT' }),
          rawResult({ id: '2', result_code: '5102', result_type: 'Knowledge product', source_name: 'W1/W2', lead_center: 'IWMI' }),
          rawResult({ id: '3', result_code: '5103', result_type: 'Knowledge product', source_name: 'W3/Bilateral', lead_center: 'CIAT' }),
          rawResult({ id: '4', result_code: '5104', result_type: 'Innovation development', source_name: 'W1/W2', lead_center: 'CIAT' }),
          rawResult({ id: '5', result_code: '5105', result_type: 'Innovation development', source_name: 'W3/Bilateral', lead_center: 'IWMI' }),
          rawResult({
            id: '6',
            result_code: '5106',
            result_type: 'Policy change',
            source_name: 'W3/Bilateral',
            lead_center: 'IWMI',
            status_id: '3',
            status_name: 'Submitted'
          })
        ])
      );
    }

    it('narrows visibleRows on ONE dimension without a new request', () => {
      loadSixRows();
      expect(service.visibleRows().length).toBe(6);

      filter.selectedCategories.set(['Knowledge product']);
      httpMock.expectNone(req => req.url.includes('get/all/roles/filter'));

      expect(service.visibleRows().map(row => row.code)).toEqual(['5101', '5102', '5103']);
    });

    it('combines two dimensions with AND, not OR', () => {
      loadSixRows();

      filter.selectedCategories.set(['Knowledge product']);
      filter.selectedOrigins.set(['W1/W2']);

      // OR would yield five rows (three KP + three W1/W2 minus the two shared); AND yields two.
      expect(service.visibleRows().map(row => row.code)).toEqual(['5101', '5102']);
    });

    it('never applies a Status dimension — the columns already are the status (ignoreStatus)', () => {
      loadSixRows();

      filter.selectedStatus.set('Submitted');

      expect(service.visibleRows().length).toBe(6);
      expect(service.columns().find(column => column.key === 'submitted')?.rows.length).toBe(1);
    });

    it('leaves the tab badge and the segment total on the PHASE rows while a filter narrows the board', () => {
      loadSixRows();
      expect(service.badge()).toBe(5); // five Editing rows in Reporting 2026
      expect(service.scopeTotals()).toEqual({ mine: 6, all: null });

      filter.selectedCategories.set(['Policy change']);
      service.setPhase('Reporting 2026');

      expect(service.visibleRows().length).toBe(1);
      expect(service.badge()).toBe(5);
      expect(service.scopeTotals()).toEqual({ mine: 6, all: null });
    });
  });
});
