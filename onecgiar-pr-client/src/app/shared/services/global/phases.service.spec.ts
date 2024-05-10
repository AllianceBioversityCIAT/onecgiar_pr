import { TestBed } from '@angular/core/testing';

import { PhasesService } from './phases.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('PhasesService', () => {
  let service: PhasesService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(PhasesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
