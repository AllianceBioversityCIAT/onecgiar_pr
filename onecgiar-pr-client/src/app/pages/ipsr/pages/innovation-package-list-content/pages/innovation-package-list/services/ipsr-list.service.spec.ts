import { TestBed } from '@angular/core/testing';

import { IpsrListService } from './ipsr-list.service';

describe('IpsrListService', () => {
  let service: IpsrListService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(IpsrListService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
