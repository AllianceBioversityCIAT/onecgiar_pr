// @akili-spec changes/bilateral-review-center-strip-and-phase (BRC-T-1, BRC-R-6, BRC-DD-1/DD-2)
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ApiService } from '../../../../../shared/services/api/api.service';
import { ResultsApiService } from '../../../../../shared/services/api/results-api.service';
import { SaveButtonService } from '../../../../../custom-fields/save-button/save-button.service';
import { BilateralReviewCountService } from './bilateral-review-count.service';

/** Same seam as `my-work-count.service.spec.ts`: the real HTTP boundary for `GET_ResultToReview`
 *  (proves the exact one-request-per-(code, phase) shape `BRC-DD-1`/`DD-2` require). */
describe('BilateralReviewCountService (phase-scoped, BRC-T-1)', () => {
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

  function expectReviewRequest(versionId: number | string) {
    return httpMock.expectOne(req => req.url.includes('by-program-and-centers') && req.url.includes('programId=SP02') && req.url.includes(`versionId=${versionId}`));
  }

  it('a cold (code, phase) pair issues one GET_ResultToReview request carrying versionId and counts loose-equal status_id 5 rows across groups', () => {
    service.ensure('SP02', 36);

    const req = expectReviewRequest(36);
    req.flush(
      groupedResponse([
        { project_id: 'PRJ-1', project_name: 'DESIRA', results: [row(), row({ id: '9002', status_id: 6, status_name: 'Approved' })] },
        { project_id: 'PRJ-2', project_name: 'Other project', results: [row({ id: '9003', status_id: '5' })] } // string "5" — loose equality
      ])
    );

    expect(service.count('SP02', 36)()).toBe(2);
  });

  it('a warm (code, phase) pair (ensure called twice) issues only one request', () => {
    service.ensure('SP02', 36);
    service.ensure('SP02', 36);

    const req = expectReviewRequest(36);
    req.flush(groupedResponse([{ project_id: 'PRJ-1', project_name: 'DESIRA', results: [row()] }]));

    httpMock.expectNone(req2 => req2.url.includes('by-program-and-centers'));
    expect(service.count('SP02', 36)()).toBe(1);
  });

  it('isolates the cache per phase — the same program at a different phase is cold and issues its own request', () => {
    service.setFromRows('SP02', 36, [row(), row({ id: '9002', status_id: 5 })] as any);
    expect(service.count('SP02', 36)()).toBe(2);

    service.ensure('SP02', 34);
    const req = expectReviewRequest(34);
    req.flush(groupedResponse([{ project_id: 'PRJ-1', project_name: 'DESIRA', results: [row()] }]));

    expect(service.count('SP02', 34)()).toBe(1);
    // The phase-36 entry is untouched by the phase-34 fetch.
    expect(service.count('SP02', 36)()).toBe(2);
  });

  it('a wire string "36" and the number 36 share the same cache entry (bigint-string normalization, judgment-day L-3)', () => {
    service.setFromRows('SP02', '36', [row(), row({ id: '9002', status_id: 5 })] as any);

    expect(service.count('SP02', 36)()).toBe(2);
    service.ensure('SP02', 36); // must be a no-op: the string-keyed write already warmed this key
    httpMock.expectNone(req => req.url.includes('by-program-and-centers'));
  });

  it('setFromRows overrides the cache without issuing a request', () => {
    service.setFromRows('SP02', 36, [row(), row({ id: '9002', status_id: 5 }), row({ id: '9003', status_id: 6 })] as any);

    httpMock.expectNone(req => req.url.includes('by-program-and-centers'));
    expect(service.count('SP02', 36)()).toBe(2);
  });

  it('refresh re-requests even when the (code, phase) pair is already warm', () => {
    service.setFromRows('SP02', 36, [row()] as any);
    expect(service.count('SP02', 36)()).toBe(1);

    service.refresh('SP02', 36);

    const req = expectReviewRequest(36);
    req.flush(groupedResponse([{ project_id: 'PRJ-1', project_name: 'DESIRA', results: [row(), row({ id: '9002', status_id: 5 })] }]));

    expect(service.count('SP02', 36)()).toBe(2);
  });

  it('ensure(code, null) is a no-op — issues no request and count() keeps reading null', () => {
    service.ensure('SP02', null);
    httpMock.expectNone(req => req.url.includes('by-program-and-centers'));
    expect(service.count('SP02', null)()).toBeNull();
  });

  it('ensure(code, NaN) is a no-op', () => {
    service.ensure('SP02', NaN);
    httpMock.expectNone(req => req.url.includes('by-program-and-centers'));
    expect(service.count('SP02', NaN)()).toBeNull();
  });

  it('ensure(code, 0) is a no-op — 0 is never a valid phase id (Leader-found live-page defect: Number(null) === 0)', () => {
    service.ensure('SP02', 0);
    httpMock.expectNone(req => req.url.includes('by-program-and-centers'));
    expect(service.count('SP02', 0)()).toBeNull();
  });

  it('a malformed response (response not an array) leaves the (code, phase) pair cold', () => {
    service.ensure('SP02', 36);
    expectReviewRequest(36).flush({ response: null });

    expect(service.count('SP02', 36)()).toBeNull();
  });

  it('an HTTP error leaves the (code, phase) pair cold — count() keeps reading null', () => {
    service.ensure('SP02', 36);
    expectReviewRequest(36).flush('boom', { status: 500, statusText: 'Server Error' });

    expect(service.count('SP02', 36)()).toBeNull();
  });
});
