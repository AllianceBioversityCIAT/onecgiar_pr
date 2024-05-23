import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IpsrContributorsNonCgiarPartnersComponent } from './ipsr-contributors-non-cgiar-partners.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { PrFieldHeaderComponent } from '../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { PrMultiSelectComponent } from '../../../../../../../../custom-fields/pr-multi-select/pr-multi-select.component';
import { FormsModule } from '@angular/forms';

describe('IpsrContributorsNonCgiarPartnersComponent', () => {
  let component: IpsrContributorsNonCgiarPartnersComponent;
  let fixture: ComponentFixture<IpsrContributorsNonCgiarPartnersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        IpsrContributorsNonCgiarPartnersComponent,
        PrFieldHeaderComponent,
        PrMultiSelectComponent
      ],
      imports: [
        HttpClientTestingModule,
        FormsModule
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(IpsrContributorsNonCgiarPartnersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('validateDeliverySelection', () => {
    it('should return false when deliveries is not an object', () => {
      const deliveries = 'notAnObject';
      const deliveryId = 1;

      const result = component.validateDeliverySelection(deliveries, deliveryId);

      expect(result).toBeFalsy();
    });

    it('should return false when deliveryId is not found in deliveries', () => {
      const deliveries = [1, 2, 3];
      const deliveryId = 4;

      const result = component.validateDeliverySelection(deliveries, deliveryId);

      expect(result).toBeFalsy();
    });

    it('should return true when deliveryId is found in deliveries', () => {
      const deliveries = [1, 2, 3];
      const deliveryId = 2;

      const result = component.validateDeliverySelection(deliveries, deliveryId);

      expect(result).toBeTruthy();
    });
  });

  describe('onSelectDelivery', () => {
    it('should not modify deliveries if readOnly is true', () => {
      component.rolesSE.readOnly = true;
      const option = { deliveries: [1, 2, 3] };
      const deliveryId = 1;

      component.onSelectDelivery(option, deliveryId);

      expect(option.deliveries).toEqual([1, 2, 3]);
    });
    it('should remove 4 from deliveries if found and deliveryId is not 4', () => {
      component.rolesSE.readOnly = false;
      const option = { deliveries: [4, 1, 2, 3] };
      const deliveryId = 2;

      component.onSelectDelivery(option, deliveryId);

      expect(option.deliveries).toEqual([1, 3]);
    });

    it('should set deliveries to [4] if deliveryId is 4 and index is negative', () => {
      component.rolesSE.readOnly = false;
      const option = { deliveries: undefined };
      const deliveryId = 4;

      component.onSelectDelivery(option, deliveryId);

      expect(option.deliveries).toEqual([4]);
    });

    it('should set deliveries to an array if not an object', () => {
      component.rolesSE.readOnly = false;
      const option = { deliveries: undefined };
      const deliveryId = 1;

      component.onSelectDelivery(option, deliveryId);

      expect(option.deliveries).toEqual([1]);
    });
  });

  describe('removePartner', () => {
    it('should remove institution at the specified index and increment toggle', () => {
     const institution = {
      institutions_id: 1,
      institutions_type_name: 'name',
      institutions_name: 'names'
     }
      component.contributorsBody.institutions = [institution]
      const initialToggleValue = component.toggle;

      component.removePartner(0);

      expect(component.contributorsBody.institutions.length).toBe(0);
      expect(component.toggle).toBe(initialToggleValue + 1);
    });
  });

  describe('cleanBody', () => {
    it('should call cleanBody', () => {
      const spy = jest.spyOn(component, 'cleanBody');
      component.cleanBody();
      expect(spy).toHaveBeenCalled();
    });
  });
});
