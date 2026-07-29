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

  describe('normalizeImpactAreaIds', () => {
    it('should return an empty list for null, undefined or empty values', () => {
      expect(service.normalizeImpactAreaIds(null)).toEqual([]);
      expect(service.normalizeImpactAreaIds(undefined)).toEqual([]);
      expect(service.normalizeImpactAreaIds('')).toEqual([]);
    });

    it('should wrap a single id into a list', () => {
      expect(service.normalizeImpactAreaIds(10)).toEqual([10]);
      expect(service.normalizeImpactAreaIds('10')).toEqual(['10']);
    });

    it('should keep a list as is and drop empty entries', () => {
      expect(service.normalizeImpactAreaIds([10, 11])).toEqual([10, 11]);
      expect(service.normalizeImpactAreaIds([10, null, '', undefined, 11])).toEqual([10, 11]);
    });
  });
});
