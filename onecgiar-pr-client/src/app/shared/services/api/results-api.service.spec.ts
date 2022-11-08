import { TestBed } from '@angular/core/testing';

import { ResultsApiService } from './results-api.service';

describe('ResultsApiService', () => {
  let service: ResultsApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ResultsApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
