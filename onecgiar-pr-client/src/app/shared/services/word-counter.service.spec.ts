import { TestBed } from '@angular/core/testing';

import { WordCounterService } from './word-counter.service';

describe('WordCounterService', () => {
  let service: WordCounterService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WordCounterService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
