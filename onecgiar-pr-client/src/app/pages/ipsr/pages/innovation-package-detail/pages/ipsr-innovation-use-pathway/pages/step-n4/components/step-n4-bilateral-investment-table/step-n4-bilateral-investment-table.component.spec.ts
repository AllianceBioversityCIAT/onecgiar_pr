import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StepN4BilateralInvestmentTableComponent } from './step-n4-bilateral-investment-table.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('StepN4BilateralInvestmentTableComponent', () => {
  let component: StepN4BilateralInvestmentTableComponent;
  let fixture: ComponentFixture<StepN4BilateralInvestmentTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [StepN4BilateralInvestmentTableComponent],
      imports: [HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(StepN4BilateralInvestmentTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
