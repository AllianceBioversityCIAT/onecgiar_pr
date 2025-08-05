import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { CheckAdminGuard } from './check-admin.guard';
import { AuthService } from '../services/api/auth.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';

describe('CheckAdminGuard', () => {
  let guard: CheckAdminGuard;
  let authService: jest.Mocked<AuthService>;
  let router: Router;

  beforeEach(() => {
    const authServiceMock = {
      GET_allRolesByUser: jest.fn()
    };

    TestBed.configureTestingModule({
      imports: [RouterTestingModule, HttpClientTestingModule],
      providers: [{ provide: AuthService, useValue: authServiceMock }]
    });

    guard = TestBed.inject(CheckAdminGuard);
    authService = TestBed.inject(AuthService) as jest.Mocked<AuthService>;
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });

  it('should return true when user is admin (role_id == 1)', async () => {
    const mockResponse = {
      response: {
        application: {
          role_id: 1
        }
      }
    };
    authService.GET_allRolesByUser.mockReturnValue(of(mockResponse));

    const result = await guard.canActivate();

    expect(result).toBe(true);
    expect(authService.GET_allRolesByUser).toHaveBeenCalled();
  });

  it('should return false and navigate to results when user is not admin (role_id != 1)', async () => {
    const mockResponse = {
      response: {
        application: {
          role_id: 2
        }
      }
    };
    authService.GET_allRolesByUser.mockReturnValue(of(mockResponse));
    const routerSpy = jest.spyOn(router, 'navigate');

    const result = await guard.canActivate();

    expect(result).toBe(false);
    expect(authService.GET_allRolesByUser).toHaveBeenCalled();
    expect(routerSpy).toHaveBeenCalledWith(['/result/results-outlet/results-list']);
  });

  it('should return false and navigate to results when user role_id is null', async () => {
    const mockResponse = {
      response: {
        application: {
          role_id: null
        }
      }
    };
    authService.GET_allRolesByUser.mockReturnValue(of(mockResponse));
    const routerSpy = jest.spyOn(router, 'navigate');

    const result = await guard.canActivate();

    expect(result).toBe(false);
    expect(authService.GET_allRolesByUser).toHaveBeenCalled();
    expect(routerSpy).toHaveBeenCalledWith(['/result/results-outlet/results-list']);
  });

  it('should return false and navigate to results when response.application is null', async () => {
    const mockResponse = {
      response: {
        application: null
      }
    };
    authService.GET_allRolesByUser.mockReturnValue(of(mockResponse));
    const routerSpy = jest.spyOn(router, 'navigate');

    const result = await guard.canActivate();

    expect(result).toBe(false);
    expect(authService.GET_allRolesByUser).toHaveBeenCalled();
    expect(routerSpy).toHaveBeenCalledWith(['/result/results-outlet/results-list']);
  });

  it('should return false and navigate to results when response is null', async () => {
    const mockResponse = {
      response: null
    };
    authService.GET_allRolesByUser.mockReturnValue(of(mockResponse));
    const routerSpy = jest.spyOn(router, 'navigate');

    const result = await guard.canActivate();

    expect(result).toBe(false);
    expect(authService.GET_allRolesByUser).toHaveBeenCalled();
    expect(routerSpy).toHaveBeenCalledWith(['/result/results-outlet/results-list']);
  });

  it('should handle service error and throw error', async () => {
    const errorMessage = 'Network error';
    authService.GET_allRolesByUser.mockReturnValue(throwError(() => new Error(errorMessage)));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    try {
      await guard.canActivate();
      // If we reach here, the test should fail
      expect(true).toBe(false);
    } catch (error) {
      expect(error.message).toBe('Failed to get user roles');
      expect(authService.GET_allRolesByUser).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(new Error(errorMessage));
    }
  });

  it('should handle service error with custom error message and throw error', async () => {
    authService.GET_allRolesByUser.mockReturnValue(throwError(() => new Error('Server error')));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    try {
      await guard.canActivate();
      // If we reach here, the test should fail
      expect(true).toBe(false);
    } catch (error) {
      expect(error.message).toBe('Failed to get user roles');
      expect(consoleSpy).toHaveBeenCalled();
    }
  });
});
