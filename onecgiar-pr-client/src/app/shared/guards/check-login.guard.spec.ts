import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { CheckLoginGuard } from './check-login.guard';
import { AuthService } from '../services/api/auth.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('CheckLoginGuard', () => {
  let guard: CheckLoginGuard;
  let authService: jest.Mocked<AuthService>;
  let router: Router;

  beforeEach(() => {
    const authServiceMock = {
      localStorageToken: null
    };

    TestBed.configureTestingModule({
      imports: [RouterTestingModule, HttpClientTestingModule],
      providers: [{ provide: AuthService, useValue: authServiceMock }]
    });

    guard = TestBed.inject(CheckLoginGuard);
    authService = TestBed.inject(AuthService) as jest.Mocked<AuthService>;
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });

  it('should return true when localStorageToken exists', () => {
    // Mock the getter to return a token
    Object.defineProperty(authService, 'localStorageToken', {
      get: jest.fn(() => 'valid-token-123'),
      configurable: true
    });

    const result = guard.canActivate();

    expect(result).toBe(true);
  });

  it('should return false and navigate to login when localStorageToken does not exist', () => {
    // Mock the getter to return null
    Object.defineProperty(authService, 'localStorageToken', {
      get: jest.fn(() => null),
      configurable: true
    });
    const routerSpy = jest.spyOn(router, 'navigate');

    const result = guard.canActivate();

    expect(result).toBe(false);
    expect(routerSpy).toHaveBeenCalledWith(['/login']);
  });

  it('should return false and navigate to login when localStorageToken is undefined', () => {
    // Mock the getter to return undefined
    Object.defineProperty(authService, 'localStorageToken', {
      get: jest.fn(() => undefined),
      configurable: true
    });
    const routerSpy = jest.spyOn(router, 'navigate');

    const result = guard.canActivate();

    expect(result).toBe(false);
    expect(routerSpy).toHaveBeenCalledWith(['/login']);
  });

  it('should return false and navigate to login when localStorageToken is empty string', () => {
    // Mock the getter to return empty string
    Object.defineProperty(authService, 'localStorageToken', {
      get: jest.fn(() => ''),
      configurable: true
    });
    const routerSpy = jest.spyOn(router, 'navigate');

    const result = guard.canActivate();

    expect(result).toBe(false);
    expect(routerSpy).toHaveBeenCalledWith(['/login']);
  });

  it('should return true when localStorageToken is a valid string token', () => {
    // Mock the getter to return a valid token
    Object.defineProperty(authService, 'localStorageToken', {
      get: jest.fn(() => 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'),
      configurable: true
    });

    const result = guard.canActivate();

    expect(result).toBe(true);
  });

  it('should return true when localStorageToken has whitespace but is not empty', () => {
    // Mock the getter to return a token with spaces
    Object.defineProperty(authService, 'localStorageToken', {
      get: jest.fn(() => '  valid-token  '),
      configurable: true
    });

    const result = guard.canActivate();

    expect(result).toBe(true);
  });
});
