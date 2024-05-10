import { TestBed } from '@angular/core/testing';

import { InnovationControlListService } from './innovation-control-list.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('InnovationControlListService', () => {
  let service: InnovationControlListService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(InnovationControlListService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
