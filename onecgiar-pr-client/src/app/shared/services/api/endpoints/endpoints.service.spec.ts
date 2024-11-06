import { TestBed } from '@angular/core/testing';

import { EndpointsService } from './endpoints.service';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

describe('EndpointsService', () => {
  let service: EndpointsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(EndpointsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch result folders', () => {
    const dummyResponse = { data: 'test' };
    const phase = 'test-phase';

    service.resultFolders(phase).subscribe(response => {
      expect(response).toEqual(dummyResponse);
    });

    const req = httpMock.expectOne(`${service.apiBaseUrl}result-folders?type=type-one-report&status=active&phase=${phase}`);
    expect(req.request.method).toBe('GET');
    req.flush(dummyResponse);
  });
});
