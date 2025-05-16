import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('POST_cognitoAuth', () => {
    it('should call POST_cognitoAuth and return expected data', done => {
      const mockBody = { email: 'test@example.com', password: 'password123' };
      const mockResponse = { response: { token: 'test-token', user: {} } };

      service.POST_cognitoAuth(mockBody).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}login/custom`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(mockBody);

      req.flush(mockResponse);
    });
  });
});
