import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StepN4PartnerCoInvestmentTableComponent } from './step-n4-partner-co-investment-table.component';

describe('StepN4PartnerCoInvestmentTableComponent', () => {
  let component: StepN4PartnerCoInvestmentTableComponent;
  let fixture: ComponentFixture<StepN4PartnerCoInvestmentTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ StepN4PartnerCoInvestmentTableComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StepN4PartnerCoInvestmentTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
