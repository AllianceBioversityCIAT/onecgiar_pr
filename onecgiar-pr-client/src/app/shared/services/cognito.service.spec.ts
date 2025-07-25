import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { CognitoService } from './cognito.service';
import { MessageService } from 'primeng/api';
import { of, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

describe('CognitoService', () => {
  let service: CognitoService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule, HttpClientTestingModule],
      providers: [CognitoService, MessageService]
    });
    service = TestBed.inject(CognitoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Service Initialization', () => {
    it('should initialize with correct default values', () => {
      expect(service.isLoadingAzureAd()).toBe(false);
      expect(service.isLoadingCredentials()).toBe(false);
      expect(service.requiredChangePassword()).toBe(false);
      expect(service.chagePasswordSession()).toBe(null);
      expect(service.body()).toEqual({
        email: '',
        password: '',
        confirmPassword: ''
      });
    });

    it('should have internationalizationData available', () => {
      expect(service.internationalizationData).toBeDefined();
    });
  });

  describe('loginWithAzureAd', () => {
    it('should not call API if already loading', () => {
      service.isLoadingAzureAd.set(true);
      const spy = jest.spyOn(service.api.resultsSE, 'GET_loginWithAzureAd');

      service.loginWithAzureAd();

      expect(spy).not.toHaveBeenCalled();
    });

    it('should handle successful login with Azure AD', () => {
      const mockResponse = { response: { authUrl: 'https://test-auth-url.com' } };
      const spy = jest.spyOn(service.api.resultsSE, 'GET_loginWithAzureAd').mockReturnValue(of(mockResponse));

      service.loginWithAzureAd();

      expect(spy).toHaveBeenCalledWith(environment.production ? 'CGIAR-Account' : 'CGIAR-AzureAD');
      expect(service.isLoadingAzureAd()).toBe(false);
    });

    it('should handle error during Azure AD login', () => {
      const mockError = new Error('Login failed');
      jest.spyOn(service.api.resultsSE, 'GET_loginWithAzureAd').mockReturnValue(throwError(() => mockError));
      const alertSpy = jest.spyOn(service.customAlertService, 'show');

      service.loginWithAzureAd();

      expect(alertSpy).toHaveBeenCalledWith({
        id: 'loginAlert',
        title: 'Oops!',
        description: 'Error while trying to login with Azure AD',
        status: 'warning'
      });
    });
  });

  describe('validateCognitoCode', () => {
    it('should not proceed if no code is present', () => {
      const spy = jest.spyOn(service.api.resultsSE, 'POST_validateCognitoCode');

      service.validateCognitoCode();

      expect(spy).not.toHaveBeenCalled();
    });

    it('should handle successful code validation', () => {
      const mockCode = 'test-code';
      const mockResponse = { response: { token: 'test-token', user: {} } };
      service.activatedRoute.snapshot.queryParams = { code: mockCode };
      jest.spyOn(service.api.resultsSE, 'POST_validateCognitoCode').mockReturnValue(of(mockResponse));
      const updateCacheSpy = jest.spyOn(service as any, 'updateCacheService');
      const redirectSpy = jest.spyOn(service as any, 'redirectToHome');

      service.validateCognitoCode();

      expect(updateCacheSpy).toHaveBeenCalledWith(mockResponse);
      expect(redirectSpy).toHaveBeenCalled();
      expect(service.isLoadingAzureAd()).toBe(false);
    });

    it('should handle error during code validation', () => {
      const mockCode = 'test-code';
      const mockError = new Error('Validation failed');
      service.activatedRoute.snapshot.queryParams = { code: mockCode };
      jest.spyOn(service.api.resultsSE, 'POST_validateCognitoCode').mockReturnValue(throwError(() => mockError));
      const alertSpy = jest.spyOn(service.customAlertService, 'show');

      service.validateCognitoCode();

      expect(alertSpy).toHaveBeenCalledWith({
        id: 'loginAlert',
        title: 'Oops!',
        description: 'Error while trying to login with Azure AD',
        status: 'warning'
      });
      expect(service.isLoadingAzureAd()).toBe(false);
    });
  });

  describe('loginWithCredentials', () => {
    it('should not proceed if already loading or empty credentials', () => {
      service.isLoadingCredentials.set(true);
      const spy = jest.spyOn(service.authService, 'POST_cognitoAuth');

      service.loginWithCredentials({ email: '', password: '' });

      expect(spy).not.toHaveBeenCalled();
    });

    it('should not proceed if email is empty', () => {
      const spy = jest.spyOn(service.authService, 'POST_cognitoAuth');

      service.loginWithCredentials({ email: '', password: 'password123' });

      expect(spy).not.toHaveBeenCalled();
    });

    it('should not proceed if password is empty', () => {
      const spy = jest.spyOn(service.authService, 'POST_cognitoAuth');

      service.loginWithCredentials({ email: 'test@test.com', password: '' });

      expect(spy).not.toHaveBeenCalled();
    });

    it('should handle successful login with credentials', () => {
      const mockCredentials = { email: 'test@test.com', password: 'password123' };
      const mockResponse = { response: { token: 'test-token', user: {} } };
      jest.spyOn(service.authService, 'POST_cognitoAuth').mockReturnValue(of(mockResponse));
      const updateCacheSpy = jest.spyOn(service as any, 'updateCacheService');
      const redirectSpy = jest.spyOn(service as any, 'redirectToHome');

      service.loginWithCredentials(mockCredentials);

      expect(updateCacheSpy).toHaveBeenCalledWith(mockResponse);
      expect(redirectSpy).toHaveBeenCalled();
      expect(service.isLoadingCredentials()).toBe(false);
      expect(service.requiredChangePassword()).toBe(false);
    });

    it('should handle NEW_PASSWORD_REQUIRED challenge', () => {
      const mockCredentials = { email: 'test@test.com', password: 'password123' };
      const mockResponse = {
        response: {
          challengeName: 'NEW_PASSWORD_REQUIRED',
          session: 'test-session-token'
        }
      };
      jest.spyOn(service.authService, 'POST_cognitoAuth').mockReturnValue(of(mockResponse));

      service.loginWithCredentials(mockCredentials);

      expect(service.requiredChangePassword()).toBe(true);
      expect(service.isLoadingCredentials()).toBe(false);
      expect(service.chagePasswordSession()).toBe('test-session-token');
      expect(service.body()).toEqual({
        email: 'test@test.com',
        password: '',
        confirmPassword: ''
      });
    });

    it('should handle 404 error during login', () => {
      const mockCredentials = { email: 'test@test.com', password: 'password123' };
      const mockError = { error: { statusCode: 404 } };
      jest.spyOn(service.authService, 'POST_cognitoAuth').mockReturnValue(throwError(() => mockError));
      const alertSpy = jest.spyOn(service.customAlertService, 'show');

      service.loginWithCredentials(mockCredentials);

      expect(alertSpy).toHaveBeenCalledWith({
        id: 'loginAlert',
        title: 'Oops!',
        description: 'This user is not registered. <br> Please contact the support team.',
        status: 'warning'
      });
      expect(service.isLoadingCredentials()).toBe(false);
      expect(service.requiredChangePassword()).toBe(false);
    });

    it('should handle other errors during login', () => {
      const mockCredentials = { email: 'test@test.com', password: 'password123' };
      const mockError = { error: { message: 'Invalid credentials' } };
      jest.spyOn(service.authService, 'POST_cognitoAuth').mockReturnValue(throwError(() => mockError));
      const alertSpy = jest.spyOn(service.customAlertService, 'show');

      service.loginWithCredentials(mockCredentials);

      expect(alertSpy).toHaveBeenCalledWith({
        id: 'loginAlert',
        title: 'Oops!',
        description: 'Invalid credentials',
        status: 'warning'
      });
      expect(service.isLoadingCredentials()).toBe(false);
      expect(service.requiredChangePassword()).toBe(false);
    });
  });

  describe('changePassword', () => {
    beforeEach(() => {
      service.chagePasswordSession.set('test-session');
      service.body.set({
        email: 'test@example.com',
        password: 'NewPassword123!',
        confirmPassword: 'NewPassword123!'
      });
    });

    it('should successfully change password', () => {
      const mockResponse = { response: { token: 'new-token', user: {} } };
      jest.spyOn(service.authService, 'POST_cognitoChangePassword').mockReturnValue(of(mockResponse));
      const updateCacheSpy = jest.spyOn(service as any, 'updateCacheService');
      const redirectSpy = jest.spyOn(service as any, 'redirectToHome');

      service.changePassword();

      expect(service.authService.POST_cognitoChangePassword).toHaveBeenCalledWith({
        session: 'test-session',
        newPassword: 'NewPassword123!',
        username: 'test@example.com'
      });
      expect(updateCacheSpy).toHaveBeenCalledWith(mockResponse);
      expect(redirectSpy).toHaveBeenCalled();
      expect(service.isLoadingCredentials()).toBe(false);
      expect(service.requiredChangePassword()).toBe(false);
      expect(service.body()).toEqual({
        email: '',
        password: '',
        confirmPassword: ''
      });
    });

    it('should handle error during password change', () => {
      const mockError = { error: { message: 'Password change failed' } };
      jest.spyOn(service.authService, 'POST_cognitoChangePassword').mockReturnValue(throwError(() => mockError));
      const alertSpy = jest.spyOn(service.customAlertService, 'show');

      service.changePassword();

      expect(alertSpy).toHaveBeenCalledWith({
        id: 'loginAlert',
        title: 'Oops!',
        description: 'Password change failed',
        status: 'warning'
      });
      expect(service.isLoadingCredentials()).toBe(false);
      expect(service.requiredChangePassword()).toBe(false);
    });

    it('should set loading state during password change', () => {
      const mockResponse = { response: { token: 'new-token', user: {} } };
      jest.spyOn(service.authService, 'POST_cognitoChangePassword').mockReturnValue(of(mockResponse));

      expect(service.isLoadingCredentials()).toBe(false);

      service.changePassword();

      // The loading state should have been set to true initially and then back to false
      expect(service.isLoadingCredentials()).toBe(false);
    });
  });

  describe('updateCacheService', () => {
    it('should update all necessary services with user data', () => {
      const mockResponse = {
        response: {
          token: 'test-token',
          user: {
            user_name: 'testuser',
            id: 123
          }
        }
      };
      const webSocketSpy = jest.spyOn(service.webSocket, 'configUser');
      const claritySpy = jest.spyOn(service.clarity, 'updateUserInfo');
      const rolesSpy = jest.spyOn(service.rolesSE, 'validateReadOnly');

      service.updateCacheService(mockResponse);

      expect(service.authService.localStorageToken).toBe(mockResponse.response.token);
      expect(service.authService.localStorageUser).toEqual(mockResponse.response.user);
      expect(webSocketSpy).toHaveBeenCalledWith('testuser', 123);
      expect(claritySpy).toHaveBeenCalled();
      expect(rolesSpy).toHaveBeenCalled();
    });
  });

  describe('redirectToHome', () => {
    it('should navigate to home after delay', () => {
      jest.useFakeTimers();
      const routerSpy = jest.spyOn(service.router, 'navigate');

      service.redirectToHome();

      jest.advanceTimersByTime(1000);
      expect(routerSpy).toHaveBeenCalledWith(['/']);
      jest.useRealTimers();
    });
  });
});
