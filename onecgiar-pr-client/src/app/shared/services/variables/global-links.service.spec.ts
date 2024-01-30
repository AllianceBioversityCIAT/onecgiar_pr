import { TestBed } from '@angular/core/testing';

import { GlobalLinksService } from './global-links.service';

describe('GlobalLinksService', () => {
  let service: GlobalLinksService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GlobalLinksService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
