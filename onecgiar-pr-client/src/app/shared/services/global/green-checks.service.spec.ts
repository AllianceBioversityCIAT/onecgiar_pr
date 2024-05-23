import { TestBed } from '@angular/core/testing';

import { GreenChecksService } from './green-checks.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('GreenChecksService', () => {
  let service: GreenChecksService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(GreenChecksService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
