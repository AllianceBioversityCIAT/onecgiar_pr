import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StepN4PartnerCoInvestmentTableComponent } from './step-n4-partner-co-investment-table.component';
import { HttpClientModule } from '@angular/common/http';

describe('StepN4PartnerCoInvestmentTableComponent', () => {
  let component: StepN4PartnerCoInvestmentTableComponent;
  let fixture: ComponentFixture<StepN4PartnerCoInvestmentTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [StepN4PartnerCoInvestmentTableComponent],
      imports: [HttpClientModule]
    }).compileComponents();

    fixture = TestBed.createComponent(StepN4PartnerCoInvestmentTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
  describe('StepN4PartnerCoInvestmentTableComponent', () => {
    // ... código existente omitido para brevedad

    describe('validateDeliverySelection', () => {
      it('should return false if deliveries is not an object', () => {
        const result = component.validateDeliverySelection('not an object', 1);
        expect(result).toBe(false);
      });

      it('should return true if deliveryId is in deliveries', () => {
        const result = component.validateDeliverySelection([1, 2, 3], 2);
        expect(result).toBe(true);
      });

      it('should return false if deliveryId is not in deliveries', () => {
        const result = component.validateDeliverySelection([1, 2, 3], 4);
        expect(result).toBe(false);
      });
    });

    describe('onSelectDelivery', () => {
      it('should handle various scenarios', () => {
        const option1 = { deliveries: [1, 2, 3] };
        component.onSelectDelivery(option1, 4);
        expect(option1.deliveries).toEqual([4]);

        const option3 = { deliveries: [1, 2, 3, 4] };
        component.onSelectDelivery(option3, 4);
        expect(option3.deliveries).toEqual([1, 2, 3]);
      });
    });

    describe('deletePartner', () => {
      it('should set is_active to false', () => {
        const partner = { institution: { is_active: true } };
        component.deletePartner(partner);
        expect(partner.institution.is_active).toBe(false);
      });
    });
  });
});
