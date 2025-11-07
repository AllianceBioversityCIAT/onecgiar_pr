import { TestBed } from '@angular/core/testing';
import { CustomizedAlertsFsService } from './customized-alerts-fs.service';

describe('CustomizedAlertsFsService', () => {
  let service: CustomizedAlertsFsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CustomizedAlertsFsService);

    // Clean up any existing alerts before each test
    document.body.innerHTML = '';
  });

  afterEach(() => {
    // Clean up after each test
    document.body.innerHTML = '';
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize with showed as false', () => {
    expect(service.showed).toBe(false);
  });

  describe('show', () => {
    it('should create and insert an alert element with error status', () => {
      // Create a container element
      const container = document.createElement('div');
      container.id = 'test-container';
      document.body.appendChild(container);

      const alertOptions = {
        id: 'test-alert',
        title: 'Test Title',
        description: 'Test Description',
        status: 'error' as const,
        querySelector: '#test-container',
        position: 'beforeend' as const
      };

      service.show(alertOptions);

      expect(service.showed).toBe(true);
      const alert = document.getElementById('test-alert');
      expect(alert).toBeTruthy();
      expect(alert?.querySelector('.text')?.textContent).toBe('Test Description');
      expect(alert?.querySelector('.icon')?.textContent).toBe('info');
    });

    it('should create and insert an alert element with success status', () => {
      const container = document.createElement('div');
      container.id = 'success-container';
      document.body.appendChild(container);

      const alertOptions = {
        id: 'success-alert',
        title: 'Success Title',
        description: 'Success Description',
        status: 'success' as const,
        querySelector: '#success-container',
        position: 'afterbegin' as const
      };

      service.show(alertOptions);

      expect(service.showed).toBe(true);
      const alert = document.getElementById('success-alert');
      expect(alert).toBeTruthy();
      expect(alert?.querySelector('.text')?.textContent).toBe('Success Description');
    });

    it('should insert alert at different positions', () => {
      const container = document.createElement('div');
      container.id = 'position-container';
      container.innerHTML = '<div id="existing">Existing</div>';
      document.body.appendChild(container);

      const alertOptions = {
        id: 'position-alert',
        title: 'Position Test',
        description: 'Test',
        status: 'success' as const,
        querySelector: '#position-container',
        position: 'beforebegin' as const
      };

      service.show(alertOptions);

      const alert = document.getElementById('position-alert');
      expect(alert).toBeTruthy();
    });

    it('should handle empty description', () => {
      const container = document.createElement('div');
      container.id = 'empty-desc-container';
      document.body.appendChild(container);

      const alertOptions = {
        id: 'empty-desc-alert',
        title: 'Test Title',
        status: 'error' as const,
        querySelector: '#empty-desc-container',
        position: 'beforeend' as const
      };

      service.show(alertOptions);

      const alert = document.getElementById('empty-desc-alert');
      expect(alert).toBeTruthy();
      expect(alert?.querySelector('.text')?.textContent).toBe('');
    });

    it('should add animationend event listener to alert', () => {
      const container = document.createElement('div');
      container.id = 'animation-container';
      document.body.appendChild(container);

      const alertOptions = {
        id: 'animation-alert',
        title: 'Animation Test',
        description: 'Test Description',
        status: 'success' as const,
        querySelector: '#animation-container',
        position: 'beforeend' as const
      };

      service.show(alertOptions);

      const alert = document.getElementById('animation-alert');
      expect(alert).toBeTruthy();

      // Verify that the element has an event listener by triggering animationend
      service.showed = false;
      const event = new Event('animationend');
      alert?.dispatchEvent(event);

      // After animation ends and showed is false, element should be removed
      setTimeout(() => {
        expect(document.getElementById('animation-alert')).toBeNull();
      }, 0);
    });

    it('should not remove alert on animationend if showed is true', () => {
      const container = document.createElement('div');
      container.id = 'keep-alert-container';
      document.body.appendChild(container);

      const alertOptions = {
        id: 'keep-alert',
        title: 'Keep Alert Test',
        description: 'Test Description',
        status: 'error' as const,
        querySelector: '#keep-alert-container',
        position: 'beforeend' as const
      };

      service.show(alertOptions);

      const alert = document.getElementById('keep-alert');
      expect(alert).toBeTruthy();
      expect(service.showed).toBe(true);

      // Trigger animationend while showed is still true
      const event = new Event('animationend');
      alert?.dispatchEvent(event);

      // Alert should still exist
      expect(document.getElementById('keep-alert')).toBeTruthy();
    });
  });

  describe('hide', () => {
    it('should set showed to false', () => {
      service.showed = true;
      service.hide('test-alert');

      expect(service.showed).toBe(false);
    });

    it('should add bounce out animation class to alert when it exists', () => {
      const alert = document.createElement('div');
      alert.id = 'alert-hide-test';
      document.body.appendChild(alert);

      service.showed = true;
      service.hide('hide-test');

      expect(service.showed).toBe(false);
      const alertElement = document.getElementById('alert-hide-test');
      if (alertElement) {
        expect(alertElement.classList.contains('animate__animated')).toBe(true);
        expect(alertElement.classList.contains('animate__bounceOut')).toBe(true);
      }
    });

    it('should not throw error when alert does not exist', () => {
      service.showed = true;

      expect(() => service.hide('non-existent-alert')).not.toThrow();
      expect(service.showed).toBe(false);
    });

    it('should handle multiple hide calls', () => {
      service.showed = true;

      service.hide('first-alert');
      expect(service.showed).toBe(false);

      service.hide('second-alert');
      expect(service.showed).toBe(false);
    });
  });
});
