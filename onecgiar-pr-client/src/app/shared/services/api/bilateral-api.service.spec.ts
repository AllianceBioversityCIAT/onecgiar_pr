import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { BilateralApiService } from './bilateral-api.service';
import { environment } from '../../../../environments/environment';
import { SaveButtonService } from '../../../custom-fields/save-button/save-button.service';

describe('BilateralApiService', () => {
  let service: BilateralApiService;
  let httpMock: HttpTestingController;
  const mockResponse = { response: { id: 1 } };
  const mockSaveButtonService = {
    isSavingPipe: jest.fn().mockReturnValue((observable: unknown) => observable)
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [BilateralApiService, { provide: SaveButtonService, useValue: mockSaveButtonService }]
    });
    service = TestBed.inject(BilateralApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('GET_bilateralProjects should GET center projects', done => {
    service.GET_bilateralProjects('42').subscribe(response => {
      expect(response).toEqual(mockResponse);
      done();
    });
    const req = httpMock.expectOne(`${environment.apiBaseUrl}api/bilateral/center/projects?centerId=42`);
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('POST_createBilateralHeader should POST create-header', done => {
    const body = { result_level_id: 3, result_type_id: 1 };
    service.POST_createBilateralHeader(body).subscribe(response => {
      expect(response).toEqual(mockResponse);
      done();
    });
    const req = httpMock.expectOne(`${environment.apiBaseUrl}api/bilateral/center/create-header`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush(mockResponse);
  });

  it('PATCH_plannedResult should PATCH planned-result', done => {
    const body = { planned_result: true };
    service.PATCH_plannedResult(10, body).subscribe(response => {
      expect(response).toEqual(mockResponse);
      done();
    });
    const req = httpMock.expectOne(`${environment.apiBaseUrl}api/bilateral/center/planned-result/10`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual(body);
    req.flush(mockResponse);
  });

  it('PATCH_tocMapping should PATCH toc-mapping', done => {
    const body = { result_toc_result: {} };
    service.PATCH_tocMapping(10, body).subscribe(response => {
      expect(response).toEqual(mockResponse);
      done();
    });
    const req = httpMock.expectOne(`${environment.apiBaseUrl}api/bilateral/center/toc-mapping/10`);
    expect(req.request.method).toBe('PATCH');
    req.flush(mockResponse);
  });

  it('PATCH_contributors should PATCH contributors', done => {
    const body = { contributing_center: [] };
    service.PATCH_contributors(10, body).subscribe(response => {
      expect(response).toEqual(mockResponse);
      done();
    });
    const req = httpMock.expectOne(`${environment.apiBaseUrl}api/bilateral/center/contributors/10`);
    expect(req.request.method).toBe('PATCH');
    req.flush(mockResponse);
  });

  it('GET_tocState should GET toc-state', done => {
    service.GET_tocState(10).subscribe(response => {
      expect(response).toEqual(mockResponse);
      done();
    });
    const req = httpMock.expectOne(`${environment.apiBaseUrl}api/bilateral/center/toc-state/10`);
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('GET_BilateralResultDetail should GET result detail', done => {
    service.GET_BilateralResultDetail(123).subscribe(response => {
      expect(response).toEqual(mockResponse);
      done();
    });
    const req = httpMock.expectOne(`${environment.apiBaseUrl}api/results/bilateral/123`);
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('PATCH_BilateralReviewDecision should PATCH review-decision', done => {
    const body = { decision: 'APPROVE' as const, justification: 'ok' };
    service.PATCH_BilateralReviewDecision(123, body).subscribe(response => {
      expect(response).toEqual(mockResponse);
      done();
    });
    const req = httpMock.expectOne(`${environment.apiBaseUrl}api/results/bilateral/123/review-decision`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual(body);
    req.flush(mockResponse);
  });

  it('PATCH_generalInfo should PATCH general-info', done => {
    const body = { title: 'T' };
    service.PATCH_generalInfo(5, body).subscribe(response => {
      expect(response).toEqual(mockResponse);
      done();
    });
    const req = httpMock.expectOne(`${environment.apiBaseUrl}api/results/bilateral/general-info/5`);
    expect(req.request.method).toBe('PATCH');
    req.flush(mockResponse);
  });

  it('PATCH_BilateralResultTitle should PATCH title', done => {
    const body = { title: 'New' };
    service.PATCH_BilateralResultTitle(123, body).subscribe(response => {
      expect(response).toEqual(mockResponse);
      done();
    });
    const req = httpMock.expectOne(`${environment.apiBaseUrl}api/results/bilateral/123/title`);
    expect(req.request.method).toBe('PATCH');
    req.flush(mockResponse);
  });

  it('PATCH_BilateralTocMetadata should PATCH toc-metadata with saving pipe', done => {
    const body = { foo: 1 };
    service.PATCH_BilateralTocMetadata(123, body).subscribe(response => {
      expect(response).toEqual(mockResponse);
      expect(mockSaveButtonService.isSavingPipe).toHaveBeenCalled();
      done();
    });
    const req = httpMock.expectOne(`${environment.apiBaseUrl}api/results/bilateral/review-update/toc-metadata/123`);
    expect(req.request.method).toBe('PATCH');
    req.flush(mockResponse);
  });

  it('PATCH_BilateralDataStandard should PATCH data-standard with saving pipe', done => {
    const body = { bar: 2 };
    service.PATCH_BilateralDataStandard(123, body).subscribe(response => {
      expect(response).toEqual(mockResponse);
      expect(mockSaveButtonService.isSavingPipe).toHaveBeenCalled();
      done();
    });
    const req = httpMock.expectOne(`${environment.apiBaseUrl}api/results/bilateral/review-update/data-standard/123`);
    expect(req.request.method).toBe('PATCH');
    req.flush(mockResponse);
  });
});
