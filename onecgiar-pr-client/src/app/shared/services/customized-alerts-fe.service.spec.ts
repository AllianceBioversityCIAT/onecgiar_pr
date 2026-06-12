import { TestBed } from '@angular/core/testing';
import { AlertOptions, CustomizedAlertsFeService } from './customized-alerts-fe.service';

describe('CustomizedAlertsFeService', () => {
  let service: CustomizedAlertsFeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CustomizedAlertsFeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('show', () => {
    let appRoot: HTMLElement;
    let mockElements: Record<string, HTMLDivElement>;

    beforeEach(() => {
      appRoot = document.createElement('app-root');
      appRoot.insertAdjacentHTML = jest.fn();
      document.getElementsByTagName = jest.fn().mockReturnValue([appRoot]);

      mockElements = {};
      document.getElementById = jest.fn().mockImplementation((id: string) => {
        if (!mockElements[id]) {
          const el = document.createElement('div');
          el.style.display = '';
          el.classList.add = jest.fn();
          el.classList.contains = jest.fn().mockReturnValue(false);
          el.classList.remove = jest.fn();
          mockElements[id] = el;
        }
        return mockElements[id];
      });
    });

    it('should show alert with confirmText (hides Ok, shows Cancel and Confirm)', () => {
      const alertOptions: AlertOptions = {
        id: 'testId',
        title: 'Test Title',
        description: 'Test Description',
        closeIn: 3000,
        status: 'error',
        confirmText: 'Confirm'
      };
      const callback = jest.fn();

      service.show(alertOptions, callback);

      // confirmText is truthy, so close button is hidden, cancel/confirm shown
      expect(mockElements['close-testId'].style.display).toBe('none');
      expect(mockElements['cancel-testId'].style.display).toBe('block');
      expect(mockElements['confirm-testId'].style.display).toBe('block');
    });

    it('should show alert without confirmText (keeps Ok button visible)', () => {
      const alertOptions: AlertOptions = {
        id: 'testId2',
        title: 'Test Title',
        status: 'success'
      };

      service.show(alertOptions);

      // confirmText is falsy, so close button style is not changed to 'none'
      expect(mockElements['close-testId2'].style.display).not.toBe('none');
    });

    it('should hide cancel button when hideCancelButton is true', () => {
      const alertOptions: AlertOptions = {
        id: 'testId3',
        title: 'Test Title',
        status: 'warning',
        confirmText: 'Yes',
        hideCancelButton: true
      };

      service.show(alertOptions);

      expect(mockElements['cancel-testId3'].style.display).toBe('none');
    });

    it('should not hide cancel button when hideCancelButton is false (default)', () => {
      const alertOptions: AlertOptions = {
        id: 'testId4',
        title: 'Test Title',
        status: 'information',
        confirmText: 'Yes',
        hideCancelButton: false
      };

      service.show(alertOptions);

      // Cancel button should be visible (set to 'block' by confirmText logic)
      expect(mockElements['cancel-testId4'].style.display).toBe('block');
    });

    it('should set up closeIn timeout when closeIn is provided', () => {
      jest.useFakeTimers();
      const closeActionSpy = jest.spyOn(service, 'closeAction');

      const alertOptions: AlertOptions = {
        id: 'testIdTimeout',
        title: 'Test',
        status: 'success',
        closeIn: 3000
      };

      service.show(alertOptions);
      jest.advanceTimersByTime(3000);

      expect(closeActionSpy).toHaveBeenCalledWith('testIdTimeout');
      jest.useRealTimers();
    });

    it('should NOT set up closeIn timeout when closeIn is not provided', () => {
      jest.useFakeTimers();
      const closeActionSpy = jest.spyOn(service, 'closeAction');

      const alertOptions: AlertOptions = {
        id: 'testIdNoTimeout',
        title: 'Test',
        status: 'success'
      };

      service.show(alertOptions);
      jest.advanceTimersByTime(5000);

      // closeAction should not be called by timeout (only by click listeners)
      expect(closeActionSpy).not.toHaveBeenCalled();
      jest.useRealTimers();
    });

    it('should call closeAction on bg click', () => {
      const closeActionSpy = jest.spyOn(service, 'closeAction');

      const alertOptions: AlertOptions = {
        id: 'testBgClick',
        title: 'Test',
        status: 'error'
      };

      service.show(alertOptions);

      // Simulate click on bg element
      const bgEl = mockElements['bg-testBgClick'];
      const clickEvent = new Event('click');
      bgEl.dispatchEvent(clickEvent);

      expect(closeActionSpy).toHaveBeenCalledWith('testBgClick');
    });

    it('should call callback on confirm click', () => {
      const closeActionSpy = jest.spyOn(service, 'closeAction');
      const callback = jest.fn();

      const alertOptions: AlertOptions = {
        id: 'testConfirmClick',
        title: 'Test',
        status: 'error',
        confirmText: 'Confirm'
      };

      service.show(alertOptions, callback);

      // Simulate click on confirm element
      const confirmEl = mockElements['confirm-testConfirmClick'];
      const clickEvent = new Event('click');
      confirmEl.dispatchEvent(clickEvent);

      expect(closeActionSpy).toHaveBeenCalledWith('testConfirmClick');
      expect(callback).toHaveBeenCalled();
    });

    it('should remove alert element on animationend when it has "delete" class', () => {
      const alertOptions: AlertOptions = {
        id: 'testAnimEnd',
        title: 'Test',
        status: 'success'
      };

      // Create a parent and child to enable removeChild
      const parentEl = document.createElement('div');
      const alertEl = document.createElement('div');
      parentEl.appendChild(alertEl);

      mockElements['testAnimEnd'] = alertEl;

      service.show(alertOptions);

      // Add 'delete' class and trigger animationend
      alertEl.classList.add('delete');
      const animEvent = new Event('animationend');
      alertEl.dispatchEvent(animEvent);

      expect(alertEl.style.display).toBe('none');
      expect(parentEl.contains(alertEl)).toBe(false);
    });

    it('should not remove alert element on animationend when it does not have "delete" class', () => {
      const alertOptions: AlertOptions = {
        id: 'testAnimNoDelete',
        title: 'Test',
        status: 'success'
      };

      const alertEl = document.createElement('div');
      mockElements['testAnimNoDelete'] = alertEl;

      service.show(alertOptions);

      // Trigger animationend without 'delete' class
      const animEvent = new Event('animationend');
      alertEl.dispatchEvent(animEvent);

      // Element should still exist (no removal)
      expect(alertEl.style.display).not.toBe('none');
    });
  });

  describe('closeAction', () => {
    it('should add animation classes when elements exist', () => {
      const alertModal = document.createElement('div');
      const alert = document.createElement('div');

      document.getElementById = jest.fn().mockImplementation((id: string) => {
        if (id === 'alert-testClose') return alertModal;
        if (id === 'testClose') return alert;
        return null;
      });

      service.closeAction('testClose');

      expect(alertModal.classList.contains('animate__animated')).toBe(true);
      expect(alertModal.classList.contains('animate__bounceOut')).toBe(true);
      expect(alert.classList.contains('delete')).toBe(true);
    });

    it('should handle null alertModal element', () => {
      document.getElementById = jest.fn().mockImplementation((id: string) => {
        if (id === 'alert-testNull') return null;
        if (id === 'testNull') return document.createElement('div');
        return null;
      });

      // Should not throw
      expect(() => service.closeAction('testNull')).not.toThrow();
    });

    it('should handle null alert element', () => {
      document.getElementById = jest.fn().mockImplementation((id: string) => {
        if (id === 'alert-testNullAlert') return document.createElement('div');
        if (id === 'testNullAlert') return null;
        return null;
      });

      // Should not throw
      expect(() => service.closeAction('testNullAlert')).not.toThrow();
    });

    it('should handle both elements being null', () => {
      document.getElementById = jest.fn().mockReturnValue(null);

      expect(() => service.closeAction('nonexistent')).not.toThrow();
    });
  });
});
