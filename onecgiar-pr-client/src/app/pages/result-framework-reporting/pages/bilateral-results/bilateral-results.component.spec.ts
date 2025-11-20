import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BilateralResultsComponent } from './bilateral-results.component';

describe('BilateralResultsComponent', () => {
  let component: BilateralResultsComponent;
  let fixture: ComponentFixture<BilateralResultsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BilateralResultsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BilateralResultsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
