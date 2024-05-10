import { TestBed } from '@angular/core/testing';

import { CurrentResultService } from './current-result.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('CurrentResultService', () => {
  let service: CurrentResultService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(CurrentResultService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
