import { TestBed } from '@angular/core/testing';

import { ResultsListService } from './results-list.service';

describe('ResultsListService', () => {
  let service: ResultsListService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ResultsListService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
