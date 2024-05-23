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
  describe('counter', () => {
    it('should return 0 when an empty string is passed', () => {
      expect(service.counter('')).toBe(0);
    });

    it('should return 1 when a string with one word is passed', () => {
      expect(service.counter('word')).toBe(1);
    });

    it('should return the correct count when a string with multiple words is passed', () => {
      expect(service.counter('one two three')).toBe(3);
    });

    it('should return the correct count when a string with HTML tags is passed', () => {
      expect(service.counter('<p>one two three</p>')).toBe(3);
    });

    it('should return the correct count when a string with special characters is passed', () => {
      expect(service.counter('one\ntwo\tthree')).toBe(1);
    });
  });
});
