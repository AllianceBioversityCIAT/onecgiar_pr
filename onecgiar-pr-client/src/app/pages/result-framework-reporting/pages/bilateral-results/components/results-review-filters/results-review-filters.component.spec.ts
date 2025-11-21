import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResultsReviewFiltersComponent } from './results-review-filters.component';

describe('ResultsReviewFiltersComponent', () => {
  let component: ResultsReviewFiltersComponent;
  let fixture: ComponentFixture<ResultsReviewFiltersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResultsReviewFiltersComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ResultsReviewFiltersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
