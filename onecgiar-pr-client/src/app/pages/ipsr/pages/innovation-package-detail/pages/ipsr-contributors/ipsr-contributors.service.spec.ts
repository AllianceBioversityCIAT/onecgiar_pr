import { TestBed } from '@angular/core/testing';

import { IpsrContributorsService } from './ipsr-contributors.service';

describe('IpsrContributorsService', () => {
  let service: IpsrContributorsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(IpsrContributorsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
