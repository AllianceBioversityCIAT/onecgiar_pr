import { TestBed } from '@angular/core/testing';

import { InnovationControlListService } from './innovation-control-list.service';

describe('InnovationControlListService', () => {
  let service: InnovationControlListService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(InnovationControlListService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
