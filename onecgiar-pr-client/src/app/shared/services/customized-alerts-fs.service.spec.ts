import { TestBed } from '@angular/core/testing';

import { CustomizedAlertsFsService } from './customized-alerts-fs.service';

describe('CustomizedAlertsFsService', () => {
  let service: CustomizedAlertsFsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CustomizedAlertsFsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
