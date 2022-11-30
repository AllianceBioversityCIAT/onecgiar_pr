import { TestBed } from '@angular/core/testing';

import { ShareRequestModalService } from './share-request-modal.service';

describe('ShareRequestModalService', () => {
  let service: ShareRequestModalService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ShareRequestModalService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
