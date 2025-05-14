import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpClient, HTTP_INTERCEPTORS } from '@angular/common/http';
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

  beforeEach(() => {
    authServiceMock = { localStorageToken: 'test-token' };
    greenChecksServiceMock = { updateGreenChecks: jest.fn() };
    apiServiceMock = {};
    ipsrCompletenessStatusServiceMock = { updateGreenChecks: jest.fn() };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        GeneralInterceptorService,
        { provide: AuthService, useValue: authServiceMock },
        { provide: GreenChecksService, useValue: greenChecksServiceMock },
        { provide: ApiService, useValue: apiServiceMock },
        { provide: IpsrCompletenessStatusService, useValue: ipsrCompletenessStatusServiceMock },
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

  it('should update green checks on successful PATCH or POST request', () => {
    httpClient.post('/api/results/some-endpoint', {}).subscribe();
    const httpRequest = httpMock.expectOne('/api/results/some-endpoint');
    httpRequest.flush({ status: 200 });

    expect(greenChecksServiceMock.updateGreenChecks).toHaveBeenCalled();
  });
});
