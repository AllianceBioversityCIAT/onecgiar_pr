import { TestBed } from '@angular/core/testing';

import { PolicyControlListService } from './policy-control-list.service';

describe('PolicyControlListService', () => {
  let service: PolicyControlListService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PolicyControlListService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
