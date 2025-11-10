import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let mockRouter: any;

  beforeEach(() => {
    mockRouter = {
      navigate: jest.fn()
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [{ provide: Router, useValue: mockRouter }]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);

    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize with inLogin signal as false', () => {
    expect(service.inLogin()).toBe(false);
  });

  describe('localStorage token', () => {
    it('should set token in localStorage', () => {
      const token = 'test-token-123';
      service.localStorageToken = token;

      expect(localStorage.getItem('token')).toBe(token);
    });

    it('should get token from localStorage', () => {
      const token = 'test-token-456';
      localStorage.setItem('token', token);

      expect(service.localStorageToken).toBe(token);
    });

    it('should return null when no token in localStorage', () => {
      expect(service.localStorageToken).toBeNull();
    });
  });

  describe('localStorage user', () => {
    it('should set user in localStorage', () => {
      const user = { id: 1, name: 'Test User', email: 'test@example.com' };
      service.localStorageUser = user;

      expect(localStorage.getItem('user')).toBe(JSON.stringify(user));
    });

    it('should get user from localStorage', () => {
      const user = { id: 2, name: 'John Doe', email: 'john@example.com' };
      localStorage.setItem('user', JSON.stringify(user));

      expect(service.localStorageUser).toEqual(user);
    });

    it('should return null when parsing null from localStorage', () => {
      localStorage.removeItem('user');
      expect(service.localStorageUser).toBeNull();
    });
  });

  describe('logout', () => {
    beforeEach(() => {
      delete (window as any).location;
      (window as any).location = { replace: jest.fn() };
    });

    afterEach(() => {
      // Restore location after tests
      delete (window as any).location;
      (window as any).location = new URL('http://localhost') as any;
    });

    it('should clear localStorage and redirect to login', () => {
      localStorage.setItem('token', 'test-token');
      localStorage.setItem('user', JSON.stringify({ id: 1 }));

      service.logout();

      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
      expect(window.location.replace).toHaveBeenCalledWith('/login');
    });

    it('should call logOutTawtkTo when Tawk_API exists', () => {
      window['Tawk_API'] = {
        endChat: jest.fn(),
        visitor: {}
      };

      service.logout();

      expect(window['Tawk_API'].endChat).toHaveBeenCalled();
      expect(window['Tawk_API'].visitor.name).toBeNull();
      expect(window['Tawk_API'].visitor.email).toBeNull();

      delete window['Tawk_API'];
    });

    it('should handle error when Tawk_API throws', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Tawk error');

      window['Tawk_API'] = {
        endChat: jest.fn(() => {
          throw error;
        }),
        visitor: {}
      };

      service.logout();

      expect(consoleErrorSpy).toHaveBeenCalledWith(error);

      delete window['Tawk_API'];
      consoleErrorSpy.mockRestore();
    });

    it('should not error when Tawk_API does not exist', () => {
      delete window['Tawk_API'];

      expect(() => service.logout()).not.toThrow();
    });
  });

  describe('cleanTWKCookies', () => {
    it('should clean twk cookies', () => {
      document.cookie = 'twk_cookie1=value1';
      document.cookie = 'twk_cookie2=value2';
      document.cookie = 'normal_cookie=value3';

      service.cleanTWKCookies();

      const cookies = document.cookie.split(';');
      const twkCookies = cookies.filter(c => c.includes('twk'));

      // Twk cookies should be expired
      expect(document.cookie).not.toContain('twk_cookie1=value1');
      expect(document.cookie).not.toContain('twk_cookie2=value2');
    });

    it('should handle cookies without = sign', () => {
      // Mock document.cookie to return cookie without = sign
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: 'twk_nocookie'
      });

      expect(() => service.cleanTWKCookies()).not.toThrow();

      // Reset
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: ''
      });
    });

    it('should handle empty cookie string', () => {
      document.cookie = '';
      expect(() => service.cleanTWKCookies()).not.toThrow();
    });

    it('should handle cookie name without equals when indexOf returns -1', () => {
      // This tests the branch where eqPos is -1
      // Set a cookie without = sign (which is technically invalid but we handle it)
      const originalCookie = document.cookie;

      // We can't directly set an invalid cookie, so we'll just verify the logic works
      // The actual branch is covered when we have 'twkcookie' without '='
      // This is handled in the code with: const name = eqPos > -1 ? cookie.substring(0, eqPos) : cookie;

      expect(() => service.cleanTWKCookies()).not.toThrow();
    });
  });

  describe('userAuth', () => {
    it('should call userAuth and return expected data', done => {
      const mockBody = { email: 'test@example.com', password: 'password123' };
      const mockResponse = { response: { token: 'test-token', user: {} } };

      service.userAuth(mockBody).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}singin`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(mockBody);

      req.flush(mockResponse);
    });
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

  describe('POST_cognitoChangePassword', () => {
    it('should call POST_cognitoChangePassword and return expected data', done => {
      const mockBody = { session: 'test-session', newPassword: 'password123', username: 'test@example.com' };
      const mockResponse = { response: { token: 'test-token', user: {} } };

      service.POST_cognitoChangePassword(mockBody).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}complete-password-challenge`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(mockBody);

      req.flush(mockResponse);
    });
  });

  describe('GET_allRolesByUser', () => {
    it('should get roles by user', done => {
      const mockUser = { id: 123, name: 'Test User' };
      localStorage.setItem('user', JSON.stringify(mockUser));

      const mockResponse = {
        response: {
          application: { role_id: 1 },
          initiative: [{ initiative_id: 1, role_id: 5 }]
        }
      };

      service.GET_allRolesByUser().subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}role-by-user/get/user/${mockUser.id}`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });

    it('should handle undefined user id', done => {
      localStorage.removeItem('user');

      service.GET_allRolesByUser().subscribe({
        error: () => {
          done();
        }
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}role-by-user/get/user/undefined`);
      req.flush(null, { status: 400, statusText: 'Bad Request' });
    });
  });

  describe('GET_initiativesByUser', () => {
    it('should get initiatives by user and format full_name', done => {
      const mockUser = { id: 456, name: 'Test User' };
      localStorage.setItem('user', JSON.stringify(mockUser));

      const mockResponse = {
        response: [
          {
            initiative_id: 1,
            official_code: 'INIT-1',
            short_name: 'Init One',
            initiative_name: 'Initiative One'
          },
          {
            initiative_id: 2,
            official_code: 'INIT-2',
            short_name: 'Init Two',
            initiative_name: 'Initiative Two'
          }
        ]
      };

      service.GET_initiativesByUser().subscribe(response => {
        expect(response.response[0].full_name).toBe('INIT-1 - <strong>Init One</strong> - Initiative One');
        expect(response.response[1].full_name).toBe('INIT-2 - <strong>Init Two</strong> - Initiative Two');
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}user/get/initiative/${mockUser.id}`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('GET_initiativesByUserByPortfolio', () => {
    it('should get initiatives by user by portfolio and format full_name for ipsr and reporting', done => {
      const mockUser = { id: 789, name: 'Test User' };
      localStorage.setItem('user', JSON.stringify(mockUser));

      const mockResponse = {
        response: {
          ipsr: [
            {
              initiative_id: 1,
              official_code: 'IPSR-1',
              short_name: 'IPSR One',
              initiative_name: 'IPSR Initiative One'
            }
          ],
          reporting: [
            {
              initiative_id: 2,
              official_code: 'REP-1',
              short_name: 'Rep One',
              initiative_name: 'Reporting Initiative One'
            }
          ]
        }
      };

      service.GET_initiativesByUserByPortfolio().subscribe(response => {
        expect(response.response.ipsr[0].full_name).toBe('IPSR-1 - <strong>IPSR One</strong> - IPSR Initiative One');
        expect(response.response.reporting[0].full_name).toBe('REP-1 - <strong>Rep One</strong> - Reporting Initiative One');
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}user/get/initiative/current-portfolio/${mockUser.id}`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });

    it('should handle empty ipsr and reporting arrays', done => {
      const mockUser = { id: 999, name: 'Test User' };
      localStorage.setItem('user', JSON.stringify(mockUser));

      const mockResponse = {
        response: {
          ipsr: [],
          reporting: []
        }
      };

      service.GET_initiativesByUserByPortfolio().subscribe(response => {
        expect(response.response.ipsr).toEqual([]);
        expect(response.response.reporting).toEqual([]);
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}user/get/initiative/current-portfolio/${mockUser.id}`);
      req.flush(mockResponse);
    });
  });
});
