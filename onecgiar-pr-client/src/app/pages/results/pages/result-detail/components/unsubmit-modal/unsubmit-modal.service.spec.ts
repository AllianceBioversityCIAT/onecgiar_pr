import { TestBed } from '@angular/core/testing';

import { UnsubmitModalService } from './unsubmit-modal.service';

describe('UnsubmitModalService', () => {
  let service: UnsubmitModalService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UnsubmitModalService);
  });

  it('should initially have showModal set to false', () => {
    expect(service.showModal).toBeFalsy();
  });
});
