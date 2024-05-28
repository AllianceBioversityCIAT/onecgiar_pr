import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StepN1InstitutionsComponent } from './step-n1-institutions.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { PrFieldHeaderComponent } from '../../../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { FormsModule } from '@angular/forms';
import { PrMultiSelectComponent } from '../../../../../../../../../../custom-fields/pr-multi-select/pr-multi-select.component';
import { FeedbackValidationDirective } from '../../../../../../../../../../shared/directives/feedback-validation.directive';

describe('StepN1InstitutionsComponent', () => {
  let component: StepN1InstitutionsComponent;
  let fixture: ComponentFixture<StepN1InstitutionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [StepN1InstitutionsComponent, PrFieldHeaderComponent, PrMultiSelectComponent, FeedbackValidationDirective],
      imports: [HttpClientTestingModule, FormsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(StepN1InstitutionsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should validate delivery selection', () => {
    const deliveries = [1, 2, 3];
    const deliveryId = 2;
    const result = component.validateDeliverySelection(deliveries, deliveryId);
    expect(result).toBe(true);
  });

  it('should select partner', () => {
    const e = { option: { institutions_id: 1 } };
    component.body.institutions = [{ institutions_id: 1, deliveries: [], institutions_name: 'Inst. 1', institutions_type_name: '1' }];
    component.onSelectPartner(e);
    expect(component.body.institutions[0].deliveries).toEqual([1]);
  });

  it('should select delivery', () => {
    const option = { deliveries: [1, 2, 3] };
    const deliveryId = 2;
    component.rolesSE.readOnly = false;

    component.onSelectDelivery(option, deliveryId);
    expect(option.deliveries).toEqual([1, 3]);
  });

  it('should return if readonly is true', () => {
    const option = { deliveries: [1, 2, 3] };
    const deliveryId = 2;
    component.rolesSE.readOnly = true;

    component.onSelectDelivery(option, deliveryId);
    expect(option.deliveries).toEqual([1, 2, 3]);
  });

  it('should set option deliveries to empty array if option.deliveries is [4] and deliveryId is different of 4', () => {
    const option = { deliveries: [4] };
    const deliveryId = 2;
    component.rolesSE.readOnly = false;

    component.onSelectDelivery(option, deliveryId);
    expect(option.deliveries).toEqual([2]);
  });

  it('should set option deliveries to empty array if deliveryId is 4 and index is less than 0', () => {
    const option = { deliveries: [1, 2, 3] };
    const deliveryId = 4;
    component.rolesSE.readOnly = false;

    component.onSelectDelivery(option, deliveryId);
    expect(option.deliveries).toEqual([4]);
  });

  it('should remove partner', () => {
    component.body.institutions = [{ institutions_id: 1, deliveries: [], institutions_name: 'Inst. 1', institutions_type_name: '1' }];
    component.removePartner(0);
    expect(component.body.institutions.length).toBe(0);
  });
});
