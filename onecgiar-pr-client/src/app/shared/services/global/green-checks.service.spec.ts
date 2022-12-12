import { TestBed } from '@angular/core/testing';

import { GreenChecksService } from './green-checks.service';

describe('GreenChecksService', () => {
  let service: GreenChecksService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GreenChecksService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
