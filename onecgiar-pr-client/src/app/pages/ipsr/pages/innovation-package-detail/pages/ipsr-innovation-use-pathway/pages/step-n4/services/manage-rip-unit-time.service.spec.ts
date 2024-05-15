import { TestBed } from '@angular/core/testing';

import { ManageRipUnitTimeService } from './manage-rip-unit-time.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('ManageRipUnitTimeService', () => {
  let service: ManageRipUnitTimeService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(ManageRipUnitTimeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
