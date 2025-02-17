import { TestBed } from '@angular/core/testing';
import { ClarityService } from './clarity.service';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import Clarity from '@microsoft/clarity';
import { AuthService } from './api/auth.service';

describe('ClarityService', () => {
  let service: ClarityService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule, HttpClientTestingModule],
      providers: [AuthService]
    });
    service = TestBed.inject(ClarityService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('init', () => {
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

    it('should set user info', () => {
      service.authService.localStorageUser = {
        id: 1,
        user_name: 'test',
        email: 'test@test.com'
      };

      const spy = jest.spyOn(service as any, 'setUserInfo');

      service.updateUserInfo();

      expect(spy).toHaveBeenCalled();
    });
  });
});
