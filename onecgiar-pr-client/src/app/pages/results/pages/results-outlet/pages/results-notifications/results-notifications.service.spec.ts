import { TestBed } from '@angular/core/testing';

import { ResultsNotificationsService } from './results-notifications.service';

describe('ResultsNotificationsService', () => {
  let service: ResultsNotificationsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ResultsNotificationsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
