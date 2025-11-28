import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResultsReviewTableComponent } from './results-review-table.component';

describe('ResultsReviewTableComponent', () => {
  let component: ResultsReviewTableComponent;
  let fixture: ComponentFixture<ResultsReviewTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResultsReviewTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ResultsReviewTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
