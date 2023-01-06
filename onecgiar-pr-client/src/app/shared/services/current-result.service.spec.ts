import { TestBed } from '@angular/core/testing';

import { CurrentResultService } from './current-result.service';

describe('CurrentResultService', () => {
  let service: CurrentResultService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CurrentResultService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
