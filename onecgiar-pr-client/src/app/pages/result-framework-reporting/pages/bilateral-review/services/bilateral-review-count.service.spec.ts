// @akili-spec changes/sp-bilateral-review-tab (BRT-T-1, BRT-R-3, BRT-DD-2)
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ApiService } from '../../../../../shared/services/api/api.service';
import { ResultsApiService } from '../../../../../shared/services/api/results-api.service';
import { SaveButtonService } from '../../../../../custom-fields/save-button/save-button.service';
import { BilateralReviewCountService } from './bilateral-review-count.service';

/** Same seam as `my-work-count.service.spec.ts`: the real HTTP boundary for `GET_ResultToReview`
 *  (proves the exact one-request-per-code shape `BRT-DD-2` requires). */
describe('BilateralReviewCountService', () => {
  let service: BilateralReviewCountService;
  let httpMock: HttpTestingController;

  function row(partial: Record<string, any> = {}): Record<string, any> {
    return {
      id: '9001',
      project_id: 'PRJ-1',
      project_name: 'DESIRA — Digitalisation',
      result_code: '7710',
      result_title: 'Bilateral contribution',
      indicator_category: 'Knowledge product',
      status_name: 'Pending Review',
      status_id: 5,
      acronym: 'CIP',
      lead_center: 'CIP',
      toc_title: 'Outcome 1.1',
      indicator: 'Indicator A',
      submission_date: '2026-08-01T00:00:00.000Z',
      ...partial
    };
  }

  function groupedResponse(groups: { project_id: string; project_name: string; results: Record<string, any>[] }[]) {
    return { response: groups };
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        BilateralReviewCountService,
        ResultsApiService,
        {
          provide: SaveButtonService,
          useValue: { isCreatingPipe: jest.fn(), isGettingSectionPipe: jest.fn(), isSavingPipe: jest.fn(), showSaveSpinner: jest.fn(), isSavingPipeNextStep: jest.fn() }
        },
        {
          provide: ApiService,
          useFactory: (resultsApi: ResultsApiService) => ({ resultsSE: resultsApi }),
          deps: [ResultsApiService]
        }
      ]
    });

    service = TestBed.inject(BilateralReviewCountService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function expectReviewRequest() {
    return httpMock.expectOne(req => req.url.includes('by-program-and-centers') && req.url.includes('programId=SP02'));
  }

  it('a cold code issues one GET_ResultToReview request and counts loose-equal status_id 5 rows across groups', () => {
    service.ensure('SP02');

    const req = expectReviewRequest();
    req.flush(
      groupedResponse([
        { project_id: 'PRJ-1', project_name: 'DESIRA', results: [row(), row({ id: '9002', status_id: 6, status_name: 'Approved' })] },
        { project_id: 'PRJ-2', project_name: 'Other project', results: [row({ id: '9003', status_id: '5' })] } // string "5" — loose equality
      ])
    );

    expect(service.count('SP02')()).toBe(2);
  });

  it('a warm code (ensure called twice) issues only one request', () => {
    service.ensure('SP02');
    service.ensure('SP02');

    const req = expectReviewRequest();
    req.flush(groupedResponse([{ project_id: 'PRJ-1', project_name: 'DESIRA', results: [row()] }]));

    httpMock.expectNone(req2 => req2.url.includes('by-program-and-centers'));
    expect(service.count('SP02')()).toBe(1);
  });

  it('setFromRows overrides the cache without issuing a request', () => {
    service.setFromRows('SP02', [row(), row({ id: '9002', status_id: 5 }), row({ id: '9003', status_id: 6 })] as any);

    httpMock.expectNone(req => req.url.includes('by-program-and-centers'));
    expect(service.count('SP02')()).toBe(2);
  });

  it('refresh re-requests even when the code is already warm', () => {
    service.setFromRows('SP02', [row()] as any);
    expect(service.count('SP02')()).toBe(1);

    service.refresh('SP02');

    const req = expectReviewRequest();
    req.flush(groupedResponse([{ project_id: 'PRJ-1', project_name: 'DESIRA', results: [row(), row({ id: '9002', status_id: 5 })] }]));

    expect(service.count('SP02')()).toBe(2);
  });

  it('a malformed response (response not an array) leaves the code cold', () => {
    service.ensure('SP02');
    expectReviewRequest().flush({ response: null });

    expect(service.count('SP02')()).toBeNull();
  });

  it('an HTTP error leaves the code cold — count() keeps reading null', () => {
    service.ensure('SP02');
    expectReviewRequest().flush('boom', { status: 500, statusText: 'Server Error' });

    expect(service.count('SP02')()).toBeNull();
  });
});
