import { TestBed } from '@angular/core/testing';

import { IpsrListFilterService } from './ipsr-list-filter.service';

describe('IpsrListFilterService', () => {
  let service: IpsrListFilterService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(IpsrListFilterService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
