import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientModule } from '@angular/common/http';
import { IpsrAnnualUpdatingComponent } from './ipsr-annual-updating.component';
import { PrFieldHeaderComponent } from '../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { PrRadioButtonComponent } from '../../../../../../../../custom-fields/pr-radio-button/pr-radio-button.component';
import { of } from 'rxjs';

describe('IpsrAnnualUpdatingComponent', () => {
  let component: IpsrAnnualUpdatingComponent;
  let fixture: ComponentFixture<IpsrAnnualUpdatingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [IpsrAnnualUpdatingComponent, PrFieldHeaderComponent, PrRadioButtonComponent],
      imports: [HttpClientModule]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(IpsrAnnualUpdatingComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should return true if ipsrGeneralInfoBody.is_discontinued is falsy', () => {
    component.ipsrGeneralInfoBody = { is_discontinued: false };
    expect(component.isIpsrDiscontinuedOptionsTrue()).toBe(true);
  });

  it('should return true if ipsrGeneralInfoBody.is_discontinued is truthy and at least one discontinued option is true', () => {
    component.ipsrGeneralInfoBody = {
      is_discontinued: true,
      discontinued_options: [
        { name: 'Option 1', value: false },
        { name: 'Option 2', value: true }
      ]
    };
    expect(component.isIpsrDiscontinuedOptionsTrue()).toBe(true);
  });

  it('should return false if ipsrGeneralInfoBody.is_discontinued is truthy and all discontinued options are false', () => {
    component.ipsrGeneralInfoBody = {
      is_discontinued: true,
      discontinued_options: [
        { name: 'Option 1', value: false },
        { name: 'Option 2', value: false }
      ]
    };
    expect(component.isIpsrDiscontinuedOptionsTrue()).toBe(false);
  });

  describe('ngOnInit', () => {
    it('should call getAlertNarrativeIPSR', () => {
      const spy = jest.spyOn(component, 'getAlertNarrativeIPSR');
      component.ngOnInit();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('IpsrAnnualUpdatingComponent', () => {
    it('should set alertTextIPSR with the response value from API', () => {
      const mockResponse = { response: { value: 'Test alert narrative' } };
      jest.spyOn(component.api.resultsSE, 'GET_globalNarratives').mockReturnValue(of(mockResponse));

      component.getAlertNarrativeIPSR();

      expect(component.alertTextIPSR).toBe('Test alert narrative');
    });

    it('should call GET_globalNarratives with "updated_ipsr_guidance"', () => {
      const spy = jest.spyOn(component.api.resultsSE, 'GET_globalNarratives').mockReturnValue(of({ response: { value: 'Test alert narrative' } }));

      component.getAlertNarrativeIPSR();

      expect(spy).toHaveBeenCalledWith('updated_ipsr_guidance');
    });
  });
});
