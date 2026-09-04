import { TestBed } from '@angular/core/testing';
import { runInInjectionContext, EnvironmentInjector, signal } from '@angular/core';
import { CPMultipleWPsContentComponent } from './multiple-wps-content.component';
import { ResultLevelService } from '../../../../../../../../../../pages/results/pages/result-creator/services/result-level.service';
import { FieldsManagerService } from '../../../../../../../../../../shared/services/fields-manager.service';
import { RdContributorsAndPartnersService } from '../../../../rd-contributors-and-partners.service';
import { TocInitiativeOutcomeListsService } from '../../../../../rd-theory-of-change/components/toc-initiative-outcome-section/services/toc-initiative-outcome-lists.service';
import { ApiService } from '../../../../../../../../../../shared/services/api/api.service';
import { RdTheoryOfChangesServicesService } from '../../../../../rd-theory-of-change/rd-theory-of-changes-services.service';
import { MappedResultsModalServiceService } from '../mapped-results-modal/mapped-results-modal-service.service';
import { readFileSync } from 'fs';
import { join } from 'path';

jest.useFakeTimers();

describe('CPMultipleWPsContentComponent', () => {
  let component: CPMultipleWPsContentComponent;
  let fieldsManagerMock: any;

  // P2-3204: only the collaborators the constructor / field initializers touch are mocked. The typology
  // computed reads a single signal (`selectedIndicatorData`), so the rest can stay inert.
  const buildComponent = (isCP2026: boolean = true) => {
    fieldsManagerMock = {
      isContributorsPartners2026: jest.fn().mockReturnValue(isCP2026),
      isP25: jest.fn().mockReturnValue(false),
      activeIndicatorsLength: signal(0),
      hasSelectedIndicator: signal(false)
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: ResultLevelService, useValue: {} },
        { provide: FieldsManagerService, useValue: fieldsManagerMock },
        {
          provide: RdContributorsAndPartnersService,
          useValue: {
            tocSelectionTouched: signal(false),
            tocReferenceCenterInstitutionIds: signal([]),
            tocReferenceSynergyInitiativeIds: signal([]),
            tocReferencePartnerInstitutionIds: signal([]),
            // P2-2932: the consistency check rides on the Section 2 payload.
            partnersBody: {}
          }
        },
        { provide: TocInitiativeOutcomeListsService, useValue: {} },
        { provide: ApiService, useValue: {} },
        { provide: RdTheoryOfChangesServicesService, useValue: {} },
        { provide: MappedResultsModalServiceService, useValue: {} }
      ]
    });

    const injector = TestBed.inject(EnvironmentInjector);
    component = runInInjectionContext(injector, () => TestBed.createComponent(CPMultipleWPsContentComponent).componentInstance);
    component.activeTabSignal = signal(null);
    component.outcomeList = signal([]);
    component.outputList = signal([]);
    component.eoiList = signal([]);
    return component;
  };

  afterEach(() => {
    TestBed.resetTestingModule();
    jest.clearAllMocks();
  });

  // P2-3204: the five shapes the TOC actually returns, taken from a census of 59 KPIs in prtest (SP01-SP07).
  describe('indicatorTypologyValue (P2-3204)', () => {
    it('should show the sentinel and the real KPI name together', () => {
      buildComponent();
      component.selectedIndicatorData.set({
        type_value: 'custom',
        type_name: '# partners supporting changes to more gender-equitable norms',
        indicator_typology: 'custom'
      } as any);

      expect(component.indicatorTypologyValue()).toBe('custom — # partners supporting changes to more gender-equitable norms');
    });

    it('should not repeat the value when sentinel and name are identical', () => {
      buildComponent();
      component.selectedIndicatorData.set({
        type_value: 'Innovation Use',
        type_name: 'Innovation Use',
        indicator_typology: 'Innovation Use'
      } as any);

      expect(component.indicatorTypologyValue()).toBe('Innovation Use');
    });

    it('should fall through to the type name when the sentinel is empty', () => {
      buildComponent();
      component.selectedIndicatorData.set({
        type_value: '',
        type_name: 'Number of food producers using CGIAR innovations.',
        indicator_typology: ''
      } as any);

      expect(component.indicatorTypologyValue()).toBe('Number of food producers using CGIAR innovations.');
    });

    it('should fall back to the sentinel when the type name is missing', () => {
      buildComponent();
      component.selectedIndicatorData.set({ type_value: 'Innovation Use' } as any);

      expect(component.indicatorTypologyValue()).toBe('Innovation Use');
    });

    it('should fall back to the indicator_typology alias as a last resort', () => {
      buildComponent();
      component.selectedIndicatorData.set({ indicator_typology: 'Innovation Use' } as any);

      expect(component.indicatorTypologyValue()).toBe('Innovation Use');
    });

    it('should keep both values when the sentinel carries a dirty prefix', () => {
      buildComponent();
      component.selectedIndicatorData.set({
        type_value: '_n_Realized genetic gains in farmer-relevant conditions.',
        type_name: 'Realized genetic gains in farmer-relevant conditions.'
      } as any);

      expect(component.indicatorTypologyValue()).toBe(
        '_n_Realized genetic gains in farmer-relevant conditions. — Realized genetic gains in farmer-relevant conditions.'
      );
    });

    it('should return an empty string when the TOC has no typology at all', () => {
      buildComponent();
      component.selectedIndicatorData.set({ type_value: '', type_name: null } as any);

      expect(component.indicatorTypologyValue()).toBe('');
    });

    it('should ignore whitespace-only values and trim each part', () => {
      buildComponent();
      component.selectedIndicatorData.set({ type_name: '   ', type_value: '  Innovation Use  ' } as any);

      expect(component.indicatorTypologyValue()).toBe('Innovation Use');
    });

    it('should return an empty string when no indicator is selected', () => {
      buildComponent();
      component.selectedIndicatorData.set(null);

      expect(component.indicatorTypologyValue()).toBe('');
    });
  });

  describe('indicatorTypologyDisplay (P2-3204)', () => {
    it('should show "Not specified" when no typology can be resolved, matching the sibling read-only fields', () => {
      buildComponent();
      component.selectedIndicatorData.set({ type_value: '', type_name: '' } as any);

      expect(component.indicatorTypologyDisplay()).toBe('Not specified');
    });

    it('should show the resolved typology when there is one', () => {
      buildComponent();
      component.selectedIndicatorData.set({ type_name: 'Innovation Use' } as any);

      expect(component.indicatorTypologyDisplay()).toBe('Innovation Use');
    });

    it('should show both values joined when they differ', () => {
      buildComponent();
      component.selectedIndicatorData.set({ type_value: 'custom', type_name: 'Other outcome' } as any);

      expect(component.indicatorTypologyDisplay()).toBe('custom — Other outcome');
    });
  });

  describe('indicatorTypologyTooltip', () => {
    it('should expose the TOC mapping hint in the 2026 phase', () => {
      buildComponent(true);

      expect(component.indicatorTypologyTooltip()).toBe('Maps to TOC: [Type]');
    });

    it('should stay empty outside the 2026 phase', () => {
      buildComponent(false);

      expect(component.indicatorTypologyTooltip()).toBe('');
    });
  });
  // P2-3235: the ToC alignment written by the Results Framework module is reflected here read-only.
  describe('tocAlignmentReadOnly (P2-3235)', () => {
    const alignedTab = { toc_level_id: 2, toc_result_id: 'toc-77' };

    it('should lock the alignment when the tab already carries a level and a node', () => {
      buildComponent(true);
      component.activeTabSignal.set(alignedTab);

      expect(component.tocAlignmentReadOnly()).toBe(true);
    });

    // Ángel widened the ask past Intermediate Outcomes (level 2) on 28-Aug: HLO and 2030 Outcomes lock too.
    it.each([
      ['HLO / output', 1],
      ['Intermediate Outcome', 2],
      ['2030 Outcome / EOI', 3]
    ])('should lock every ToC level — %s', (_label, tocLevelId) => {
      buildComponent(true);
      component.activeTabSignal.set({ toc_level_id: tocLevelId, toc_result_id: 'toc-77' });

      expect(component.tocAlignmentReadOnly()).toBe(true);
    });

    // Locking an empty tab would leave the result unable to be aligned at all.
    it('should stay editable when no node has been selected yet', () => {
      buildComponent(true);
      component.activeTabSignal.set({ toc_level_id: 2, toc_result_id: null });

      expect(component.tocAlignmentReadOnly()).toBe(false);
    });

    it('should stay editable when the level is missing', () => {
      buildComponent(true);
      component.activeTabSignal.set({ toc_level_id: null, toc_result_id: 'toc-77' });

      expect(component.tocAlignmentReadOnly()).toBe(false);
    });

    // An empty string is what a cleared dropdown writes back, and it is not an alignment.
    it('should treat an empty string as no selection', () => {
      buildComponent(true);
      component.activeTabSignal.set({ toc_level_id: 2, toc_result_id: '' });

      expect(component.tocAlignmentReadOnly()).toBe(false);
    });

    // The gate is the PHASE YEAR (isCP2026), never the portfolio flag (isP25).
    it('should not lock anything outside the 2026 phase', () => {
      buildComponent(false);
      component.activeTabSignal.set(alignedTab);

      expect(component.tocAlignmentReadOnly()).toBe(false);
    });

    it('should not lock the unplanned (No) scenario', () => {
      buildComponent(true);
      component.isUnplanned = true;
      component.activeTabSignal.set(alignedTab);

      expect(component.tocAlignmentReadOnly()).toBe(false);
    });

    it('should fall back to the plain activeTab when the signal has not been set', () => {
      buildComponent(true);
      component.activeTabSignal.set(null);
      component.activeTab = alignedTab;

      expect(component.tocAlignmentReadOnly()).toBe(true);
    });
  });

  // P2-3235: the requirement is level-generic. A new @switch branch that forgets the lock would
  // silently reopen Section 2 as a second writer for that level, and no class-level test would see it.
  describe('template wiring (P2-3235)', () => {
    const template = readFileSync(join(__dirname, 'multiple-wps-content.component.html'), 'utf8');

    it('should bind readOnly on every node select and on the Level select', () => {
      const selects = template.match(/<app-pr-select[\s\S]*?<\/app-pr-select>/g) ?? [];
      const nodeSelects = selects.filter(block => /\[\(ngModel\)\]="activeTab\.(toc_level_id|toc_result_id)"/.test(block));

      // Level + the three per-level node dropdowns.
      expect(nodeSelects).toHaveLength(4);
      nodeSelects.forEach(block => {
        expect(block).toContain('[readOnly]="tocAlignmentReadOnly()"');
        expect(block).toContain('tocAlignmentReadOnly()');
      });
    });
  });

  /**
   * P2-2932 — the Section 2 vs Section 4 consistency warning.
   *
   * Advisory: it never rewrites the field and never blocks saving. The single exception the PO
   * carved out is a Knowledge Product outside 0/1 (AC1); AC6 governs everything else and says the
   * system must not block.
   */
  describe('P2-2932 — the contribution consistency warning', () => {
    const withCheck = (check: any) => {
      const c = buildComponent(true);
      (c.rdPartnersSE as any).partnersBody = { contribution_consistency: check };
      return c;
    };

    it('says nothing when the two figures agree', () => {
      const c = withCheck({ status: 'MATCH', expected: 200, reported: 200, boxesCounted: 1 });

      expect(c.showContributionCheck()).toBe(false);
    });

    // The tooltip under the field tells the user to enter 0 for an enabler KP. Warning about it
    // would fire at someone for following the instruction printed beside the input.
    it('says nothing about the documented 0 on a Knowledge Product', () => {
      const c = withCheck({ status: 'ALLOWED_EXCEPTION', expected: 1, reported: 0, boxesCounted: 1 });

      expect(c.showContributionCheck()).toBe(false);
    });

    it('says nothing when there is nothing to compare', () => {
      const c = withCheck({ status: 'NOTHING_TO_COMPARE', expected: null, reported: null, boxesCounted: 0 });

      expect(c.showContributionCheck()).toBe(false);
    });

    it('says nothing when the payload carries no check at all', () => {
      const c = buildComponent(true);
      (c.rdPartnersSE as any).partnersBody = {};

      expect(c.showContributionCheck()).toBe(false);
      expect(c.contributionCheckMessage()).toBe('');
    });

    it('warns on a real disagreement, naming both figures', () => {
      const c = withCheck({ status: 'DIFFERS', expected: 200, reported: 150, boxesCounted: 1 });

      expect(c.showContributionCheck()).toBe(true);
      expect(c.contributionIsRejected()).toBe(false);
      expect(c.contributionCheckMessage()).toContain('150');
      expect(c.contributionCheckMessage()).toContain('200');
    });

    /**
     * With several indicators the user needs to know the figure is a total, not one box — the PO's
     * rule is that the boxes sum (120 + 80 = 200 against Section 4).
     */
    it('says the figure is a total when several indicators were added up', () => {
      const c = withCheck({ status: 'DIFFERS', expected: 200, reported: 150, boxesCounted: 3 });

      expect(c.contributionCheckMessage()).toContain('across 3 indicators');
    });

    it('does not call it a total when only one box was counted', () => {
      const c = withCheck({ status: 'DIFFERS', expected: 200, reported: 150, boxesCounted: 1 });

      expect(c.contributionCheckMessage()).not.toContain('across');
    });

    it('marks a Knowledge Product outside 0/1 as a rejection, not a warning', () => {
      const c = withCheck({ status: 'REJECTED', expected: 1, reported: 7, boxesCounted: 1 });

      expect(c.contributionIsRejected()).toBe(true);
      expect(c.showContributionCheck()).toBe(true);
      expect(c.contributionCheckMessage()).toContain('7');
      expect(c.contributionCheckMessage()).toContain('single unit');
    });
  });
});
