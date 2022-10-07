import { TestBed } from '@angular/core/testing';

import { ResultLevelService } from './result-level.service';

describe('ResultLevelService', () => {
  let service: ResultLevelService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ResultLevelService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
