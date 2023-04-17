import { TestBed } from '@angular/core/testing';

import { ManageRipUnitTimeService } from './manage-rip-unit-time.service';

describe('ManageRipUnitTimeService', () => {
  let service: ManageRipUnitTimeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ManageRipUnitTimeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
