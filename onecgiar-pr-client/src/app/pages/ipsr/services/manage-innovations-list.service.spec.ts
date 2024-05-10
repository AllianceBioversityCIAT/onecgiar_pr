import { TestBed } from '@angular/core/testing';

import { ManageInnovationsListService } from './manage-innovations-list.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('ManageInnovationsListService', () => {
  let service: ManageInnovationsListService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(ManageInnovationsListService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
