import { TestBed } from '@angular/core/testing';

import { InstitutionsService } from './institutions.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('InstitutionsService', () => {
  let service: InstitutionsService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(InstitutionsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
