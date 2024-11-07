import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StepN4PartnerCoInvestmentTableComponent } from './step-n4-partner-co-investment-table.component';
import { HttpClientModule } from '@angular/common/http';
import { StepN4AddPartnerComponent } from './modal/step-n4-add-partner/step-n4-add-partner.component';
import { CustomFieldsModule } from '../../../../../../../../../../custom-fields/custom-fields.module';
import { DialogModule } from 'primeng/dialog';

describe('StepN4PartnerCoInvestmentTableComponent', () => {
  let component: StepN4PartnerCoInvestmentTableComponent;
  let fixture: ComponentFixture<StepN4PartnerCoInvestmentTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [StepN4PartnerCoInvestmentTableComponent, StepN4AddPartnerComponent],
      imports: [HttpClientModule, CustomFieldsModule, DialogModule]
    }).compileComponents();

    fixture = TestBed.createComponent(StepN4PartnerCoInvestmentTableComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
  describe('StepN4PartnerCoInvestmentTableComponent', () => {
    describe('deletePartner', () => {
      it('should set is_active to false', () => {
        const partner = { is_active: true };
        component.deletePartner(partner);
        expect(partner.is_active).toBe(false);
      });
    });
  });
});
