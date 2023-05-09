import { TestBed } from '@angular/core/testing';

import { IpsrCompletenessStatusService } from './ipsr-completeness-status.service';

describe('IpsrCompletenessStatusService', () => {
  let service: IpsrCompletenessStatusService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(IpsrCompletenessStatusService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
