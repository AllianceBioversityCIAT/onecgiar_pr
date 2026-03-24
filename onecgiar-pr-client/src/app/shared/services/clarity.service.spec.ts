import { TestBed } from '@angular/core/testing';
import { ClarityService } from './clarity.service';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import Clarity from '@microsoft/clarity';
import { AuthService } from './api/auth.service';
import { Router, NavigationEnd } from '@angular/router';
import { Subject } from 'rxjs';

describe('ClarityService', () => {
  let service: ClarityService;

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();

    TestBed.configureTestingModule({
      imports: [RouterTestingModule, HttpClientTestingModule],
      providers: [AuthService]
    });
    service = TestBed.inject(ClarityService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('init', () => {
    beforeEach(() => {
      // Reset initialized state before each init test
      (service as any).initialized = false;
    });

    it('should initialize Clarity only once', () => {
      const spy = jest.spyOn(service as any, 'initClarity');

      service.init();
      service.init(); // Second call should not reinitialize

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should handle initialization error', () => {
      const consoleSpy = jest.spyOn(console, 'error');
      jest.spyOn(service as any, 'initClarity').mockImplementation(() => {
        throw new Error('Init error');
      });

      service.init();

      expect(consoleSpy).toHaveBeenCalledWith('Failed to initialize Clarity:', expect.any(Error));
    });

    it('should call initClarity, setupRouteTracking, and setUserInfo on success', () => {
      const initClaritySpy = jest.spyOn(service as any, 'initClarity').mockImplementation();
      const setupRouteTrackingSpy = jest.spyOn(service as any, 'setupRouteTracking').mockImplementation();
      const setUserInfoSpy = jest.spyOn(service as any, 'setUserInfo').mockImplementation();

      service.init();

      expect(initClaritySpy).toHaveBeenCalled();
      expect(setupRouteTrackingSpy).toHaveBeenCalled();
      expect(setUserInfoSpy).toHaveBeenCalled();
      expect((service as any).initialized).toBe(true);
    });

    it('should not re-initialize if already initialized', () => {
      const initClaritySpy = jest.spyOn(service as any, 'initClarity').mockImplementation();
      jest.spyOn(service as any, 'setupRouteTracking').mockImplementation();
      jest.spyOn(service as any, 'setUserInfo').mockImplementation();

      service.init();
      service.init();

      expect(initClaritySpy).toHaveBeenCalledTimes(1);
    });

    it('should handle error when initClarity throws', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      jest.spyOn(service as any, 'initClarity').mockImplementation(() => {
        throw new Error('init failed');
      });

      service.init();

      expect((service as any).initialized).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Failed to initialize Clarity:', expect.any(Error));
    });
  });

  describe('trackEvent', () => {
    it('should track event without data', () => {
      const eventName = 'test_event';
      service.trackEvent(eventName);
      // Add assertions if needed
    });

    it('should track event with data', () => {
      const eventName = 'test_event';
      const eventData = { key: 'value' };
      service.trackEvent(eventName, eventData);
      // Add assertions if needed
    });

    it('should handle tracking error', () => {
      const consoleSpy = jest.spyOn(console, 'error');
      const error = new Error('Tracking error');
      jest.spyOn(Clarity, 'event').mockImplementation(() => {
        throw error;
      });

      service.trackEvent('test');

      expect(consoleSpy).toHaveBeenCalledWith('Error tracking event:', error);
    });
  });

  describe('setTags', () => {
    it('should set multiple tags', () => {
      const tags = { tag1: 'value1', tag2: 'value2' };
      service.setTags(tags);
      // Add assertions if needed
    });

    it('should handle error when setting tags', () => {
      const consoleSpy = jest.spyOn(console, 'error');
      const error = new Error('Tag error');
      jest.spyOn(Clarity, 'setTag').mockImplementation(() => {
        throw error;
      });

      service.setTags({ test: 'value' });

      expect(consoleSpy).toHaveBeenCalledWith('Error setting tags:', error);
    });
  });

  describe('upgradeSession', () => {
    it('should upgrade session with reason', () => {
      const reason = 'test reason';
      service.upgradeSession(reason);
      // Add assertions if needed
    });

    it('should handle upgrade error', () => {
      const consoleSpy = jest.spyOn(console, 'error');
      const error = new Error('Upgrade error');
      jest.spyOn(Clarity, 'upgrade').mockImplementation(() => {
        throw error;
      });

      service.upgradeSession('test');

      expect(consoleSpy).toHaveBeenCalledWith('Error upgrading session:', error);
    });
  });

  describe('setCookieConsent', () => {
    it('should set cookie consent', () => {
      service.setCookieConsent(true);
      service.setCookieConsent(false);
      // Add assertions if needed
    });

    it('should handle consent error', () => {
      const consoleSpy = jest.spyOn(console, 'error');
      const error = new Error('Consent error');
      jest.spyOn(Clarity, 'consent').mockImplementation(() => {
        throw error;
      });

      service.setCookieConsent(true);

      expect(consoleSpy).toHaveBeenCalledWith('Error setting cookie consent:', error);
    });
  });

  describe('updateUserInfo', () => {
    it('should call setUserInfo', () => {
      const spy = jest.spyOn(service as any, 'setUserInfo');

      service.updateUserInfo();

      expect(spy).toHaveBeenCalled();
    });

    it('should set user info when localStorageUser is present', () => {
      service.authService.localStorageUser = {
        id: 1,
        user_name: 'test',
        email: 'test@test.com'
      };
      const setTagMock = jest.fn();
      Clarity.setTag = setTagMock;

      service.updateUserInfo();

      expect(setTagMock).toHaveBeenCalledWith('user_id', 'test');
      expect(setTagMock).toHaveBeenCalledWith('user_email', 'test@test.com');
      expect(setTagMock).toHaveBeenCalledWith('id', '1');
    });

    it('should not call Clarity.setTag when localStorageUser is null', () => {
      service.authService.localStorageUser = null;
      const setTagMock = jest.fn();
      Clarity.setTag = setTagMock;

      service.updateUserInfo();

      expect(setTagMock).not.toHaveBeenCalled();
    });

    it('should use empty string fallback when email is falsy', () => {
      service.authService.localStorageUser = {
        id: 1,
        user_name: 'test',
        email: ''
      };
      const setTagMock = jest.fn();
      Clarity.setTag = setTagMock;

      service.updateUserInfo();

      expect(setTagMock).toHaveBeenCalledWith('user_email', '');
    });

    it('should use empty string fallback when email is null', () => {
      service.authService.localStorageUser = {
        id: 1,
        user_name: 'test',
        email: null
      };
      const setTagMock = jest.fn();
      Clarity.setTag = setTagMock;

      service.updateUserInfo();

      expect(setTagMock).toHaveBeenCalledWith('user_email', '');
    });

    it('should handle error when setting user info throws', () => {
      const consoleSpy = jest.spyOn(console, 'error');
      service.authService.localStorageUser = {
        id: 1,
        user_name: 'test',
        email: 'test@test.com'
      };
      jest.spyOn(Clarity, 'setTag').mockImplementation(() => {
        throw new Error('setTag error');
      });

      service.updateUserInfo();

      expect(consoleSpy).toHaveBeenCalledWith('Error setting user info:', expect.any(Error));
    });
  });

  describe('setupRouteTracking', () => {
    it('should set page tag on NavigationEnd', async () => {
      const setTagMock = jest.fn();
      Clarity.setTag = setTagMock;

      (service as any).setupRouteTracking();

      const router = TestBed.inject(Router);
      await router.navigate(['/']);

      expect(setTagMock).toHaveBeenCalledWith('page', expect.any(String));
    });

    it('should handle error when Clarity.setTag throws during page tracking', async () => {
      const consoleSpy = jest.spyOn(console, 'error');
      Clarity.setTag = jest.fn().mockImplementation(() => {
        throw new Error('setTag error');
      });

      (service as any).setupRouteTracking();

      const router = TestBed.inject(Router);
      await router.navigate(['/']);

      expect(consoleSpy).toHaveBeenCalledWith('Error tracking page view:', expect.any(Error));
    });

    it('should log error when router events observable errors', () => {
      const consoleSpy = jest.spyOn(console, 'error');
      const mockEventsSubject = new Subject<any>();

      // Override router.events with our controllable subject
      Object.defineProperty(service, 'router', {
        value: { events: mockEventsSubject.asObservable() },
        writable: true
      });

      (service as any).setupRouteTracking();

      // Emit an error on the observable
      mockEventsSubject.error(new Error('router error'));

      expect(consoleSpy).toHaveBeenCalledWith('Error in route tracking subscription:', expect.any(Error));
    });
  });

  describe('initClarity', () => {
    it('should throw error when Clarity.init fails', () => {
      const consoleSpy = jest.spyOn(console, 'error');
      jest.spyOn(Clarity, 'init').mockImplementation(() => {
        throw new Error('init failed');
      });

      expect(() => (service as any).initClarity()).toThrow('init failed');
      expect(consoleSpy).toHaveBeenCalledWith('Error initializing Clarity:', expect.any(Error));
    });
  });
});
