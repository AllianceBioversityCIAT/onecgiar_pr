import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpClient, HTTP_INTERCEPTORS } from '@angular/common/http';
import { Router } from '@angular/router';
import { GeneralInterceptorService } from './general-interceptor.service';
import { AuthService } from '../services/api/auth.service';
import { GreenChecksService } from '../services/global/green-checks.service';
import { ApiService } from '../services/api/api.service';
import { IpsrCompletenessStatusService } from '../../pages/ipsr/services/ipsr-completeness-status.service';
import { environment } from '../../../environments/environment';

describe('GeneralInterceptorService', () => {
  let service: GeneralInterceptorService;
  let httpMock: HttpTestingController;
  let httpClient: HttpClient;
  let authServiceMock: any;
  let greenChecksServiceMock: any;
  let apiServiceMock: any;
  let ipsrCompletenessStatusServiceMock: any;
  let routerMock: any;

  beforeEach(() => {
    authServiceMock = { localStorageToken: 'test-token' };
    greenChecksServiceMock = { getGreenChecks: jest.fn() };
    apiServiceMock = {};
    ipsrCompletenessStatusServiceMock = { updateGreenChecks: jest.fn() };
    routerMock = { url: '/result/result-detail/123/general-information' };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        GeneralInterceptorService,
        { provide: AuthService, useValue: authServiceMock },
        { provide: GreenChecksService, useValue: greenChecksServiceMock },
        { provide: ApiService, useValue: apiServiceMock },
        { provide: IpsrCompletenessStatusService, useValue: ipsrCompletenessStatusServiceMock },
        { provide: Router, useValue: routerMock },
        {
          provide: HTTP_INTERCEPTORS,
          useClass: GeneralInterceptorService,
          multi: true
        }
      ]
    });

    service = TestBed.inject(GeneralInterceptorService);
    httpMock = TestBed.inject(HttpTestingController);
    httpClient = TestBed.inject(HttpClient);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should add auth header for non-elastic and non-blacklisted URLs', () => {
    httpClient.get('/api/some-endpoint').subscribe();
    const httpRequest = httpMock.expectOne('/api/some-endpoint');

    expect(httpRequest.request.headers.has('auth')).toBeTruthy();
    expect(httpRequest.request.headers.get('auth')).toBe('test-token');
  });

  it('should not add auth header for elastic URL', () => {
    httpClient.get(environment.elastic.baseUrl + '/some-endpoint').subscribe();
    const httpRequest = httpMock.expectOne(environment.elastic.baseUrl + '/some-endpoint');

    expect(httpRequest.request.headers.has('auth')).toBeFalsy();
  });

  it('should call getGreenChecks on successful PATCH or POST request when in result-detail route', () => {
    routerMock.url = '/result/result-detail/123/general-information';
    httpClient.post('/api/results/some-endpoint', {}).subscribe();
    const httpRequest = httpMock.expectOne('/api/results/some-endpoint');
    httpRequest.flush({ status: 200 });

    expect(greenChecksServiceMock.getGreenChecks).toHaveBeenCalled();
  });

  it('should not call getGreenChecks when not in result-detail route', () => {
    routerMock.url = '/result/results-list';
    httpClient.post('/api/results/some-endpoint', {}).subscribe();
    const httpRequest = httpMock.expectOne('/api/results/some-endpoint');
    httpRequest.flush({ status: 200 });

    expect(greenChecksServiceMock.getGreenChecks).not.toHaveBeenCalled();
  });

  it('should call updateGreenChecks for IPSR module', () => {
    httpClient.post('/api/ipsr/some-endpoint', {}).subscribe();
    const httpRequest = httpMock.expectOne('/api/ipsr/some-endpoint');
    httpRequest.flush({ status: 200 });

    expect(ipsrCompletenessStatusServiceMock.updateGreenChecks).toHaveBeenCalled();
  });
});
