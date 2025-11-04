import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NormalSelectorComponent } from './normal-selector.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { CountInstitutionsTypesPipe } from '../../../rd-general-information/pipes/count-institutions-types.pipe';
import { PrFieldHeaderComponent } from '../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { PrMultiSelectComponent } from '../../../../../../../../custom-fields/pr-multi-select/pr-multi-select.component';
import { AlertStatusComponent } from '../../../../../../../../custom-fields/alert-status/alert-status.component';
import { FormsModule } from '@angular/forms';
import { RdPartnersService } from '../../rd-partners.service';

describe('NormalSelectorComponent', () => {
  let component: NormalSelectorComponent;
  let fixture: ComponentFixture<NormalSelectorComponent>;
  let mockRdPartnersService;

  beforeEach(async () => {
    mockRdPartnersService = {
      setPossibleLeadPartners: jest.fn().mockImplementation(_value => {}),
      partnersBody: {
        mqap_institutions: [{ user_matched_institution: 'inst1' }],
        institutions: [
          {
            obj_institutions: {
              obj_institution_type_code: {
                id: 1,
                name: 'name'
              }
            }
          }
        ]
      }
    };

    await TestBed.configureTestingModule({
      declarations: [NormalSelectorComponent, CountInstitutionsTypesPipe, PrFieldHeaderComponent, PrMultiSelectComponent, AlertStatusComponent],
      imports: [HttpClientTestingModule, FormsModule],
      providers: [
        {
          provide: RdPartnersService,
          useValue: mockRdPartnersService
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(NormalSelectorComponent);
    component = fixture.componentInstance;
  });

  describe('getDisableOptions()', () => {
    it('should initialize disableOptions correctly', () => {
      component.getDisableOptions();

      expect(component.disableOptions).toEqual([
        {
          user_matched_institution: 'inst1'
        }
      ]);
    });
  });

  describe('getOnlyPartnerTypes()', () => {
    it('should initialize partnerUniqueTypes correctly', () => {
      component.getOnlyPartnerTypes();

      expect(component.partnerUniqueTypes).toEqual(['name']);
    });
  });

  describe('emitPartnerEvent()', () => {
    it('should set leadPartnerId to null if it matches the partner', () => {
      component.rdPartnersSE.leadPartnerId = 1;
      component.emitPartnerEvent(1);
      expect(component.rdPartnersSE.leadPartnerId).toBeNull();
    });

    it('should not change leadPartnerId if it does not match the partner', () => {
      component.rdPartnersSE.leadPartnerId = 1;
      component.emitPartnerEvent(2);
      expect(component.rdPartnersSE.leadPartnerId).toBe(1);
    });

    it('should call setPossibleLeadPartners with true', () => {
      jest.spyOn(component.rdPartnersSE, 'setPossibleLeadPartners');
      component.emitPartnerEvent(2);
      expect(component.rdPartnersSE.setPossibleLeadPartners).toHaveBeenCalledWith(true);
    });
  });

  describe('updateLeadData()', () => {
    it('should set is_lead_by_partner to false and disableLeadPartner to true if no_applicable_partner is true', () => {
      component.rdPartnersSE.partnersBody.no_applicable_partner = true;
      component.updateLeadData();
      expect(component.rdPartnersSE.partnersBody.is_lead_by_partner).toBe(false);
      expect(component.rdPartnersSE.disableLeadPartner).toBe(true);
    });

    it('should set disableLeadPartner to false if no_applicable_partner is false', () => {
      component.rdPartnersSE.partnersBody.no_applicable_partner = false;
      component.updateLeadData();
      expect(component.rdPartnersSE.disableLeadPartner).toBe(false);
    });
  });
});
