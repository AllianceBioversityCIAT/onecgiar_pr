import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AiReviewComponent } from './ai-review.component';

describe('AiReviewComponent', () => {
  let component: AiReviewComponent;
  let fixture: ComponentFixture<AiReviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiReviewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AiReviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
