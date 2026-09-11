import { TestBed } from '@angular/core/testing';
import { runInInjectionContext, EnvironmentInjector, signal, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { By } from '@angular/platform-browser';
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

  // BUG-T-1 (docs/specs/bugfix/toc-hlo-outcome-locked): renders the REAL template so the test
  // inspects the actual bound `disabled`/`readOnly` DOM properties on the Level select, not just
  // the component-level computed. `NO_ERRORS_SCHEMA` lets the unknown `app-pr-select` custom
  // element through without declaring the whole custom-fields module; property/event bindings on
  // an unrecognized element are set directly as plain DOM properties, which is exactly what we
  // read back below.
  const buildRenderedComponent = (isCP2026: boolean = true) => {
    fieldsManagerMock = {
      isContributorsPartners2026: jest.fn().mockReturnValue(isCP2026),
      isP25: jest.fn().mockReturnValue(false),
      activeIndicatorsLength: signal(0),
      hasSelectedIndicator: signal(false)
    };

    TestBed.configureTestingModule({
      declarations: [CPMultipleWPsContentComponent],
      imports: [CommonModule],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: ResultLevelService, useValue: { currentResultLevelIdSignal: signal(undefined) } },
        { provide: FieldsManagerService, useValue: fieldsManagerMock },
        {
          provide: RdContributorsAndPartnersService,
          useValue: {
            tocSelectionTouched: signal(false),
            tocReferenceCenterInstitutionIds: signal([]),
            tocReferenceSynergyInitiativeIds: signal([]),
            tocReferencePartnerInstitutionIds: signal([]),
            partnersBody: {}
          }
        },
        { provide: TocInitiativeOutcomeListsService, useValue: { tocResultList: signal([]) } },
        { provide: ApiService, useValue: {} },
        { provide: RdTheoryOfChangesServicesService, useValue: {} },
        { provide: MappedResultsModalServiceService, useValue: {} }
      ]
    });

    const injector = TestBed.inject(EnvironmentInjector);
    const fixture = runInInjectionContext(injector, () => TestBed.createComponent(CPMultipleWPsContentComponent));
    const renderedComponent = fixture.componentInstance;
    renderedComponent.activeTabSignal = signal(null);
    renderedComponent.outcomeList = signal([]);
    renderedComponent.outputList = signal([]);
    renderedComponent.eoiList = signal([]);
    return { fixture, component: renderedComponent };
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
  // docs/specs/bugfix/toc-hlo-outcome-locked (BUG-DD-1): P2-3235's `tocAlignmentReadOnly()` lock was
  // reverted per an explicit PO decision — these fields go back to being an always-editable
  // dropdown, gated only by `editable`. The computed and its 4 template bindings were deleted
  // outright (no hardcode-false, no feature flag). See the `BUG-T-1` describe block below for the
  // regression coverage that replaces this suite's old assertions.
  describe('tocAlignmentReadOnly removal (docs/specs/bugfix/toc-hlo-outcome-locked)', () => {
    it('no longer exists on the component', () => {
      buildComponent(true);

      expect((component as any).tocAlignmentReadOnly).toBeUndefined();
    });

    it('the template no longer references tocAlignmentReadOnly anywhere', () => {
      const template = readFileSync(join(__dirname, 'multiple-wps-content.component.html'), 'utf8');

      expect(template).not.toContain('tocAlignmentReadOnly');
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
  /**
   * P2-3608 — the contribution box accepted a negative number and stored it, with no message.
   *
   * Reported by QA on 7 September 2026 with a recording. `min="0"` on its own does not cover it:
   * `<input type="number">` reports `min` through validity, and nothing here reads validity — a
   * typed or pasted `-1` reaches the payload. So the guard is what does the work, and the template
   * assertion below pins that BOTH halves stay wired.
   */
  describe('P2-3608 — a contribution to a target can never be negative', () => {
    const withContribution = (value: any) => {
      const c = buildComponent(true);
      c.activeTab = { indicators: [{ targets: [{ contributing_indicator: value }] }] };
      return c;
    };

    it('clamps a typed negative to 0', () => {
      const c = withContribution(-1);

      c.onContributionToTargetChange();

      expect(c.activeTab.indicators[0].targets[0].contributing_indicator).toBe(0);
    });

    it('leaves a valid figure exactly as typed', () => {
      const c = withContribution(200);

      c.onContributionToTargetChange();

      expect(c.activeTab.indicators[0].targets[0].contributing_indicator).toBe(200);
    });

    // 🥇 An empty box is "not answered", which the mandatory-field scan reads as incomplete.
    // Turning it into 0 would report the field as answered by somebody who never touched it.
    it('does NOT turn an empty box into 0', () => {
      // One component, three values: `buildComponent` configures the TestBed, which can only happen
      // once per test.
      const c = withContribution(null);
      const target = c.activeTab.indicators[0].targets[0];

      for (const empty of [null, undefined, '']) {
        target.contributing_indicator = empty;

        c.onContributionToTargetChange();

        expect(target.contributing_indicator).toBe(empty);
      }
    });

    it('survives a tab that carries no indicator yet', () => {
      const c = buildComponent(true);
      c.activeTab = {};

      expect(() => c.onContributionToTargetChange()).not.toThrow();
    });

    it('keeps both halves wired on the contribution input', () => {
      const template = readFileSync(join(__dirname, 'multiple-wps-content.component.html'), 'utf8');
      const input = (template.match(/<input[\s\S]*?contributing_indicator[\s\S]*?\/>/) ?? [''])[0];

      expect(input).toContain('min="0"');
      expect(input).toContain('(ngModelChange)="onContributionToTargetChange()"');
    });
  });

  /**
   * BUG-T-1 (docs/specs/bugfix/toc-hlo-outcome-locked): P2-3235's `tocAlignmentReadOnly()` lock is
   * reverted per an explicit PO decision (`proposal.md` §11) — the Level/HLO/Outcome/Output
   * selects must stay an always-editable dropdown, gated only by the pre-existing `editable` input
   * and role-based read-only handling inside `app-pr-select`.
   *
   * BUG-TEST-1 renders the REAL template (`fixture.detectChanges()`) and reads the Level select's
   * actual bound `disabled`/`readOnly` DOM properties in the exact state that used to lock them —
   * satisfying the no-pass clause in `tasks.md` (a presence-only assertion that the computed is
   * gone from the `.ts` source would not be enough).
   */
  describe('BUG-T-1 — ToC HLO/Outcome selector must stay editable', () => {
    const lockedTab = { toc_level_id: 2, toc_result_id: 'toc-77', planned_result: true, indicators: [{ related_node_id: null, targets: [{}] }] };

    it('BUG-TEST-1: the Level select is enabled and not read-only in the previously-locked state (2026, planned, ToC-mapped, editable, non-read-only)', () => {
      const { fixture, component: rendered } = buildRenderedComponent(true);
      rendered.editable = true;
      rendered.isUnplanned = false;
      rendered.activeTab = { ...lockedTab };
      rendered.activeTabSignal.set({ ...lockedTab });

      fixture.detectChanges();

      const levelSelect = fixture.debugElement.query(By.css('[data-testid="cp-toc-level-select"]'));
      expect(levelSelect).toBeTruthy();
      expect(levelSelect.nativeElement.disabled).toBeFalsy();
      expect(levelSelect.nativeElement.readOnly).toBeFalsy();
    });

    it('BUG-TEST-2: an editable=false section still disables the Level select, independent of the removed ToC lock (BUG-AC-2, no over-fix)', () => {
      const { fixture, component: rendered } = buildRenderedComponent(true);
      rendered.editable = false;
      rendered.isUnplanned = false;
      rendered.activeTab = { ...lockedTab };
      rendered.activeTabSignal.set({ ...lockedTab });

      fixture.detectChanges();

      const levelSelect = fixture.debugElement.query(By.css('[data-testid="cp-toc-level-select"]'));
      expect(levelSelect).toBeTruthy();
      expect(levelSelect.nativeElement.disabled).toBeTruthy();
    });
  });
});
