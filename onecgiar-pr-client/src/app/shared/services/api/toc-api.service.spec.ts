import { TestBed } from '@angular/core/testing';

import { TocApiService } from './toc-api.service';

describe('TocApiService', () => {
  let service: TocApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TocApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
