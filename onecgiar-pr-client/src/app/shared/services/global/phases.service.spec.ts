import { TestBed } from '@angular/core/testing';

import { PhasesService } from './phases.service';

describe('PhasesService', () => {
  let service: PhasesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PhasesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
