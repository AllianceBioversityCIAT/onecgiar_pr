import { TestBed } from '@angular/core/testing';

import { SubmissionModalService } from './submission-modal.service';

describe('SubmissionModalService', () => {
  let service: SubmissionModalService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SubmissionModalService);
  });

  it('should initially have showModal set to false', () => {
    expect(service.showModal).toBeFalsy();
  });
});
