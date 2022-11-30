import { TestBed } from '@angular/core/testing';

import { RetrieveModalService } from './retrieve-modal.service';

describe('RetrieveModalService', () => {
  let service: RetrieveModalService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RetrieveModalService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
