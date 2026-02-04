import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResultsReviewContainerComponent } from './results-review-container.component';

describe('ResultsReviewContainerComponent', () => {
  let component: ResultsReviewContainerComponent;
  let fixture: ComponentFixture<ResultsReviewContainerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResultsReviewContainerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ResultsReviewContainerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
