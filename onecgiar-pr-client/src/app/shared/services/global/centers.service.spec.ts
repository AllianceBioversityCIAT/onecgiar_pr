import { TestBed } from '@angular/core/testing';

import { CentersService } from './centers.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('CentersService', () => {
  let service: CentersService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(CentersService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
