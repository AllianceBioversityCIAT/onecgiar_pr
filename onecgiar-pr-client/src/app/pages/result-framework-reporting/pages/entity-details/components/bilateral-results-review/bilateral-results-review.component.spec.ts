import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { BilateralResultsReviewComponent } from './bilateral-results-review.component';

describe('BilateralResultsReviewComponent', () => {
  let component: BilateralResultsReviewComponent;
  let fixture: ComponentFixture<BilateralResultsReviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BilateralResultsReviewComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({}),
            snapshot: { params: {} }
          }
        }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BilateralResultsReviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
