import { TestBed } from '@angular/core/testing';

import { RdTheoryOfChangesServicesService } from './rd-theory-of-changes-services.service';

describe('RdTheoryOfChangesServicesService', () => {
  let service: RdTheoryOfChangesServicesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RdTheoryOfChangesServicesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
