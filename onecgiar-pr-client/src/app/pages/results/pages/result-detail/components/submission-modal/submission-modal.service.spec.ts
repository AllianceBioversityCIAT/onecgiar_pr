import { TestBed } from '@angular/core/testing';

import { SubmissionModalService } from './submission-modal.service';

describe('SubmissionModalService', () => {
  let service: SubmissionModalService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SubmissionModalService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
