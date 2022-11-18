import { TestBed } from '@angular/core/testing';

import { CentersService } from './centers.service';

describe('CentersService', () => {
  let service: CentersService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CentersService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
