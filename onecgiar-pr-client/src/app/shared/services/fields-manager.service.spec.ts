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

  /**
   * P2-3201 (INC-158283): the reporting-form guidance redesign is scoped to the current portfolio,
   * so the threshold is the phase year — not the P22/P25 portfolio acronym, which 2025 results share.
   */
  describe('isReportingFormGuidance2026', () => {
    it('is true from the 2026 phase on', () => {
      dataControlSE.currentResultSignal.set({ portfolio: 'P25', phase_year: 2026 } as any);
      expect(service.isReportingFormGuidance2026()).toBe(true);
    });

    it('is false for a 2025 result, even on the P25 portfolio', () => {
      dataControlSE.currentResultSignal.set({ portfolio: 'P25', phase_year: 2025 } as any);
      expect(service.isReportingFormGuidance2026()).toBe(false);
    });

    it('is false when no phase year is known anywhere', () => {
      dataControlSE.currentResultSignal.set({ portfolio: 'P25' } as any);
      dataControlSE.reportingCurrentPhase = undefined as any;
      expect(service.isReportingFormGuidance2026()).toBe(false);
    });

    it('falls back to the open reporting phase when the result carries no year', () => {
      dataControlSE.currentResultSignal.set({ portfolio: 'P25' } as any);
      dataControlSE.reportingCurrentPhase = { phaseYear: 2026 } as any;
      expect(service.isReportingFormGuidance2026()).toBe(true);
    });

    it('renames the description label only from 2026 on', () => {
      dataControlSE.currentResultSignal.set({ portfolio: 'P25', phase_year: 2025 } as any);
      expect(service.fields()['[general-info]-description'].label).toBe('Description');

      dataControlSE.currentResultSignal.set({ portfolio: 'P25', phase_year: 2026 } as any);
      expect(service.fields()['[general-info]-description'].label).toBe('Description of Result');
    });
  });

  /**
   * P2-3225: Lead Contact Person becomes a mandatory MDS field. Unlike the other 2026 thresholds
   * this one is gated on BOTH the portfolio and the phase year — P22 keeps it optional at any year,
   * and P25 results from the closed 2025 cycle keep it optional too.
   */
  /**
   * P2-3036. The Contributors & Partners section is rebuilt from the 2026 cycle on (new layout,
   * labels and validations); 2025 and earlier keep the legacy UI with whatever was answered.
   *
   * 🛑 The gate is the reporting phase YEAR, never the portfolio: `isP25()` answers "which
   * portfolio", and the test environment holds 2025-phase results INSIDE the P25 portfolio, which
   * a portfolio gate would hand the redesigned form to — breaking the epic's retro-compatibility
   * rule. Its consumers all mock this signal, so nothing else pins the fallback chain down.
   */
  describe('isContributorsPartners2026', () => {
    it('is true from the 2026 phase on', () => {
      dataControlSE.currentResultSignal.set({ portfolio: 'P25', phase_year: 2026 } as any);
      expect(service.isContributorsPartners2026()).toBe(true);
    });

    it('is false for a 2025-phase result, which keeps the legacy section', () => {
      dataControlSE.currentResultSignal.set({ portfolio: 'P25', phase_year: 2025 } as any);
      expect(service.isContributorsPartners2026()).toBe(false);
    });

    it('is false for a 2025-phase result even inside the P25 portfolio — the case a portfolio gate would break', () => {
      dataControlSE.currentResultSignal.set({ portfolio: 'P25', phase_year: 2025 } as any);
      expect(service.isP25()).toBe(true);
      expect(service.isContributorsPartners2026()).toBe(false);
    });

    it('is true for a 2026-phase P22 result — the redesign follows the phase, not the portfolio', () => {
      dataControlSE.currentResultSignal.set({ portfolio: 'P22', phase_year: 2026 } as any);
      expect(service.isContributorsPartners2026()).toBe(true);
    });

    it('falls back to the open reporting phase when the result carries no year', () => {
      dataControlSE.currentResultSignal.set({ portfolio: 'P25' } as any);
      dataControlSE.reportingCurrentPhase = { phaseYear: 2026 } as any;
      expect(service.isContributorsPartners2026()).toBe(true);
    });

    it('is false when neither the result nor the open phase carries a year', () => {
      dataControlSE.currentResultSignal.set({ portfolio: 'P25' } as any);
      dataControlSE.reportingCurrentPhase = undefined as any;
      expect(service.isContributorsPartners2026()).toBe(false);
    });

    it('is false when the year arrives as a string, so a bad payload cannot flip the form', () => {
      dataControlSE.currentResultSignal.set({ portfolio: 'P25', phase_year: '2026' } as any);
      expect(service.isContributorsPartners2026()).toBe(false);
    });
  });

  /**
   * P2-3036 AC9. The Geographic location section switches to the "location of benefit" wording in
   * the 2026 cycle. Same shape and same trap as the gate above: phase year, not portfolio.
   */
  describe('isGeographicLocation2026', () => {
    it('is true from the 2026 phase on', () => {
      dataControlSE.currentResultSignal.set({ portfolio: 'P25', phase_year: 2026 } as any);
      expect(service.isGeographicLocation2026()).toBe(true);
    });

    it('is false for a 2025-phase result, which keeps the legacy wording', () => {
      dataControlSE.currentResultSignal.set({ portfolio: 'P25', phase_year: 2025 } as any);
      expect(service.isGeographicLocation2026()).toBe(false);
    });

    it('is false for a 2025-phase result even inside the P25 portfolio — the case a portfolio gate would break', () => {
      dataControlSE.currentResultSignal.set({ portfolio: 'P25', phase_year: 2025 } as any);
      expect(service.isP25()).toBe(true);
      expect(service.isGeographicLocation2026()).toBe(false);
    });

    it('is true for a 2026-phase P22 result — the wording follows the phase, not the portfolio', () => {
      dataControlSE.currentResultSignal.set({ portfolio: 'P22', phase_year: 2026 } as any);
      expect(service.isGeographicLocation2026()).toBe(true);
    });

    it('falls back to the open reporting phase when the result carries no year', () => {
      dataControlSE.currentResultSignal.set({ portfolio: 'P25' } as any);
      dataControlSE.reportingCurrentPhase = { phaseYear: 2026 } as any;
      expect(service.isGeographicLocation2026()).toBe(true);
    });

    it('is false when neither the result nor the open phase carries a year', () => {
      dataControlSE.currentResultSignal.set({ portfolio: 'P25' } as any);
      dataControlSE.reportingCurrentPhase = undefined as any;
      expect(service.isGeographicLocation2026()).toBe(false);
    });

    it('is false when the year arrives as a string, so a bad payload cannot flip the wording', () => {
      dataControlSE.currentResultSignal.set({ portfolio: 'P25', phase_year: '2026' } as any);
      expect(service.isGeographicLocation2026()).toBe(false);
    });
  });

  /**
   * P2-3263 / P2-3264 (epic P2-3243). The Innovation Development form drops the "Demand of anticipated
   * innovation user" section and the Megatrends question from 2026 on. The gate is the reporting phase
   * YEAR, not the portfolio: `isP25()` answers "which portfolio", and the test environment holds
   * 2025-phase results inside the P25 portfolio, which a portfolio gate would strip the section from.
   */
  describe('isInnovationDevFormReduced2026', () => {
    it('is true for a 2026-phase result, so both blocks are dropped', () => {
      dataControlSE.currentResultSignal.set({ portfolio: 'P25', phase_year: 2026 } as any);
      expect(service.isInnovationDevFormReduced2026()).toBe(true);
    });

    it('is false for a 2025-phase result, which keeps both blocks', () => {
      dataControlSE.currentResultSignal.set({ portfolio: 'P25', phase_year: 2025 } as any);
      expect(service.isInnovationDevFormReduced2026()).toBe(false);
    });

    it('is false for a 2025-phase result even inside the P25 portfolio — the case a portfolio gate would break', () => {
      dataControlSE.currentResultSignal.set({ portfolio: 'P25', phase_year: 2025 } as any);
      expect(service.isP25()).toBe(true);
      expect(service.isInnovationDevFormReduced2026()).toBe(false);
    });

    it('is true for a 2026-phase P22 result — the reduction follows the phase, not the portfolio', () => {
      dataControlSE.currentResultSignal.set({ portfolio: 'P22', phase_year: 2026 } as any);
      expect(service.isInnovationDevFormReduced2026()).toBe(true);
    });

    it('falls back to the open reporting phase when the result carries no year', () => {
      dataControlSE.currentResultSignal.set({ portfolio: 'P25' } as any);
      dataControlSE.reportingCurrentPhase = { phaseYear: 2026 } as any;
      expect(service.isInnovationDevFormReduced2026()).toBe(true);
    });

    it('is false when neither the result nor the open phase carries a year', () => {
      dataControlSE.currentResultSignal.set({ portfolio: 'P25' } as any);
      dataControlSE.reportingCurrentPhase = undefined as any;
      expect(service.isInnovationDevFormReduced2026()).toBe(false);
    });
  });

  /**
   * P2-3272 Part 4 (epic P2-3243). "Innovation Developer" is pre-filled from the Lead contact person
   * and loses its guidance note from 2026 on. The gate is the reporting phase YEAR, not the portfolio:
   * prtest holds 2025-phase results inside P25, which a portfolio gate would pre-fill too.
   */
  describe('isInnovationDeveloperAutoFilled2026', () => {
    it('is true for a 2026-phase result', () => {
      dataControlSE.currentResultSignal.set({ portfolio: 'P25', phase_year: 2026 } as any);
      expect(service.isInnovationDeveloperAutoFilled2026()).toBe(true);
    });

    it('is false for a 2025-phase result even inside the P25 portfolio — the case a portfolio gate would break', () => {
      dataControlSE.currentResultSignal.set({ portfolio: 'P25', phase_year: 2025 } as any);
      expect(service.isP25()).toBe(true);
      expect(service.isInnovationDeveloperAutoFilled2026()).toBe(false);
    });

    it("is false when phase_year arrives as a string, since '2026' >= 2026 would be a coercion", () => {
      dataControlSE.currentResultSignal.set({ portfolio: 'P25', phase_year: '2026' } as any);
      expect(service.isInnovationDeveloperAutoFilled2026()).toBe(false);
    });

    it('falls back to the open reporting phase when the result carries no year', () => {
      dataControlSE.currentResultSignal.set({ portfolio: 'P25' } as any);
      dataControlSE.reportingCurrentPhase = { phaseYear: 2026 } as any;
      expect(service.isInnovationDeveloperAutoFilled2026()).toBe(true);
    });

    it('is false when neither the result nor the open phase carries a year', () => {
      dataControlSE.currentResultSignal.set({ portfolio: 'P25' } as any);
      dataControlSE.reportingCurrentPhase = undefined as any;
      expect(service.isInnovationDeveloperAutoFilled2026()).toBe(false);
    });
  });

  /**
   * P2-3295 (epic P2-3243). The Innovation Use 2030 block is renamed "2030 Use Projection" and gains the
   * projection tooltip from 2026 on. The gate is the reporting phase YEAR, not the portfolio: the test
   * environment holds 2025-phase results inside the P25 portfolio, which a portfolio gate would rename too.
   */
  describe('isInnovationUse2030Projection2026', () => {
    it('is true for a 2026-phase result', () => {
      dataControlSE.currentResultSignal.set({ portfolio: 'P25', phase_year: 2026 } as any);
      expect(service.isInnovationUse2030Projection2026()).toBe(true);
    });

    it('is true for a 2026-phase P22 result — the rename follows the phase, not the portfolio', () => {
      dataControlSE.currentResultSignal.set({ portfolio: 'P22', phase_year: 2026 } as any);
      expect(service.isInnovationUse2030Projection2026()).toBe(true);
    });

    it('is false for a 2025-phase result even inside the P25 portfolio — the case a portfolio gate would break', () => {
      dataControlSE.currentResultSignal.set({ portfolio: 'P25', phase_year: 2025 } as any);
      expect(service.isP25()).toBe(true);
      expect(service.isInnovationUse2030Projection2026()).toBe(false);
    });

    it("is false when phase_year arrives as a string, since '2026' >= 2026 would be a coercion", () => {
      dataControlSE.currentResultSignal.set({ portfolio: 'P25', phase_year: '2026' } as any);
      expect(service.isInnovationUse2030Projection2026()).toBe(false);
    });

    it('is false when neither the result nor the open phase carries a year', () => {
      dataControlSE.currentResultSignal.set({ portfolio: 'P25' } as any);
      dataControlSE.reportingCurrentPhase = undefined as any;
      expect(service.isInnovationUse2030Projection2026()).toBe(false);
    });

    it('falls back to the open reporting phase when the result carries no year', () => {
      dataControlSE.currentResultSignal.set({ portfolio: 'P25' } as any);
      dataControlSE.reportingCurrentPhase = { phaseYear: 2026 } as any;
      expect(service.isInnovationUse2030Projection2026()).toBe(true);
    });

    it('renames the 2030 block title from the 2026 phase on', () => {
      dataControlSE.currentResultSignal.set({ portfolio: 'P25', phase_year: 2026 } as any);
      expect(service.fields()['[innovation-use-form]-2030-to-be-determined'].label).toBe('2030 Use Projection');
    });

    it('keeps the legacy 2030 block title verbatim for a 2025-phase result', () => {
      dataControlSE.currentResultSignal.set({ portfolio: 'P25', phase_year: 2025 } as any);
      expect(service.fields()['[innovation-use-form]-2030-to-be-determined'].label).toBe(
        'Specify the targeted innovation use of the core innovation by end of 2030, supported by projections or evidence where available'
      );
    });

    it('exposes the projection tooltip verbatim from the 2026 phase on', () => {
      dataControlSE.currentResultSignal.set({ portfolio: 'P25', phase_year: 2026 } as any);
      expect(service.innovationUse2030ProjectionTooltip()).toBe(
        "This projection informs CGIAR's investment case and impact modeling. It must be reviewed and, if necessary, revised annually based on current evidence."
      );
    });

    it('exposes no tooltip for a 2025-phase result, so the \u24d8 button is not painted', () => {
      dataControlSE.currentResultSignal.set({ portfolio: 'P25', phase_year: 2025 } as any);
      expect(service.innovationUse2030ProjectionTooltip()).toBe('');
    });
  });

  describe('isLeadContactPersonMandatory2026', () => {
    it('is true for a P25 result from the 2026 phase on', () => {
      dataControlSE.currentResultSignal.set({ portfolio: 'P25', phase_year: 2026 } as any);
      expect(service.isLeadContactPersonMandatory2026()).toBe(true);
      expect(service.fields()['[general-info]-lead_contact_person'].required).toBe(true);
    });

    it('is false for a 2025 P25 result, since that cycle is closed', () => {
      dataControlSE.currentResultSignal.set({ portfolio: 'P25', phase_year: 2025 } as any);
      expect(service.isLeadContactPersonMandatory2026()).toBe(false);
      expect(service.fields()['[general-info]-lead_contact_person'].required).toBe(false);
    });

    it('is false for P22 even in a 2026 phase', () => {
      dataControlSE.currentResultSignal.set({ portfolio: 'P22', phase_year: 2026 } as any);
      expect(service.isLeadContactPersonMandatory2026()).toBe(false);
      expect(service.fields()['[general-info]-lead_contact_person'].required).toBe(false);
    });

    it('falls back to the open reporting phase when the result carries no year', () => {
      dataControlSE.currentResultSignal.set({ portfolio: 'P25' } as any);
      dataControlSE.reportingCurrentPhase = { phaseYear: 2026 } as any;
      expect(service.isLeadContactPersonMandatory2026()).toBe(true);
    });

    it('is false when no phase year is known anywhere', () => {
      dataControlSE.currentResultSignal.set({ portfolio: 'P25' } as any);
      dataControlSE.reportingCurrentPhase = undefined as any;
      expect(service.isLeadContactPersonMandatory2026()).toBe(false);
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

      it('should not require lead_contact_person for P22', () => {
        const fields = service.fields();
        expect(fields['[general-info]-lead_contact_person'].required).toBe(false);
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
      // phase_year is part of the fixture because Lead Contact Person is only mandatory from the
      // 2026 phase on (P2-3225) — without it the field would fall back to optional.
      dataControlSE.currentResultSignal.set({ portfolio: 'P25', result_type_id: 1, phase_year: 2026 } as CurrentResult);
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
      expect(fields['[general-info]-lead_contact_person'].required).toBe(true);
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

    it('P2-3358: serves the single linked/bundled question, not the innovation-specific wording', () => {
      const fields = service.fields();
      expect(fields['[innovation-use-form]-has-innovation-link'].label).toBe(
        'Is this result linked or bundled with another CGIAR-reported result (such as innovation, KP, policy, etc.)?'
      );
      expect(fields['[innovation-use-form]-has-innovation-link'].label).not.toContain('Is this innovation');
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

    // P2-3199: the duplicated '[contributors-partners]-is-lead-by-partner' definition was removed.
    // Contributors and partners renders the question through the key asserted above.
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
