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

  it('should show alert', () => {
    const alertOptions: AlertOptions = {
      id: 'testId',
      title: 'Test Title',
      description: 'Test Description',
      closeIn: 3000,
      status: 'error',
      confirmText: 'Confirm'
    };
    const callback = jest.fn();

    // Mock the 'app-root' element and its methods
    const appRoot = document.createElement('app-root');
    appRoot.insertAdjacentHTML = jest.fn();
    document.getElementsByTagName = jest.fn().mockReturnValue([appRoot]);

    // Mock the 'getElementById' method
    document.getElementById = jest.fn().mockReturnValue(document.createElement('div'));

    service.show(alertOptions, callback);

    // Add assertions to check if the alert is displayed correctly
  });

  it('should close alert', () => {
    const alertId = 'testId';
    service.closeAction(alertId);
    // Add assertions to check if the alert is closed correctly
  });
});
