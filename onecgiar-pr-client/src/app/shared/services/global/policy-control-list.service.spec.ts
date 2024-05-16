import { TestBed } from '@angular/core/testing';

import { PolicyControlListService } from './policy-control-list.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('PolicyControlListService', () => {
  let service: PolicyControlListService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(PolicyControlListService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
