// @akili-spec changes/my-work-board (MWB-T-2, MWB-DD-3)
import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ApiService } from '../../../shared/services/api/api.service';
import { ScienceProgramIdService } from './science-program-id.service';

/**
 * The seam here is the real HTTP boundary (`httpMock.verify()`), not a mocked `ApiService`
 * method call count — the whole point of `MWB-DD-3` is that the underlying request fires once no
 * matter how many callers subscribe, which a jest.fn() call-count assertion cannot prove the way
 * `shareReplay` actually behaves. `ApiService` is stubbed down to the one method this service
 * touches, wired to the real `HttpClient` so `HttpTestingController` can observe the request.
 */
describe('ScienceProgramIdService', () => {
  let service: ScienceProgramIdService;
  let httpMock: HttpTestingController;
  const url = 'https://fake-api.test/science-programs/progress';

  function progressResponse() {
    return {
      response: {
        mySciencePrograms: [{ initiativeId: 50, initiativeCode: 'SP01' }],
        otherSciencePrograms: [{ initiativeId: 55, initiativeCode: 'SP06' }]
      }
    };
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        ScienceProgramIdService,
        {
          provide: ApiService,
          useFactory: (http: HttpClient) => ({ resultsSE: { GET_ScienceProgramsProgress: () => http.get(url) } }),
          deps: [HttpClient]
        }
      ]
    });
    service = TestBed.inject(ScienceProgramIdService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('memoises the progress request: two subscribers issue exactly one HTTP request', () => {
    let first: number | null | undefined;
    let second: number | null | undefined;

    service.resolve('SP01').subscribe(value => (first = value));
    service.resolve('sp06').subscribe(value => (second = value));

    const req = httpMock.expectOne(url);
    req.flush(progressResponse());

    expect(first).toBe(50);
    expect(second).toBe(55);
  });

  it('resolves an unknown code to null without a second request', () => {
    let first: number | null | undefined;
    service.resolve('SP01').subscribe(value => (first = value));
    httpMock.expectOne(url).flush(progressResponse());
    expect(first).toBe(50);

    let unknown: number | null | undefined;
    service.resolve('SPXX').subscribe(value => (unknown = value));

    expect(unknown).toBeNull();
  });

  it('resolves a blank code to null without ever calling the endpoint', () => {
    let result: number | null | undefined;
    service.resolve('   ').subscribe(value => (result = value));

    expect(result).toBeNull();
    httpMock.expectNone(url);
  });
});
