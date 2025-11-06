import { TestBed } from '@angular/core/testing';

import { AiReviewService } from './ai-review.service';

describe('AiReviewService', () => {
  let service: AiReviewService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AiReviewService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
