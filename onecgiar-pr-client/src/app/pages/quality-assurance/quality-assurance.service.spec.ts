import { TestBed } from '@angular/core/testing';
import { QualityAssuranceService } from './quality-assurance.service';

describe('QualityAssuranceService', () => {
  let service: QualityAssuranceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(QualityAssuranceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
  it('should have $qaFirstInitObserver property initialized as null', () => {
    expect(service.$qaFirstInitObserver).toBeNull();
  });
});
