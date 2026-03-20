import { TestBed } from '@angular/core/testing';

import { FieldsManagerService } from './fields-manager.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { DataControlService } from './data-control.service';
import { CurrentResult } from '../interfaces/current-result.interface';

describe('FieldsManagerService', () => {
  let service: FieldsManagerService;
  let dataControlSE: DataControlService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(FieldsManagerService);
    dataControlSE = TestBed.inject(DataControlService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('computed signals with empty/null currentResultSignal', () => {
    beforeEach(() => {
      dataControlSE.currentResultSignal.set({});
    });

    it('porfolioExists should return undefined when portfolio is not set', () => {
      expect(service.porfolioExists()).toBeUndefined();
    });

    it('portfolioAcronym should return undefined when portfolio is not set', () => {
      expect(service.portfolioAcronym()).toBeUndefined();
    });

    it('isP25 should return false when portfolio is not set', () => {
      expect(service.isP25()).toBeFalsy();
    });

    it('isP22 should return false when portfolio is not set', () => {
      expect(service.isP22()).toBeFalsy();
    });

    it('isAnInnovation should return false when result_type_id is not set', () => {
      expect(service.isAnInnovation()).toBeFalsy();
    });
  });

  describe('P25 portfolio scenario', () => {
    beforeEach(() => {
      dataControlSE.currentResultSignal.set({ portfolio: 'P25', result_type_id: 1 } as CurrentResult);
    });

    it('porfolioExists should return the portfolio string', () => {
      expect(service.porfolioExists()).toBe('P25');
    });

    it('portfolioAcronym should return P25', () => {
      expect(service.portfolioAcronym()).toBe('P25');
    });

    it('isP25 should return true', () => {
      expect(service.isP25()).toBeTruthy();
    });

    it('isP22 should return false', () => {
      expect(service.isP22()).toBeFalsy();
    });

    describe('fields computed - P25 specific branches', () => {
      it('should include P25-specific description bullet for title field', () => {
        const fields = service.fields();
        expect(fields['[general-info]-title'].description).toContain('For innovations, varieties or breeds');
      });

      it('should include P25-specific description bullet for description field', () => {
        const fields = service.fields();
        expect(fields['[general-info]-description'].description).toContain('Varieties or breeds should be described');
      });

      it('should hide is_krs field for P25', () => {
        const fields = service.fields();
        expect(fields['[general-info]-is_krs'].hide).toBe(true);
      });

      it('should use "tag" label for gender field in P25', () => {
        const fields = service.fields();
        expect(fields['[general-info]-gender_tag_id'].label).toBe('Gender equality, youth and social inclusion tag');
      });

      it('should use "tag" label for climate change field in P25', () => {
        const fields = service.fields();
        expect(fields['[general-info]-climate_change_tag_id'].label).toBe('Climate adaptation and mitigation tag');
      });

      it('should use "tag" in tagScoreField for P25', () => {
        const fields = service.fields();
        expect(fields['[general-info]-nutrition_tag_level_id'].label).toContain('tag');
        expect(fields['[general-info]-environmental_biodiversity_tag_level_id'].label).toContain('tag');
        expect(fields['[general-info]-poverty_tag_level_id'].label).toContain('tag');
      });

      it('should hide impactAreaField for P22 (not P25) - impactAreaField hide should be false for P25', () => {
        const fields = service.fields();
        expect(fields['[general-info]-gender_impact_area_id'].hide).toBe(false);
        expect(fields['[general-info]-climate_impact_area_id'].hide).toBe(false);
        expect(fields['[general-info]-nutrition_impact_area_id'].hide).toBe(false);
        expect(fields['[general-info]-environmental_biodiversity_impact_area_id'].hide).toBe(false);
        expect(fields['[general-info]-poverty_impact_area_id'].hide).toBe(false);
      });

      it('should hide long_title field for P25', () => {
        const fields = service.fields();
        expect(fields['[innovation-dev-info]-long_title'].hide).toBe(true);
      });

      it('should use P25 label for short_title', () => {
        const fields = service.fields();
        expect(fields['[innovation-dev-info]-short_title'].label).toBe('Provide a short name for the innovation');
      });

      it('should set short_title required to true for P25', () => {
        const fields = service.fields();
        expect(fields['[innovation-dev-info]-short_title'].required).toBe(true);
      });

      it('should set short_title useColon to false for P25', () => {
        const fields = service.fields();
        expect(fields['[innovation-dev-info]-short_title'].useColon).toBe(false);
      });

      it('should not hide innovation-use-form fields for P25', () => {
        const fields = service.fields();
        expect(fields['[innovation-use-form]-has-innovation-link'].hide).toBe(false);
        expect(fields['[innovation-use-form]-core-innovation'].hide).toBe(false);
        expect(fields['[innovation-use-form]-has-studies-links'].hide).toBe(false);
        expect(fields['[innovation-use-form]-2030-to-be-determined'].hide).toBe(false);
      });

      it('should not hide contributors-partners for P25', () => {
        const fields = service.fields();
        expect(fields['[contributors-partners]-is-lead-by-partner'].hide).toBe(false);
      });

      it('should use P25 label for ost_submitted', () => {
        const fields = service.fields();
        expect(fields['[knowledge-product-info]-ost_submitted'].label).toBe('Do you have a MELIA study planned in your TOC?');
      });

      it('should use P25 label for ost_melia_select', () => {
        const fields = service.fields();
        expect(fields['[knowledge-product-info]-ost_melia_select'].label).toBe(
          'Select the MELIA study from the drop-down (this drop-down is synced with your TOC)'
        );
      });

      it('should use P25 placeholder for ost_melia_select', () => {
        const fields = service.fields();
        expect(fields['[knowledge-product-info]-ost_melia_select'].placeholder).toBe(
          'Select the MELIA study from the drop-down (this drop-down is synced with your TOC)'
        );
      });
    });
  });

  describe('P22 portfolio scenario', () => {
    beforeEach(() => {
      dataControlSE.currentResultSignal.set({ portfolio: 'P22', result_type_id: 1 } as CurrentResult);
    });

    it('porfolioExists should return the portfolio string', () => {
      expect(service.porfolioExists()).toBe('P22');
    });

    it('portfolioAcronym should return P22', () => {
      expect(service.portfolioAcronym()).toBe('P22');
    });

    it('isP22 should return true', () => {
      expect(service.isP22()).toBeTruthy();
    });

    it('isP25 should return false', () => {
      expect(service.isP25()).toBeFalsy();
    });

    describe('fields computed - P22 specific branches', () => {
      it('should NOT include P25-specific description bullet for title field', () => {
        const fields = service.fields();
        expect(fields['[general-info]-title'].description).not.toContain('For innovations, varieties or breeds');
      });

      it('should NOT include P25-specific description bullet for description field', () => {
        const fields = service.fields();
        expect(fields['[general-info]-description'].description).not.toContain('Varieties or breeds should be described');
      });

      it('should not hide is_krs for P22', () => {
        const fields = service.fields();
        expect(fields['[general-info]-is_krs'].hide).toBe(false);
      });

      it('should use "score" label for gender field in P22', () => {
        const fields = service.fields();
        expect(fields['[general-info]-gender_tag_id'].label).toBe('Gender equality scoren');
      });

      it('should use "score" label for climate change field in P22', () => {
        const fields = service.fields();
        expect(fields['[general-info]-climate_change_tag_id'].label).toBe('Climate change score');
      });

      it('should use "score" in tagScoreField for P22', () => {
        const fields = service.fields();
        expect(fields['[general-info]-nutrition_tag_level_id'].label).toContain('score');
        expect(fields['[general-info]-environmental_biodiversity_tag_level_id'].label).toContain('score');
        expect(fields['[general-info]-poverty_tag_level_id'].label).toContain('score');
      });

      it('should hide impactAreaField for P22', () => {
        const fields = service.fields();
        expect(fields['[general-info]-gender_impact_area_id'].hide).toBe(true);
        expect(fields['[general-info]-climate_impact_area_id'].hide).toBe(true);
        expect(fields['[general-info]-nutrition_impact_area_id'].hide).toBe(true);
        expect(fields['[general-info]-environmental_biodiversity_impact_area_id'].hide).toBe(true);
        expect(fields['[general-info]-poverty_impact_area_id'].hide).toBe(true);
      });

      it('should not hide long_title for P22', () => {
        const fields = service.fields();
        expect(fields['[innovation-dev-info]-long_title'].hide).toBe(false);
      });

      it('should use P22 label for short_title', () => {
        const fields = service.fields();
        expect(fields['[innovation-dev-info]-short_title'].label).toBe('Provide a short title for the innovation');
      });

      it('should set short_title required to false for P22', () => {
        const fields = service.fields();
        expect(fields['[innovation-dev-info]-short_title'].required).toBe(false);
      });

      it('should hide short_title for P22 (isP22 || !isAnInnovation)', () => {
        const fields = service.fields();
        expect(fields['[innovation-dev-info]-short_title'].hide).toBe(true);
      });

      it('should set short_title useColon to true for P22', () => {
        const fields = service.fields();
        expect(fields['[innovation-dev-info]-short_title'].useColon).toBe(true);
      });

      it('should use P22 description for short_title', () => {
        const fields = service.fields();
        expect(fields['[innovation-dev-info]-short_title'].description).toContain(
          'You do not need to specify the number of new or improved lines/varieties'
        );
      });

      it('should hide innovation-use-form fields for P22', () => {
        const fields = service.fields();
        expect(fields['[innovation-use-form]-has-innovation-link'].hide).toBe(true);
        expect(fields['[innovation-use-form]-core-innovation'].hide).toBe(true);
        expect(fields['[innovation-use-form]-has-studies-links'].hide).toBe(true);
        expect(fields['[innovation-use-form]-2030-to-be-determined'].hide).toBe(true);
      });

      it('should hide contributors-partners for P22', () => {
        const fields = service.fields();
        expect(fields['[contributors-partners]-is-lead-by-partner'].hide).toBe(true);
      });

      it('should use P22 label for ost_submitted', () => {
        const fields = service.fields();
        expect(fields['[knowledge-product-info]-ost_submitted'].label).toBe('Was it planned in your Initiative proposal?');
      });

      it('should use P22 label for ost_melia_select', () => {
        const fields = service.fields();
        expect(fields['[knowledge-product-info]-ost_melia_select'].label).toBe('Select MELIA from those included in OST Section 6.3');
      });

      it('should use P22 placeholder for ost_melia_select', () => {
        const fields = service.fields();
        expect(fields['[knowledge-product-info]-ost_melia_select'].placeholder).toBe(
          'Select MELIA from those included in OST Section 6.3'
        );
      });

      it('should hide has_extra_geo_scope for P22', () => {
        const fields = service.fields();
        expect(fields['[geoscope-management]-has_extra_geo_scope'].hide).toBe(true);
      });

      it('should hide extra_geo_scope_id for P22', () => {
        const fields = service.fields();
        expect(fields['[geoscope-management]-extra_geo_scope_id'].hide).toBe(true);
      });
    });
  });

  describe('P25 with innovation result_type_id == 2', () => {
    beforeEach(() => {
      dataControlSE.currentResultSignal.set({ portfolio: 'P25', result_type_id: 2 } as CurrentResult);
    });

    it('isAnInnovation should return true for result_type_id == 2', () => {
      expect(service.isAnInnovation()).toBeTruthy();
    });

    it('should not hide has_extra_geo_scope for P25 innovation', () => {
      const fields = service.fields();
      expect(fields['[geoscope-management]-has_extra_geo_scope'].hide).toBe(false);
    });

    it('should not hide extra_geo_scope_id for P25 innovation type 2', () => {
      const fields = service.fields();
      expect(fields['[geoscope-management]-extra_geo_scope_id'].hide).toBe(false);
    });

    it('should not hide short_title for P25 innovation', () => {
      const fields = service.fields();
      expect(fields['[innovation-dev-info]-short_title'].hide).toBe(false);
    });
  });

  describe('P25 with innovation result_type_id == 7', () => {
    beforeEach(() => {
      dataControlSE.currentResultSignal.set({ portfolio: 'P25', result_type_id: 7 } as CurrentResult);
    });

    it('isAnInnovation should return true for result_type_id == 7', () => {
      expect(service.isAnInnovation()).toBeTruthy();
    });

    it('should not hide has_extra_geo_scope for P25 innovation type 7', () => {
      const fields = service.fields();
      expect(fields['[geoscope-management]-has_extra_geo_scope'].hide).toBe(false);
    });

    it('should not hide extra_geo_scope_id for P25 innovation type 7', () => {
      const fields = service.fields();
      expect(fields['[geoscope-management]-extra_geo_scope_id'].hide).toBe(false);
    });
  });

  describe('P25 with non-innovation result_type_id', () => {
    beforeEach(() => {
      dataControlSE.currentResultSignal.set({ portfolio: 'P25', result_type_id: 3 } as CurrentResult);
    });

    it('isAnInnovation should return false for result_type_id == 3', () => {
      expect(service.isAnInnovation()).toBeFalsy();
    });

    it('should hide has_extra_geo_scope for P25 non-innovation (isP22=false || !isAnInnovation=true)', () => {
      const fields = service.fields();
      expect(fields['[geoscope-management]-has_extra_geo_scope'].hide).toBe(true);
    });

    it('should hide extra_geo_scope_id for P25 non-innovation type', () => {
      const fields = service.fields();
      expect(fields['[geoscope-management]-extra_geo_scope_id'].hide).toBe(true);
    });

    it('should hide short_title for P25 non-innovation (isP22=false || !isAnInnovation=true)', () => {
      const fields = service.fields();
      expect(fields['[innovation-dev-info]-short_title'].hide).toBe(true);
    });
  });

  describe('P22 with innovation result_type_id == 2', () => {
    beforeEach(() => {
      dataControlSE.currentResultSignal.set({ portfolio: 'P22', result_type_id: 2 } as CurrentResult);
    });

    it('isAnInnovation should return true', () => {
      expect(service.isAnInnovation()).toBeTruthy();
    });

    it('should still hide has_extra_geo_scope for P22 even when innovation (isP22=true short-circuits)', () => {
      const fields = service.fields();
      expect(fields['[geoscope-management]-has_extra_geo_scope'].hide).toBe(true);
    });

    it('should still hide extra_geo_scope_id for P22 even when innovation', () => {
      const fields = service.fields();
      expect(fields['[geoscope-management]-extra_geo_scope_id'].hide).toBe(true);
    });

    it('should still hide short_title for P22 even when innovation', () => {
      const fields = service.fields();
      expect(fields['[innovation-dev-info]-short_title'].hide).toBe(true);
    });

    it('should use P22 description for short_title even when innovation', () => {
      const fields = service.fields();
      expect(fields['[innovation-dev-info]-short_title'].description).toContain(
        'You do not need to specify the number of new or improved lines/varieties'
      );
    });
  });

  describe('P25 with non-innovation and short_title description branch', () => {
    beforeEach(() => {
      dataControlSE.currentResultSignal.set({ portfolio: 'P25', result_type_id: 3 } as CurrentResult);
    });

    it('should use P25 description for short_title (not P22 branch)', () => {
      const fields = service.fields();
      expect(fields['[innovation-dev-info]-short_title'].description).toContain(
        'Try to develop a short name that facilitates clear communication'
      );
      expect(fields['[innovation-dev-info]-short_title'].description).not.toContain(
        'You do not need to specify the number of new or improved lines/varieties'
      );
    });
  });

  describe('knowledge product scenarios', () => {
    it('should set description required to false when result is a knowledge product (result_type_id == 6)', () => {
      dataControlSE.currentResultSignal.set({ portfolio: 'P25', result_type_id: 6 } as CurrentResult);
      const fields = service.fields();
      expect(fields['[general-info]-description'].required).toBe(false);
    });

    it('should set description required to true when result is NOT a knowledge product', () => {
      dataControlSE.currentResultSignal.set({ portfolio: 'P25', result_type_id: 1 } as CurrentResult);
      const fields = service.fields();
      expect(fields['[general-info]-description'].required).toBe(true);
    });
  });

  describe('inIpsr signal', () => {
    it('should default to false', () => {
      expect(service.inIpsr()).toBe(false);
    });

    it('should be settable to true', () => {
      service.inIpsr.set(true);
      expect(service.inIpsr()).toBe(true);
    });
  });

  describe('activeIndicatorsLength signal', () => {
    it('should default to 0', () => {
      expect(service.activeIndicatorsLength()).toBe(0);
    });

    it('should be settable', () => {
      service.activeIndicatorsLength.set(5);
      expect(service.activeIndicatorsLength()).toBe(5);
    });
  });

  describe('hasSelectedIndicator signal', () => {
    it('should default to false', () => {
      expect(service.hasSelectedIndicator()).toBe(false);
    });

    it('should be settable to true', () => {
      service.hasSelectedIndicator.set(true);
      expect(service.hasSelectedIndicator()).toBe(true);
    });
  });

  describe('scoresImpactAreaLabel', () => {
    it('should have the correct label value', () => {
      expect(service.scoresImpactAreaLabel).toBe('Which component of the Impact Area is this result intended to impact?');
    });
  });

  describe('fields computed - static properties', () => {
    beforeEach(() => {
      dataControlSE.currentResultSignal.set({ portfolio: 'P25', result_type_id: 1 } as CurrentResult);
    });

    it('should have correct placeholder for title', () => {
      const fields = service.fields();
      expect(fields['[general-info]-title'].placeholder).toBe('Enter text');
    });

    it('should have correct placeholder for description', () => {
      const fields = service.fields();
      expect(fields['[general-info]-description'].placeholder).toBe('Enter text');
    });

    it('should have correct label and placeholder for lead_contact_person', () => {
      const fields = service.fields();
      expect(fields['[general-info]-lead_contact_person'].label).toBe('Lead contact person');
      expect(fields['[general-info]-lead_contact_person'].required).toBe(false);
    });

    it('should have impactAreaField label set to scoresImpactAreaLabel', () => {
      const fields = service.fields();
      expect(fields['[general-info]-gender_impact_area_id'].label).toBe(service.scoresImpactAreaLabel);
    });

    it('should have impactAreaField required set to true', () => {
      const fields = service.fields();
      expect(fields['[general-info]-gender_impact_area_id'].required).toBe(true);
    });

    it('should have tagScoreField required set to true', () => {
      const fields = service.fields();
      expect(fields['[general-info]-nutrition_tag_level_id'].required).toBe(true);
      expect(fields['[general-info]-environmental_biodiversity_tag_level_id'].required).toBe(true);
      expect(fields['[general-info]-poverty_tag_level_id'].required).toBe(true);
    });

    it('should have correct has_extra_geo_scope description and required', () => {
      const fields = service.fields();
      expect(fields['[geoscope-management]-has_extra_geo_scope'].required).toBe(true);
      expect(fields['[geoscope-management]-has_extra_geo_scope'].description).toContain('other geographies');
    });

    it('should have correct short_title placeholder', () => {
      const fields = service.fields();
      expect(fields['[innovation-dev-info]-short_title'].placeholder).toBe('Innovation short name goes here...');
    });

    it('should have innovation-use-form fields with required true', () => {
      const fields = service.fields();
      expect(fields['[innovation-use-form]-has-innovation-link'].required).toBe(true);
      expect(fields['[innovation-use-form]-core-innovation'].required).toBe(true);
      expect(fields['[innovation-use-form]-has-studies-links'].required).toBe(true);
      expect(fields['[innovation-use-form]-2030-to-be-determined'].required).toBe(true);
    });

    it('should have core-innovation description', () => {
      const fields = service.fields();
      expect(fields['[innovation-use-form]-core-innovation'].description).toContain(
        'Depending on the innovation, users may be groups of actors'
      );
    });

    it('should have 2030-to-be-determined description with guidance link', () => {
      const fields = service.fields();
      expect(fields['[innovation-use-form]-2030-to-be-determined'].description).toContain('guidance note');
    });

    it('should have ost_submitted required true', () => {
      const fields = service.fields();
      expect(fields['[knowledge-product-info]-ost_submitted'].required).toBe(true);
    });

    it('should have ost_melia_select required true', () => {
      const fields = service.fields();
      expect(fields['[knowledge-product-info]-ost_melia_select'].required).toBe(true);
    });

    it('should have contributors-partners required true', () => {
      const fields = service.fields();
      expect(fields['[contributors-partners]-is-lead-by-partner'].required).toBe(true);
    });
  });

  describe('edge case: isAnInnovation with only result_type_id == 2 (left side of ||)', () => {
    it('should return true when result_type_id is exactly 2', () => {
      dataControlSE.currentResultSignal.set({ portfolio: 'P25', result_type_id: 2 } as CurrentResult);
      expect(service.isAnInnovation()).toBe(true);
    });
  });

  describe('edge case: isAnInnovation with only result_type_id == 7 (right side of ||)', () => {
    it('should return true when result_type_id is exactly 7', () => {
      dataControlSE.currentResultSignal.set({ portfolio: 'P25', result_type_id: 7 } as CurrentResult);
      expect(service.isAnInnovation()).toBe(true);
    });
  });

  describe('edge case: isAnInnovation with neither 2 nor 7', () => {
    it('should return false when result_type_id is 5', () => {
      dataControlSE.currentResultSignal.set({ portfolio: 'P25', result_type_id: 5 } as CurrentResult);
      expect(service.isAnInnovation()).toBe(false);
    });
  });

  describe('extra_geo_scope_id hide logic: isP22() || (result_type_id != 2 && result_type_id != 7)', () => {
    it('should not hide when P25 and result_type_id == 2', () => {
      dataControlSE.currentResultSignal.set({ portfolio: 'P25', result_type_id: 2 } as CurrentResult);
      const fields = service.fields();
      expect(fields['[geoscope-management]-extra_geo_scope_id'].hide).toBe(false);
    });

    it('should not hide when P25 and result_type_id == 7', () => {
      dataControlSE.currentResultSignal.set({ portfolio: 'P25', result_type_id: 7 } as CurrentResult);
      const fields = service.fields();
      expect(fields['[geoscope-management]-extra_geo_scope_id'].hide).toBe(false);
    });

    it('should hide when P25 and result_type_id is neither 2 nor 7', () => {
      dataControlSE.currentResultSignal.set({ portfolio: 'P25', result_type_id: 4 } as CurrentResult);
      const fields = service.fields();
      expect(fields['[geoscope-management]-extra_geo_scope_id'].hide).toBe(true);
    });

    it('should hide when P22 and result_type_id == 2 (P22 short-circuits to true)', () => {
      dataControlSE.currentResultSignal.set({ portfolio: 'P22', result_type_id: 2 } as CurrentResult);
      const fields = service.fields();
      expect(fields['[geoscope-management]-extra_geo_scope_id'].hide).toBe(true);
    });

    it('should hide when P22 and result_type_id == 7', () => {
      dataControlSE.currentResultSignal.set({ portfolio: 'P22', result_type_id: 7 } as CurrentResult);
      const fields = service.fields();
      expect(fields['[geoscope-management]-extra_geo_scope_id'].hide).toBe(true);
    });
  });

  describe('has_extra_geo_scope hide logic: isP22() || !isAnInnovation()', () => {
    it('should not hide when P25 and innovation type 2', () => {
      dataControlSE.currentResultSignal.set({ portfolio: 'P25', result_type_id: 2 } as CurrentResult);
      const fields = service.fields();
      expect(fields['[geoscope-management]-has_extra_geo_scope'].hide).toBe(false);
    });

    it('should not hide when P25 and innovation type 7', () => {
      dataControlSE.currentResultSignal.set({ portfolio: 'P25', result_type_id: 7 } as CurrentResult);
      const fields = service.fields();
      expect(fields['[geoscope-management]-has_extra_geo_scope'].hide).toBe(false);
    });

    it('should hide when P25 and non-innovation type', () => {
      dataControlSE.currentResultSignal.set({ portfolio: 'P25', result_type_id: 1 } as CurrentResult);
      const fields = service.fields();
      expect(fields['[geoscope-management]-has_extra_geo_scope'].hide).toBe(true);
    });

    it('should hide when P22 and innovation type (P22 short-circuits)', () => {
      dataControlSE.currentResultSignal.set({ portfolio: 'P22', result_type_id: 2 } as CurrentResult);
      const fields = service.fields();
      expect(fields['[geoscope-management]-has_extra_geo_scope'].hide).toBe(true);
    });
  });
});
