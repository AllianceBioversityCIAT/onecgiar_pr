// @akili-spec changes/my-work-board (MWB-T-3, MWB-R-1, MWB-DD-5)
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { ApiService } from '../../../../../shared/services/api/api.service';
import { ResultsApiService } from '../../../../../shared/services/api/results-api.service';
import { SaveButtonService } from '../../../../../custom-fields/save-button/save-button.service';
import { ScienceProgramIdService } from '../../../services/science-program-id.service';
import { MyWorkCountService } from './my-work-count.service';

/** Same seam rationale as `my-work-board.service.spec.ts`: the real HTTP boundary for
 *  `GET_AllResultsWithUseRole` (proves the exact scoped request `MWB-DD-5` requires), with
 *  `ScienceProgramIdService.resolve()` stubbed (its own memoisation has its own suite). */
describe('MyWorkCountService', () => {
  let service: MyWorkCountService;
  let httpMock: HttpTestingController;
  let resolve: jest.Mock;
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

  beforeEach(() => {
    resolve = jest.fn().mockReturnValue(of(50));

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        MyWorkCountService,
        ResultsApiService,
        {
          provide: SaveButtonService,
          useValue: { isCreatingPipe: jest.fn(), isGettingSectionPipe: jest.fn(), isSavingPipe: jest.fn(), showSaveSpinner: jest.fn(), isSavingPipeNextStep: jest.fn() }
        },
        {
          provide: ApiService,
          useFactory: (resultsApi: ResultsApiService) => ({ resultsSE: resultsApi, authSE: { localStorageUser: { id: userId } } }),
          deps: [ResultsApiService]
        },
        { provide: ScienceProgramIdService, useValue: { resolve } }
      ]
    });

    service = TestBed.inject(MyWorkCountService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function expectCountRequest() {
    return httpMock.expectOne(req => req.url.includes(`get/all/roles/filter/${userId}`));
  }

  it('a cold key issues one submitter_id + filter_created_by_me + status_id=1,8 request and counts rows matching the phase label', () => {
    service.ensure('SP01', 'Reporting 2026');

    const req = expectCountRequest();
    expect(req.request.url).toContain('submitter_id=50');
    expect(req.request.url).toContain('filter_created_by_me=true');
    expect(req.request.url).toContain('status_id=1,8');

    req.flush(
      resultsResponse([
        rawResult({ phase_name: 'Reporting 2026' }),
        rawResult({ id: '8102', result_code: '5835', phase_name: 'Reporting 2026', status_id: '8', status_name: 'Draft' }),
        rawResult({ id: '8103', result_code: '5836', phase_name: 'Reporting 2025' }) // different phase — not counted
      ])
    );

    expect(service.count('SP01', 'Reporting 2026')()).toBe(2);
  });

  it('a warm key issues no request', () => {
    service.set('SP01', 'Reporting 2026', 3);

    service.ensure('SP01', 'Reporting 2026');

    httpMock.expectNone(req => req.url.includes('get/all/roles/filter'));
    expect(service.count('SP01', 'Reporting 2026')()).toBe(3);
  });

  it('a 404 (no results) counts as 0', () => {
    service.ensure('SP01', 'Reporting 2026');
    expectCountRequest().flush('Results Not Found', { status: 404, statusText: 'Not Found' });

    expect(service.count('SP01', 'Reporting 2026')()).toBe(0);
  });

  it('any other error leaves the key cold — count() keeps reading null', () => {
    service.ensure('SP01', 'Reporting 2026');
    expectCountRequest().flush('boom', { status: 500, statusText: 'Server Error' });

    expect(service.count('SP01', 'Reporting 2026')()).toBeNull();
  });

  it('an unresolved program code leaves the key cold without ever calling the list endpoint', () => {
    resolve.mockReturnValue(of(null));

    service.ensure('SPXX', 'Reporting 2026');

    httpMock.expectNone(req => req.url.includes('get/all/roles/filter'));
    expect(service.count('SPXX', 'Reporting 2026')()).toBeNull();
  });
});
