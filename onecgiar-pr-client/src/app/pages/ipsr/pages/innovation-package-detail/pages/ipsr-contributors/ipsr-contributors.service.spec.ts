import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { IpsrContributorsService } from './ipsr-contributors.service';

describe('IpsrContributorsService', () => {
  let service: IpsrContributorsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(IpsrContributorsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
