import { TestBed } from '@angular/core/testing';

import { CustomizedAlertsFeService } from './customized-alerts-fe.service';

describe('CustomizedAlertsFeService', () => {
  let service: CustomizedAlertsFeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CustomizedAlertsFeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
