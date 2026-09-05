// @akili-spec changes/my-work-board (MWB-T-3)
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { ApiService } from '../../../../../shared/services/api/api.service';
import { ResultsApiService } from '../../../../../shared/services/api/results-api.service';
import { SaveButtonService } from '../../../../../custom-fields/save-button/save-button.service';
import { ScienceProgramIdService } from '../../../services/science-program-id.service';
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
});
