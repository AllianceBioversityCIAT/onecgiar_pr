import { TestBed } from '@angular/core/testing';

import { ManageInnovationsListService } from './manage-innovations-list.service';

describe('ManageInnovationsListService', () => {
  let service: ManageInnovationsListService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ManageInnovationsListService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
