import { TestBed } from '@angular/core/testing';

import { ResultsListFilterService } from './results-list-filter.service';

describe('ResultsListFilterService', () => {
  let service: ResultsListFilterService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ResultsListFilterService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
