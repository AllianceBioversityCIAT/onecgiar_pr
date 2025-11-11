import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { AiReviewService } from './ai-review.service';

describe('AiReviewService', () => {
  let service: AiReviewService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AiReviewService]
    });
    service = TestBed.inject(AiReviewService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
