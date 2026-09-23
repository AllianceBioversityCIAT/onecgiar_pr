import { readFileSync } from 'fs';
import { join } from 'path';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { LabReportFormComponent } from './lab-report-form.component';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { CentersService } from '../../../../../../shared/services/global/centers.service';
import { ResultLevelService } from '../../../../../results/pages/result-creator/services/result-level.service';
import { ResultFrameworkReportingHomeService } from '../../../result-framework-reporting-home/services/result-framework-reporting-home.service';
import { NO_ERRORS_SCHEMA, WritableSignal, computed, signal } from '@angular/core';
// @akili-spec changes/progress-tracker-pull-bridge/progress-tracker-results-browse (PTB-T-3)
import { ResultsApiService } from '../../../../../../shared/services/api/results-api.service';
import { PtProposalDto } from './components/pt-results-browse/pt-results-browse.component';

/**
 * The template is replaced with an empty one on purpose: these tests are about the rules the form
 * enforces (which category branch is live, what blocks a save, what state survives a category
 * change), not about the custom-field controls, which are covered by their own Cypress component
 * specs. Rendering them here would drag half the design system into jsdom for no extra coverage.
 */

const OUTPUT_LEVEL = 4;

/** `phaseYear` drives the 2026 gate of P2-3420. Left undefined it falls back to the calendar year. */
function makeApiMock(phaseYear?: number) {
  return {
    dataControlSE: phaseYear == null ? undefined : { reportingCurrentPhase: { phaseYear } },
    resultsSE: {
      GET_AllInitiatives: jest.fn().mockReturnValue(of({ response: [] })),
      GET_W3BilateralProjectsByProgram: jest.fn().mockReturnValue(of({ response: [] })),
      GET_mqapValidation: jest.fn().mockReturnValue(of({ response: { title: 'Retrieved title', metadata: [{ source: 'CGSpace' }] } })),
      POST_createResult: jest.fn().mockReturnValue(of({ response: { result: { result_code: 'R-1', version_id: 9 } } })),
      // P2-3420 — catalogue behind the link-to-a-QA'd-innovation dropdown.
      GET_qaInnovationDevelopmentResults: jest.fn().mockReturnValue(
        of({
          response: [{ id: 501, result_code: 5501, title: 'Drought-tolerant bean variety', status_id: 2, phase_year: 2025, acronym: 'P25' }]
        })
      )
    },
    alertsFe: { show: jest.fn() }
  };
}

describe('LabReportFormComponent', () => {
  let fixture: ComponentFixture<LabReportFormComponent>;
  let component: LabReportFormComponent;
  let api: ReturnType<typeof makeApiMock>;
  let resultLevelSig: ReturnType<typeof signal<any[]>>;

  type SetupOptions = {
    phaseYear?: number;
    centersService?: { getData: () => Promise<any>; centersList: any[]; centers?: WritableSignal<any[]> };
    homeService?: any;
  };

  async function setup(inputs: Record<string, any> = {}, phaseYearOrOptions?: number | SetupOptions) {
    const options: SetupOptions =
      typeof phaseYearOrOptions === 'number' ? { phaseYear: phaseYearOrOptions } : (phaseYearOrOptions ?? {});
    api = makeApiMock(options.phaseYear);
    resultLevelSig = signal<any[]>([]);
    const outputOutcomeLevelsSig = computed(() => {
      const levels = resultLevelSig();
      return levels.length < 4 ? [] : levels.slice(2, 4).reverse();
    });
    // P2-3554: the component reads `centers()`, the signal. The service writes it together with
    // `centersList`, so a mock that carries only the plain array is not the service — and that gap is what
    // let the stale-cache bug through unnoticed here.
    const centersMock = options.centersService ?? { getData: () => Promise.resolve(), centersList: [], centers: signal<any[]>([]) };

    await TestBed.configureTestingModule({
      imports: [LabReportFormComponent],
      providers: [
        { provide: ApiService, useValue: api },
        { provide: CentersService, useValue: centersMock },
        { provide: ResultLevelService, useValue: { resultLevelListSig: resultLevelSig, outputOutcomeLevelsSig } },
        { provide: Router, useValue: { navigate: jest.fn().mockResolvedValue(true) } },
        ...(options.homeService ? [{ provide: ResultFrameworkReportingHomeService, useValue: options.homeService }] : [])
      ]
    })
      .overrideComponent(LabReportFormComponent, { set: { template: '' } })
      .compileComponents();

    fixture = TestBed.createComponent(LabReportFormComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('initiativeId', 42);
    fixture.componentRef.setInput('canReport', true);
    for (const [key, value] of Object.entries(inputs)) fixture.componentRef.setInput(key, value);
    fixture.detectChanges();
  }

  function indicator(overrides: Record<string, any> = {}) {
    return { indicator_id: 1, result_type_id: 7, result_level_id: OUTPUT_LEVEL, type_name: 'Number of innovations', ...overrides };
  }

  describe('ERC-T-2: explicit emerging mode', () => {
    const resultLevels = [
      { id: 1, name: 'Impact', result_type: [] },
      { id: 2, name: 'Other', result_type: [] },
      { id: 3, name: 'Outcome', result_type: [{ id: 2, name: 'Innovation use' }, { id: 4, name: 'Other outcome' }] },
      { id: 4, name: 'Output', result_type: [{ id: 6, name: 'Knowledge product' }, { id: 7, name: 'Innovation development' }] }
    ];

    it('arms with no indicator or preselected category, while leaving the result type empty', async () => {
      await setup({ emergingMode: true, emergingCategory: null, indicator: null, tocNode: null });
      await fixture.whenStable();

      expect(component.isEmerging()).toBe(true);
      expect(api.resultsSE.GET_AllInitiatives).toHaveBeenCalledTimes(1);
      expect(component.preselectCentersP).toBeDefined();
      expect(component.createResultBody().result_type_id).toBeNull();
    });

    it('keeps category unavailable until the user chooses Output or Outcome', async () => {
      await setup({ emergingMode: true, emergingCategory: null, indicator: null, tocNode: null });
      resultLevelSig.set(resultLevels);

      expect(component.needsResultLevelChoice()).toBe(true);
      expect(component.chosenResultLevelId()).toBeNull();
      expect(component.resultTypes()).toEqual([]);
      expect(component.categoryUnavailable()).toBe(true);
    });

    it('uses the legacy ResultLevelService Output/Outcome levels, then allows a category choice', async () => {
      await setup({ emergingMode: true, emergingCategory: null, indicator: null, tocNode: null });
      resultLevelSig.set(resultLevels);

      expect(component.outputOutcomeLevels().map((level: any) => level.id)).toEqual([4, 3]);

      component.onResultLevelChange(OUTPUT_LEVEL);
      expect(component.resultLevelId()).toBe(OUTPUT_LEVEL);
      expect(component.resultTypes().length).toBeGreaterThan(0);

      component.onCategoryChange(7);
      expect(component.createResultBody().result_type_id).toBe(7);
    });

    it('submits an emerging payload with the chosen level, no ToC indicator, and the shell phase year', async () => {
      await setup({ emergingMode: true, emergingCategory: null, indicator: null, tocNode: null }, 2027);
      resultLevelSig.set(resultLevels);
      component.onResultLevelChange(OUTPUT_LEVEL);
      component.onCategoryChange(7);
      component.patch('result_name', 'Emerging innovation');
      component.patch('contribution_to_indicator_target', 1);

      component.createResult();

      const body = api.resultsSE.POST_createResult.mock.calls[0][0];
      expect(component.phaseYear()).toBe(2027);
      expect(body.result.result_level_id).toBe(OUTPUT_LEVEL);
      expect(body.indicators).toEqual([]);
      expect(body.toc_result_id).toBeUndefined();
    });

    it('does not offer the level chooser on the planned indicator path', async () => {
      await setup({ indicator: indicator(), tocNode: { result_level_id: OUTPUT_LEVEL } });

      expect(component.isEmerging()).toBe(false);
      expect(component.needsResultLevelChoice()).toBe(false);
    });

    it('shows the innovation-link question only after Innovation use is picked in a 2026+ phase', async () => {
      await setup({ emergingMode: true, emergingCategory: null, indicator: null, tocNode: null }, 2026);
      resultLevelSig.set(resultLevels);

      component.onResultLevelChange(3);
      expect(component.showsInnovationLink()).toBe(false);

      component.onCategoryChange(2);
      expect(component.showsInnovationLink()).toBe(true);
    });

    it('renders the level chooser only for unseeded emerging mode and adds no phase picker', () => {
      const template = readFileSync(join(__dirname, 'lab-report-form.component.html'), 'utf8');

      expect(template).toContain('@if (needsResultLevelChoice())');
      expect(template).toContain('data-testid="emerging-result-level-chooser"');
      expect(template).not.toMatch(/reporting phase|phase picker|name="phase"/i);
    });
  });

  describe('ERC-T-2: full-catalogue-direct fallback when there is no ToC data', () => {
    const centersCatalogue = [
      { code: 'ABC', name: 'Alliance of Bioversity and CIAT', acronym: 'ABC', institutionId: 100 },
      { code: 'CIP', name: 'International Potato Center', acronym: 'CIP', institutionId: 101 }
    ];
    const scienceCatalogue = [
      { id: 201, official_code: 'SP01', full_name: 'Science Program 1' },
      { id: 202, official_code: 'SP02', full_name: 'Science Program 2' }
    ];

    it('reports no ToC reference centers/science and exposes the full catalogue via the otherX computeds (emerging, tocNode: null)', async () => {
      await setup(
        { emergingMode: true, emergingCategory: null, indicator: null, tocNode: null },
        { centersService: { getData: () => Promise.resolve(), centersList: centersCatalogue, centers: signal(centersCatalogue) } }
      );
      component.allInitiatives.set(scienceCatalogue);

      // Pre-fix, `hasReferenceCenters`/`hasReferenceScience` do not exist on the component at all —
      // this assertion is the red-before-green-after seam for the bug.
      expect(component.hasReferenceCenters()).toBe(false);
      expect(component.hasReferenceScience()).toBe(false);

      // The bug: `dropdown1Options()`/`dropdown1ScienceOptions()` carry ONLY the `Other(s)` sentinel
      // when there is no ToC data — that is exactly what must NOT be what the template binds to in
      // this branch.
      expect(component.dropdown1Options()).toEqual([component.otherCentersSentinel]);
      expect(component.dropdown1ScienceOptions().map((sp: any) => sp.id)).toEqual([component.OTHER_SP_ID]);

      // The fix: the full catalogue is available directly through the already-existing computeds.
      expect(component.otherCentersList().map((c: any) => c.code)).toEqual(['ABC', 'CIP']);
      expect(component.otherScienceList().map((sp: any) => sp.id)).toEqual([201, 202]);
    });

    it('regression: a node with ToC data still reports reference centers/science (ToC + Other(s) split unchanged)', async () => {
      await setup(
        {
          indicator: indicator(),
          tocNode: {
            result_level_id: OUTPUT_LEVEL,
            toc_partner_institution_ids: [100],
            contributing_synergy_program_initiative_ids: [201]
          }
        },
        { centersService: { getData: () => Promise.resolve(), centersList: centersCatalogue, centers: signal(centersCatalogue) } }
      );
      component.allInitiatives.set(scienceCatalogue);
      // `loadInitiatives()` already ran (during setup's `detectChanges`) against the default empty
      // `GET_AllInitiatives` mock, so the ToC preselection it computes reflects an empty catalogue.
      // Setting `allInitiatives` afterwards does not retroactively re-run that preselection — mirror
      // it directly, exactly as `loadInitiatives()` would have with this catalogue in place.
      component.tocSciencePrograms.set(scienceCatalogue.filter((sp: any) => sp.id === 201).map((sp: any) => ({ ...sp, from_toc: true })));
      await component.preselectCentersP;

      expect(component.hasReferenceCenters()).toBe(true);
      expect(component.hasReferenceScience()).toBe(true);
      expect(component.tocCenters().map((c: any) => c.code)).toEqual(['ABC']);
      expect(component.tocSciencePrograms().map((sp: any) => sp.id)).toEqual([201]);
      expect(component.dropdown1Options().some((c: any) => c.code === component.OTHER_CENTERS_CODE)).toBe(true);
      expect(component.dropdown1ScienceOptions().some((sp: any) => sp.id === component.OTHER_SP_ID)).toBe(true);
    });

    it('binds the primary Centers and Science Programs controls to the full catalogue in the real template (no lone Other(s) entry)', async () => {
      const localApi = makeApiMock();
      localApi.resultsSE.GET_AllInitiatives = jest.fn().mockReturnValue(of({ response: scienceCatalogue }));
      const resultLevelSigLocal = signal<any[]>([]);
      const outputOutcomeLevelsSigLocal = computed(() => {
        const levels = resultLevelSigLocal();
        return levels.length < 4 ? [] : levels.slice(2, 4).reverse();
      });
      const centersMock = { getData: () => Promise.resolve(), centersList: centersCatalogue, centers: signal(centersCatalogue) };

      await TestBed.configureTestingModule({
        imports: [LabReportFormComponent],
        providers: [
          { provide: ApiService, useValue: localApi },
          { provide: CentersService, useValue: centersMock },
          { provide: ResultLevelService, useValue: { resultLevelListSig: resultLevelSigLocal, outputOutcomeLevelsSig: outputOutcomeLevelsSigLocal } },
          { provide: Router, useValue: { navigate: jest.fn().mockResolvedValue(true) } }
        ],
        schemas: [NO_ERRORS_SCHEMA]
      }).compileComponents();

      const fix = TestBed.createComponent(LabReportFormComponent);
      fix.componentRef.setInput('initiativeId', 42);
      fix.componentRef.setInput('canReport', true);
      fix.componentRef.setInput('emergingMode', true);
      fix.componentRef.setInput('emergingCategory', null);
      fix.componentRef.setInput('indicator', null);
      fix.componentRef.setInput('tocNode', null);
      fix.detectChanges();
      await fix.whenStable();
      fix.detectChanges();

      const comp = fix.componentInstance;
      expect(comp.hasReferenceCenters()).toBe(false);
      expect(comp.hasReferenceScience()).toBe(false);

      const multiSelects = fix.debugElement.queryAll(By.css('app-pr-multi-select'));
      const centersControl = multiSelects.find(de => de.attributes['name'] === 'centers');
      const scienceControl = multiSelects.find(de => de.attributes['name'] === 'science');

      expect(centersControl).toBeTruthy();
      expect(scienceControl).toBeTruthy();

      const centersOptions = centersControl!.componentInstance.options();
      const scienceOptions = scienceControl!.componentInstance.options();

      expect(centersOptions.map((c: any) => c.code)).toEqual(['ABC', 'CIP']);
      expect(centersOptions.some((c: any) => c.code === comp.OTHER_CENTERS_CODE)).toBe(false);

      expect(scienceOptions.map((sp: any) => sp.id)).toEqual([201, 202]);
      expect(scienceOptions.some((sp: any) => sp.id === comp.OTHER_SP_ID)).toBe(false);
    });
  });

  describe('the category picker appears whenever the indicator has none', () => {
    it('is asked for when the indicator declares no category', async () => {
      await setup({ indicator: indicator({ result_type_id: null }), tocNode: { result_level_id: OUTPUT_LEVEL } });

      expect(component.needsCategoryChoice()).toBe(true);
    });

    it('is NOT asked for when the indicator declares one', async () => {
      await setup({ indicator: indicator(), tocNode: { result_level_id: OUTPUT_LEVEL } });

      expect(component.needsCategoryChoice()).toBe(false);
    });

    it('survives the catalog arriving AFTER the drawer opened — the race that blocked 350 indicators', async () => {
      // Catalog still empty at open: the old one-shot effect snapshotted this and never recovered.
      await setup({ indicator: indicator({ result_type_id: null }), tocNode: { result_level_id: OUTPUT_LEVEL } });
      expect(component.resultTypes()).toEqual([]);

      resultLevelSig.set([{ id: OUTPUT_LEVEL, result_type: [{ id: 6, name: 'Knowledge product' }, { id: 7, name: 'Innovation development' }] }]);
      fixture.detectChanges();

      expect(component.resultTypes().map((o: any) => o.id)).toEqual([6, 7]);
    });

    it('exposes the four Output categories, Other output included', async () => {
      await setup({ indicator: indicator({ result_type_id: null }), tocNode: { result_level_id: OUTPUT_LEVEL } });
      resultLevelSig.set([{ id: OUTPUT_LEVEL, result_type: [{ id: 5 }, { id: 6 }, { id: 7 }, { id: 8, name: 'Other output' }] }]);
      fixture.detectChanges();

      expect(component.resultTypes().map((o: any) => o.id)).toContain(8);
    });

    it('says the category cannot be determined when the node maps to no level', async () => {
      await setup({ indicator: indicator({ result_type_id: null, result_level_id: null }), tocNode: { result_level_id: null } });

      expect(component.categoryUnavailable()).toBe(true);
      expect(component.resultTypes()).toEqual([]);
    });
  });

  describe('what blocks the save', () => {
    it('case B — title + contribution are the whole requirement for a non-knowledge-product indicator', async () => {
      await setup({ indicator: indicator(), tocNode: { result_level_id: OUTPUT_LEVEL } });

      component.patch('result_name', 'An innovation');
      expect(component.canSave()).toBe(false);
      expect(component.missingFields()).toEqual(['Contribution to indicator target']);

      component.patch('contribution_to_indicator_target', 1);
      expect(component.canSave()).toBe(true);
    });

    it('a contribution of 0 counts as answered — it is a real value, not a blank', async () => {
      await setup({ indicator: indicator(), tocNode: { result_level_id: OUTPUT_LEVEL } });

      component.patch('result_name', 'An innovation');
      component.patch('contribution_to_indicator_target', 0);

      expect(component.canSave()).toBe(true);
    });

    it('case A — a knowledge product needs the retrieved metadata, not just a title', async () => {
      await setup({ indicator: indicator({ result_type_id: 6, type_name: 'Number of knowledge products' }), tocNode: {} });

      component.patch('result_name', 'Typed by hand');
      component.patch('contribution_to_indicator_target', 1);
      expect(component.canSave()).toBe(false);
      expect(component.missingFields()).toEqual(['Repository link/handle']);

      component.mqapJson.set({ title: 'Typed by hand' });
      expect(component.canSave()).toBe(true);
    });

    it('case F — an uncategorised indicator cannot be saved until a category is picked', async () => {
      await setup({ indicator: indicator({ result_type_id: null }), tocNode: { result_level_id: OUTPUT_LEVEL } });

      component.patch('result_name', 'A result');
      component.patch('contribution_to_indicator_target', 2);
      expect(component.canSave()).toBe(false);
      expect(component.missingFields()).toEqual(['Indicator category']);

      component.onCategoryChange(7);
      expect(component.canSave()).toBe(true);
    });

    it('a whitespace-only title does not count as a title', async () => {
      await setup({ indicator: indicator(), tocNode: {} });

      component.patch('result_name', '   ');
      component.patch('contribution_to_indicator_target', 1);

      expect(component.canSave()).toBe(false);
      expect(component.missingFields()).toContain('Result title');
    });

    it('without reporting permission nothing can be saved', async () => {
      await setup({ indicator: indicator(), tocNode: {} });
      fixture.componentRef.setInput('canReport', false);
      fixture.detectChanges();

      component.patch('result_name', 'An innovation');
      component.patch('contribution_to_indicator_target', 1);

      expect(component.canSave()).toBe(false);
    });

    it('ECN-AC-1: an emerging result is never blocked by an empty contribution to indicator target', async () => {
      await setup({ emergingMode: true, emergingCategory: null, indicator: null, tocNode: null });
      resultLevelSig.set([{ id: OUTPUT_LEVEL, name: 'Output', result_type: [{ id: 7, name: 'Innovation development' }] }]);
      component.onResultLevelChange(OUTPUT_LEVEL);
      component.onCategoryChange(7);

      component.patch('result_name', 'Emerging innovation title');
      // contribution_to_indicator_target intentionally left unset

      expect(component.missingFields()).not.toContain('Contribution to indicator target');
      expect(component.canSave()).toBe(true);
    });
  });

  // quick/category-picker-kp-reset (2026-09-04) — field bug: picking "Knowledge product" in the
  // category picker snapped back to "Select a category" while every other category stuck.
  describe('Other output / Other outcome category resolution', () => {
    it('skips the picker when result_type_name declares Other output without an id', async () => {
      await setup({
        indicator: indicator({
          result_type_id: null,
          result_type_name: 'Other output',
          type_name: 'Number of custom deliverables'
        }),
        tocNode: { result_level_id: OUTPUT_LEVEL }
      });

      expect(component.needsCategoryChoice()).toBe(false);
      expect(component.resolvedIndicatorResultTypeId()).toBe(8);
      expect(component.indicatorCategoryLabel()).toBe('Other output');
      expect(component.createResultBody().result_type_id).toBe(8);
    });

    it('skips the picker when type_name is Other Outputs', async () => {
      await setup({
        indicator: indicator({ result_type_id: null, type_name: 'Other Outputs' }),
        tocNode: { result_level_id: OUTPUT_LEVEL }
      });

      expect(component.needsCategoryChoice()).toBe(false);
      expect(component.resolvedIndicatorResultTypeId()).toBe(8);
      expect(component.indicatorCategoryLabel()).toBe('Other output');
    });
  });

  describe('indicator with result_type_id 6', () => {
    it('enters KP mode from result_type_id even when type_name is not the legacy metric label', async () => {
      await setup({
        indicator: indicator({
          result_type_id: 6,
          result_type_name: 'Knowledge product',
          type_name: 'Number of peer-reviewed publications'
        }),
        tocNode: {}
      });

      expect(component.currentResultIsKnowledgeProduct()).toBe(true);
      expect(component.needsCategoryChoice()).toBe(false);
    });
  });

  describe('picking Knowledge product in the category picker', () => {
    it('keeps the choice, switches to KP mode and defaults the contribution to 1', async () => {
      await setup({ indicator: indicator({ result_type_id: null, type_name: 'Number of services' }), tocNode: { result_level_id: OUTPUT_LEVEL } });
      expect(component.needsCategoryChoice()).toBe(true);

      component.onCategoryChange(6);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.createResultBody().result_type_id).toBe(6);
      expect(component.currentResultIsKnowledgeProduct()).toBe(true);
      expect(component.createResultBody().contribution_to_indicator_target).toBe(1);
      expect(component.missingFields()).not.toContain('Indicator category');
    });

    it('does not re-arm the form when the body changes — only a new indicator does', async () => {
      await setup({ indicator: indicator({ result_type_id: null, type_name: 'Number of services' }), tocNode: { result_level_id: OUTPUT_LEVEL } });
      component.patch('result_name', 'kept');
      component.onCategoryChange(6);
      fixture.detectChanges();
      await fixture.whenStable();
      expect(component.createResultBody().result_name).toBe('kept');

      fixture.componentRef.setInput('indicator', indicator({ indicator_id: 2, result_type_id: null, type_name: 'Number of services' }));
      fixture.detectChanges();
      await fixture.whenStable();
      expect(component.createResultBody().result_type_id).toBeNull();
      expect(component.createResultBody().result_name).toBe('');
    });
  });

  describe('changing category away from Knowledge product', () => {
    it('discards the synced metadata, handle and title so they cannot be submitted under another type', async () => {
      await setup({ indicator: indicator({ result_type_id: null }), tocNode: { result_level_id: OUTPUT_LEVEL } });

      component.onCategoryChange(6);
      component.patch('handler', 'https://hdl.handle.net/10568/128401');
      component.mqapJson.set({ title: 'From CGSpace' });
      component.patch('result_name', 'From CGSpace');
      expect(component.currentResultIsKnowledgeProduct()).toBe(true);

      component.onCategoryChange(7);

      expect(component.currentResultIsKnowledgeProduct()).toBe(false);
      expect(component.mqapJson()).toBeNull();
      expect(component.createResultBody().handler).toBe('');
      expect(component.createResultBody().result_name).toBe('');
    });

    it('leaves a plain category change untouched when no knowledge product was involved', async () => {
      await setup({ indicator: indicator({ result_type_id: null }), tocNode: { result_level_id: OUTPUT_LEVEL } });

      component.patch('result_name', 'A result');
      component.onCategoryChange(5);

      expect(component.createResultBody().result_name).toBe('A result');
    });
  });

  describe('repository handle', () => {
    it('does not spend a request on a handle from an unsupported repository', async () => {
      await setup({ indicator: indicator({ result_type_id: 6, type_name: 'Number of knowledge products' }), tocNode: {} });

      component.patch('handler', 'https://repository.cimmyt.org/items/abc');
      component.validateHandle();

      expect(api.resultsSE.GET_mqapValidation).not.toHaveBeenCalled();
      expect(component.mqapUrlError().status).toBe(true);
      expect(component.validatingHandler()).toBe(false);
    });

    it('fills the title from the repository on a successful sync', async () => {
      await setup({ indicator: indicator({ result_type_id: 6, type_name: 'Number of knowledge products' }), tocNode: {} });

      component.patch('handler', 'https://hdl.handle.net/10568/128401');
      component.validateHandle();

      expect(component.createResultBody().result_name).toBe('Retrieved title');
      expect(component.mqapJson()).toEqual({ title: 'Retrieved title', metadata: [{ source: 'CGSpace' }] });
      expect(component.titleLabel()).toBe('Title retrieved from CGSpace');
    });

    it('clears the title when the sync fails, so a stale one cannot be submitted', async () => {
      await setup({ indicator: indicator({ result_type_id: 6, type_name: 'Number of knowledge products' }), tocNode: {} });
      component.patch('result_name', 'Stale');
      api.resultsSE.GET_mqapValidation.mockReturnValueOnce(throwError(() => ({ error: { message: 'not found' } })));

      component.patch('handler', 'https://hdl.handle.net/10568/999999999');
      component.validateHandle();

      expect(component.createResultBody().result_name).toBe('');
      expect(component.canSave()).toBe(false);
    });
  });

  describe('the submitted payload', () => {
    it('carries the category, drops the table display keys and sends no knowledge product for case B', async () => {
      await setup({
        indicator: indicator({ __hloNode: { indicators: [1, 2, 3] }, __hlo: 'HLO1' }),
        tocNode: { toc_result_id: 'toc-9', result_level_id: OUTPUT_LEVEL }
      });

      component.patch('result_name', 'An innovation');
      component.patch('contribution_to_indicator_target', 3);
      component.createResult();

      const body = api.resultsSE.POST_createResult.mock.calls[0][0];
      expect(body.result.result_type_id).toBe(7);
      expect(body.result.initiative_id).toBe(42);
      expect(body.toc_result_id).toBe('toc-9');
      expect(body.knowledge_product).toBeNull();
      expect(body.indicators).not.toHaveProperty('__hloNode');
    });

    it('refuses to POST when the form is not saveable', async () => {
      await setup({ indicator: indicator(), tocNode: {} });

      component.createResult();

      expect(api.resultsSE.POST_createResult).not.toHaveBeenCalled();
    });
  });

  describe('dirty tracking', () => {
    it('reports dirty once, on the first edit', async () => {
      await setup({ indicator: indicator(), tocNode: {} });
      const emitted: boolean[] = [];
      component.dirtyChange.subscribe((v: boolean) => emitted.push(v));

      component.patch('result_name', 'a');
      component.patch('result_name', 'ab');

      expect(emitted).toEqual([true]);
    });
  });

  describe('removable chips', () => {
    it('removing a center chip drops only that center', async () => {
      await setup({ indicator: indicator(), tocNode: {} });
      component.contributingCenters.set([{ code: 'ILRI' }, { code: 'IRRI' }, { code: 'CIP' }]);

      component.removeCenter({ code: 'IRRI' });

      expect(component.contributingCenters().map(c => c.code)).toEqual(['ILRI', 'CIP']);
    });

    it('removing the "Other(s)" sentinel also clears what the second dropdown held', async () => {
      await setup({ indicator: indicator(), tocNode: {} });
      component.contributingCenters.set([{ code: 'ILRI' }, { code: '__OTHER_CENTERS__' }]);
      component.otherCentersSelected.set([{ code: 'CIP' }]);

      component.removeCenter({ code: '__OTHER_CENTERS__' });

      expect(component.showOtherCenters()).toBe(false);
      expect(component.otherCentersSelected()).toEqual([]);
    });

    it('removing a science programme chip drops only that programme', async () => {
      await setup({ indicator: indicator(), tocNode: {} });
      component.selectedScience.set([{ id: 1 }, { id: 2 }]);

      component.removeScience({ id: 1 });

      expect(component.selectedScience().map(s => s.id)).toEqual([2]);
    });
  });

  describe('knowledge-product entry modes', () => {
    it('starts on browse entry now that repository browsing is enabled (P2-3231)', async () => {
      await setup({ indicator: indicator({ result_type_id: 6, type_name: 'Number of knowledge products' }), tocNode: {} });

      expect(component.kpEntryMode()).toBe('browse');
      expect(component.kpBrowseEnabled).toBe(true);
    });

    it('renders both Browse repositories and Manual entry tabs in template', () => {
      const template = readFileSync(join(__dirname, 'lab-report-form.component.html'), 'utf8');

      expect(template.indexOf('Browse repositories')).toBeGreaterThan(-1);
      expect(template.indexOf('Manual entry')).toBeGreaterThan(-1);
      expect(template.indexOf('app-kp-cgspace-browse')).toBeGreaterThan(-1);
      expect(template.indexOf('Repository link/handle')).toBeGreaterThan(-1);
      // @akili-spec changes/kp-program-accelerator-match (KPAM-T-3, KPAM-R-2, Defect Gate D6)
      expect(template.indexOf('[programCode]="programCode()"')).toBeGreaterThan(-1);
      expect(template.indexOf('[programName]="resolvedProgramName()"')).toBeGreaterThan(-1);
    });

    describe('resolvedProgramName (KPAM-T-3, KPAM-R-2, Defect Gate D6)', () => {
      it('returns explicit programName input when provided', async () => {
        await setup({ programName: 'Custom Breeding Program', programCode: 'SP01' });
        expect(component.resolvedProgramName()).toBe('Custom Breeding Program');
      });

      it('resolves standard SP name from programCode via SCIENCE_PROGRAM_NAMES', async () => {
        await setup({ programCode: 'SP02' });
        expect(component.resolvedProgramName()).toBe('Sustainable Farming');
      });

      it('resolves SP01 as Breeding for Tomorrow', async () => {
        await setup({ programCode: 'SP01' });
        expect(component.resolvedProgramName()).toBe('Breeding for Tomorrow');
      });

      it('resolves from homeSE.mySPsList when matching initiativeCode', async () => {
        const mockHomeSE = {
          mySPsList: signal([
            { initiativeCode: 'SP99', initiativeName: 'Custom Science Program 99', initiativeShortName: 'CSP99', initiativeId: 99 }
          ]),
          otherSPsList: signal([])
        };
        await setup({ programCode: 'SP99' }, { homeService: mockHomeSE } as any);
        expect(component.resolvedProgramName()).toBe('Custom Science Program 99');
      });

      it('resolves from api.dataControlSE.myInitiativesList when matching official_code', async () => {
        await setup({ programCode: 'INIT-10' });
        (api as any).dataControlSE = {
          ...api.dataControlSE,
          myInitiativesList: [
            { official_code: 'INIT-10', name: 'Initiative 10 Name', short_name: 'Init10' }
          ]
        };
        expect(component.resolvedProgramName()).toBe('Initiative 10 Name');
      });

      it('resolves from tocNode.official_code when programCode is empty', async () => {
        await setup({ programCode: '', tocNode: { official_code: 'SP03' } });
        expect(component.resolvedProgramName()).toBe('Climate Action');
      });

      it('falls back to programCode string when no name mapping exists', async () => {
        await setup({ programCode: 'UNKNOWN_CODE' });
        expect(component.resolvedProgramName()).toBe('UNKNOWN_CODE');
      });
    });

    it('emits loadingOverlayChange for MQAP sync and create, and marks the form aria-busy', async () => {
      await setup({ indicator: indicator({ result_type_id: 6, type_name: 'Number of knowledge products' }), tocNode: {} });
      const messages: Array<string | null> = [];
      component.loadingOverlayChange.subscribe(message => messages.push(message));

      component.validatingHandler.set(true);
      fixture.detectChanges();
      expect(component.loadingOverlayMessage()).toContain('Retrieving metadata');
      expect(messages.at(-1)).toContain('Retrieving metadata');

      component.validatingHandler.set(false);
      component.creatingResult.set(true);
      fixture.detectChanges();
      expect(component.loadingOverlayMessage()).toBe('Creating result…');
      expect(messages.at(-1)).toBe('Creating result…');

      const template = readFileSync(join(__dirname, 'lab-report-form.component.html'), 'utf8');
      expect(template.indexOf('[attr.aria-busy]="creatingResult() || validatingHandler()"')).toBeGreaterThan(-1);
      expect(template.indexOf('absolute inset-0 z-20')).toBe(-1);
    });

    it('updates handler and calls validateHandle when onCgspaceItemSelected is called', async () => {
      await setup({ indicator: indicator({ result_type_id: 6, type_name: 'Number of knowledge products' }), tocNode: {} });

      const item: any = {
        itemUrl: 'https://cgspace.cgiar.org/items/679513e4-eeba-4a06-a017-015862e7b9b3'
      };
      component.onCgspaceItemSelected(item);

      expect(component.createResultBody().handler).toBe(item.itemUrl);
      expect(api.resultsSE.GET_mqapValidation).toHaveBeenCalledWith(item.itemUrl);
    });
  });

  /**
   * P2-3420 — link to a QA'd Innovation Development result on the ToC-linked create form.
   * The gate is the PHASE year, never `isP25()`: prtest holds 2025-phase results inside P25.
   */
  describe("P2-3420: link to a QA'd Innovation Development result", () => {
    const INNOVATION_USE = 2;

    it('defaults the answer to NO, as the story requires', async () => {
      await setup({ indicator: indicator({ result_type_id: INNOVATION_USE }), tocNode: { result_level_id: OUTPUT_LEVEL } });

      expect(component.hasInnovationLink()).toBe(false);
      expect(component.linkedResultId()).toBeNull();
    });

    it('shows the question for an Innovation use indicator in the open (2026) phase', async () => {
      await setup({ indicator: indicator({ result_type_id: INNOVATION_USE }), tocNode: { result_level_id: OUTPUT_LEVEL } });

      expect(component.showsInnovationLink()).toBe(true);
    });

    it('never shows it for any other indicator category', async () => {
      await setup({ indicator: indicator({ result_type_id: 7 }), tocNode: { result_level_id: OUTPUT_LEVEL } });

      expect(component.showsInnovationLink()).toBe(false);
    });

    it('🛑 never shows it for a 2025 phase — earlier phases must look exactly as they do today', async () => {
      await setup({ indicator: indicator({ result_type_id: INNOVATION_USE }), tocNode: { result_level_id: OUTPUT_LEVEL } }, 2025);

      expect(component.showsInnovationLink()).toBe(false);
      expect(api.resultsSE.GET_qaInnovationDevelopmentResults).not.toHaveBeenCalled();
    });

    it('loads the shared catalogue once the question is on screen', async () => {
      await setup({ indicator: indicator({ result_type_id: INNOVATION_USE }), tocNode: { result_level_id: OUTPUT_LEVEL } });

      expect(api.resultsSE.GET_qaInnovationDevelopmentResults).toHaveBeenCalled();
    });

    it('counts YES-with-no-selection as a missing field, which is what blocks "Create and continue"', async () => {
      await setup({ indicator: indicator({ result_type_id: INNOVATION_USE }), tocNode: { result_level_id: OUTPUT_LEVEL } });
      component.onInnovationLinkChange(true);

      expect(component.missingFields()).toContain('Linked Innovation Development result');
      expect(component.canSave()).toBe(false);
    });

    it('stops counting it once an innovation is chosen', async () => {
      await setup({ indicator: indicator({ result_type_id: INNOVATION_USE }), tocNode: { result_level_id: OUTPUT_LEVEL } });
      component.onInnovationLinkChange(true);
      component.linkedResultId.set(501);

      expect(component.missingFields()).not.toContain('Linked Innovation Development result');
    });

    it('never counts it on the default NO', async () => {
      await setup({ indicator: indicator({ result_type_id: INNOVATION_USE }), tocNode: { result_level_id: OUTPUT_LEVEL } });

      expect(component.missingFields()).not.toContain('Linked Innovation Development result');
    });

    it('drops the selection when the user switches back to NO', async () => {
      await setup({ indicator: indicator({ result_type_id: INNOVATION_USE }), tocNode: { result_level_id: OUTPUT_LEVEL } });
      component.onInnovationLinkChange(true);
      component.linkedResultId.set(501);

      component.onInnovationLinkChange(false);

      expect(component.linkedResultId()).toBeNull();
    });

    it('sends the answer INSIDE the create body, not as a chained PATCH', async () => {
      await setup({ indicator: indicator({ result_type_id: INNOVATION_USE }), tocNode: { result_level_id: OUTPUT_LEVEL } });
      component.patch('result_name', 'An innovation use result');
      component.patch('contribution_to_indicator_target', 5);
      component.onInnovationLinkChange(true);
      component.linkedResultId.set(501);

      component.createResult();

      const body = api.resultsSE.POST_createResult.mock.calls.at(-1)[0];
      expect(body.result.has_innovation_link).toBe(true);
      expect(body.result.linked_results).toEqual([501]);
    });

    it('🛑 leaves the create body untouched for a category that never asks the question', async () => {
      await setup({ indicator: indicator({ result_type_id: 7 }), tocNode: { result_level_id: OUTPUT_LEVEL } });
      component.patch('result_name', 'An innovation development result');
      component.patch('contribution_to_indicator_target', 5);

      component.createResult();

      const body = api.resultsSE.POST_createResult.mock.calls.at(-1)[0];
      expect(body.result).not.toHaveProperty('has_innovation_link');
      expect(body.result).not.toHaveProperty('linked_results');
    });
  });

  describe('KPAC — knowledge-product auto-create (KPAC-R-1..R-6)', () => {
    const kpIndicator = () =>
      indicator({
        result_type_id: 6,
        type_name: 'Number of knowledge products',
        targets_by_center: { centers: [{ center_acronym: 'ILRI' }] }
      });

    const ilriCenter = { code: 'ILRI', acronym: 'ILRI', name: 'ILRI', institutionId: 101 };

    async function flushAsync(): Promise<void> {
      await Promise.resolve();
      await Promise.resolve();
      await fixture.whenStable();
    }

    it('KPAC-TEST-6 — KP indicator arms with contribution 1 and omits it from missingFields', async () => {
      await setup({ indicator: kpIndicator(), tocNode: { result_level_id: OUTPUT_LEVEL } });

      expect(component.createResultBody().contribution_to_indicator_target).toBe(1);
      expect(component.missingFields()).not.toContain('Contribution to indicator target');
    });

    it('KPAC-TEST-3 — browse selection auto-creates via POST_createResult after MQAP success', async () => {
      await setup(
        { indicator: kpIndicator(), tocNode: { toc_result_id: 'toc-kp', result_level_id: OUTPUT_LEVEL } },
        { centersService: { getData: () => Promise.resolve(), centersList: [ilriCenter], centers: signal<any[]>([ilriCenter]) } }
      );

      component.onCgspaceItemSelected({ itemUrl: 'https://hdl.handle.net/10568/128401' });
      await flushAsync();

      expect(api.resultsSE.POST_createResult).toHaveBeenCalledTimes(1);
      const body = api.resultsSE.POST_createResult.mock.calls[0][0];
      expect(body.contributing_indicator).toBe(1);
    });

    // @akili-spec changes/kp-multi-repository-browse — KPM-T-8, KPM-R-12, KPM-AC-12.
    it('KPM-T-8 — a MELSpace item passes the regex, names MELSpace in the banner label, and produces the same POST_createResult body as Manual entry', async () => {
      await setup(
        { indicator: kpIndicator(), tocNode: { toc_result_id: 'toc-kp', result_level_id: OUTPUT_LEVEL } },
        { centersService: { getData: () => Promise.resolve(), centersList: [ilriCenter], centers: signal<any[]>([ilriCenter]) } }
      );
      const melUrl = 'https://repo.mel.cgiar.org/items/11111111-1111-1111-1111-111111111111';
      api.resultsSE.GET_mqapValidation.mockReturnValue(of({ response: { title: 'MEL Retrieved Title', metadata: [{ source: 'MELSpace' }] } }));

      component.onCgspaceItemSelected({ itemUrl: melUrl, repository: 'melspace' } as any);
      await flushAsync();

      expect(api.resultsSE.GET_mqapValidation).toHaveBeenCalledWith(melUrl);
      expect(component.mqapUrlError().status).toBe(false);
      expect(component.selectedKpRepository()).toBe('melspace');
      expect(component.repositoryLabel()).toBe('MELSpace'); // drives the "Selected from {{ repositoryLabel() }}" banner
      expect(api.resultsSE.POST_createResult).toHaveBeenCalledTimes(1);
      const browseBody = api.resultsSE.POST_createResult.mock.calls[0][0];

      // Manual entry: same handle typed by hand and validated via validateHandle() — no Browse
      // selection at all — must produce the identical create body (KPM-R-12).
      api.resultsSE.POST_createResult.mockClear();
      component.clearSelectedKpItem();
      component.patch('handler', melUrl);
      component.handleSource.set('manual');
      component.validateHandle();
      await flushAsync();

      expect(api.resultsSE.POST_createResult).toHaveBeenCalledTimes(1);
      const manualBody = api.resultsSE.POST_createResult.mock.calls[0][0];
      expect(browseBody).toEqual(manualBody);
    });

    // quick/kp-create-navigation-hardening (2026-09-04) — field report: after "Use this item" the
    // drawer closed but the user stayed on the Reporting tab. Navigate first; close only if it fails.
    it('navigates to the new result BEFORE closing the drawer, and does not emit created once the router landed', async () => {
      await setup(
        { indicator: kpIndicator(), tocNode: { toc_result_id: 'toc-kp', result_level_id: OUTPUT_LEVEL } },
        { centersService: { getData: () => Promise.resolve(), centersList: [ilriCenter], centers: signal<any[]>([ilriCenter]) } }
      );
      const router = TestBed.inject(Router) as unknown as { navigate: jest.Mock };
      const created = jest.fn();
      component.created.subscribe(created);

      component.onCgspaceItemSelected({ itemUrl: 'https://hdl.handle.net/10568/128401' });
      await flushAsync();

      expect(router.navigate).toHaveBeenCalledWith(['/result/result-detail/R-1/general-information'], { queryParams: { phase: 9 } });
      expect(created).not.toHaveBeenCalled();
      expect(component.creatingResult()).toBe(false);
    });

    it('still closes the drawer (emits created) when the navigation is refused', async () => {
      await setup(
        { indicator: kpIndicator(), tocNode: { toc_result_id: 'toc-kp', result_level_id: OUTPUT_LEVEL } },
        { centersService: { getData: () => Promise.resolve(), centersList: [ilriCenter], centers: signal<any[]>([ilriCenter]) } }
      );
      const router = TestBed.inject(Router) as unknown as { navigate: jest.Mock };
      router.navigate.mockResolvedValueOnce(false);
      const created = jest.fn();
      component.created.subscribe(created);

      component.onCgspaceItemSelected({ itemUrl: 'https://hdl.handle.net/10568/128401' });
      await flushAsync();

      expect(created).toHaveBeenCalledTimes(1);
      expect(component.creatingResult()).toBe(false);
    });

    it('closes the drawer without navigating when the response carries no result code', async () => {
      await setup(
        { indicator: kpIndicator(), tocNode: { toc_result_id: 'toc-kp', result_level_id: OUTPUT_LEVEL } },
        { centersService: { getData: () => Promise.resolve(), centersList: [ilriCenter], centers: signal<any[]>([ilriCenter]) } }
      );
      api.resultsSE.POST_createResult.mockReturnValueOnce(of({ response: { result: {} } }));
      const router = TestBed.inject(Router) as unknown as { navigate: jest.Mock };
      const created = jest.fn();
      component.created.subscribe(created);

      component.onCgspaceItemSelected({ itemUrl: 'https://hdl.handle.net/10568/128401' });
      await flushAsync();

      expect(router.navigate).not.toHaveBeenCalled();
      expect(created).toHaveBeenCalledTimes(1);
    });

    it('explains why the auto-create did not fire when the form is not save-ready after MQAP', async () => {
      await setup(
        { indicator: kpIndicator(), tocNode: { toc_result_id: 'toc-kp', result_level_id: OUTPUT_LEVEL }, canReport: false },
        { centersService: { getData: () => Promise.resolve(), centersList: [ilriCenter], centers: signal<any[]>([ilriCenter]) } }
      );

      component.onCgspaceItemSelected({ itemUrl: 'https://hdl.handle.net/10568/128401' });
      await flushAsync();

      expect(api.resultsSE.POST_createResult).not.toHaveBeenCalled();
      expect(component.autoCreateHint()).toMatch(/^Publication linked\./);
    });

    it('KPAC-TEST-4 — validateHandle auto-creates on valid handle; invalid handle does not POST', async () => {
      await setup(
        { indicator: kpIndicator(), tocNode: { toc_result_id: 'toc-kp', result_level_id: OUTPUT_LEVEL } },
        { centersService: { getData: () => Promise.resolve(), centersList: [ilriCenter], centers: signal<any[]>([ilriCenter]) } }
      );

      component.patch('handler', 'https://hdl.handle.net/10568/128401');
      component.validateHandle();
      await flushAsync();

      expect(api.resultsSE.POST_createResult).toHaveBeenCalledTimes(1);
      expect(api.resultsSE.POST_createResult.mock.calls[0][0].contributing_indicator).toBe(1);

      api.resultsSE.POST_createResult.mockClear();

      component.patch('handler', 'https://repository.cimmyt.org/items/abc');
      component.validateHandle();

      expect(api.resultsSE.GET_mqapValidation).toHaveBeenCalledTimes(1);
      expect(api.resultsSE.POST_createResult).not.toHaveBeenCalled();
    });

    it('KPAC-TEST-5 (component) — non-KP MQAP success does not auto-create', async () => {
      await setup({ indicator: indicator(), tocNode: { result_level_id: OUTPUT_LEVEL } });

      component.onCgspaceItemSelected({ itemUrl: 'https://hdl.handle.net/10568/128401' });
      await flushAsync();
      expect(api.resultsSE.POST_createResult).not.toHaveBeenCalled();

      component.patch('handler', 'https://hdl.handle.net/10568/128401');
      component.validateHandle();
      await flushAsync();
      expect(api.resultsSE.POST_createResult).not.toHaveBeenCalled();
    });

    it('KPAC-TEST-2 — auto-create awaits deferred preselectTocCenters before POST', async () => {
      let resolveGetData!: () => void;
      const getDataDeferred = new Promise<void>(resolve => {
        resolveGetData = resolve;
      });

      await setup(
        { indicator: kpIndicator(), tocNode: { toc_result_id: 'toc-kp', result_level_id: OUTPUT_LEVEL } },
        { centersService: { getData: () => getDataDeferred, centersList: [ilriCenter], centers: signal<any[]>([ilriCenter]) } }
      );

      component.onCgspaceItemSelected({ itemUrl: 'https://hdl.handle.net/10568/128401' });
      await flushAsync();

      expect(api.resultsSE.POST_createResult).not.toHaveBeenCalled();

      resolveGetData();
      await flushAsync();

      expect(api.resultsSE.POST_createResult).toHaveBeenCalledTimes(1);
      const body = api.resultsSE.POST_createResult.mock.calls[0][0];
      expect(body.contributing_center.length).toBeGreaterThan(0);
      expect(body.contributing_center.some((c: { acronym: string }) => c.acronym === 'ILRI')).toBe(true);
    });
  });

  describe('P2-3554: the centers dropdown when the CLARISA catalogue resolves LATE', () => {
    // `otherCentersList` used to filter `centersSE.centersList`, a plain array and therefore not a reactive
    // dependency: the `computed` kept the empty catalogue of its first evaluation, and with `tocCenters()` as
    // its only real dependency it never recovered on a node that contributes no ToC centers.
    it('rebuilds the list when the catalogue lands after the view was built', async () => {
      const catalogue = signal<any[]>([]);
      await setup({}, { centersService: { getData: () => Promise.resolve(), centersList: [], centers: catalogue } });

      expect(component.otherCentersList()).toEqual([]);

      catalogue.set([
        { code: 'ABC', name: 'Alliance of Bioversity and CIAT', acronym: 'ABC', institutionId: 100 },
        { code: 'CIP', name: 'International Potato Center', acronym: 'CIP', institutionId: 101 }
      ]);

      expect(component.otherCentersList().map((x: any) => x.code)).toEqual(['ABC', 'CIP']);
    });
  });
});

// @akili-spec changes/report-result-form-ux (RFUX-T-2, RFUX-R-2, RFUX-AC-2)
describe('LabReportFormComponent — Form 3-Card Architecture DOM Rendering (RFUX-T-2)', () => {
  let fixture: ComponentFixture<LabReportFormComponent>;

  async function mount(inputs: Record<string, any> = {}) {
    const api = makeApiMock();
    const resultLevelSig = signal<any[]>([]);
    const outputOutcomeLevelsSig = computed(() => {
      const levels = resultLevelSig();
      return levels.length < 4 ? [] : levels.slice(2, 4).reverse();
    });
    const centersMock = { getData: () => Promise.resolve(), centersList: [], centers: signal<any[]>([]) };

    await TestBed.configureTestingModule({
      imports: [LabReportFormComponent],
      providers: [
        { provide: ApiService, useValue: api },
        { provide: CentersService, useValue: centersMock },
        { provide: ResultLevelService, useValue: { resultLevelListSig: resultLevelSig, outputOutcomeLevelsSig } },
        { provide: Router, useValue: { navigate: jest.fn().mockResolvedValue(true) } }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(LabReportFormComponent);
    fixture.componentRef.setInput('initiativeId', 42);
    fixture.componentRef.setInput('canReport', true);
    for (const [key, value] of Object.entries(inputs)) fixture.componentRef.setInput(key, value);
    fixture.detectChanges();
    return fixture;
  }

  it('renders all 3 semantic card sections in the DOM for a standard result (RFUX-R-2, RFUX-AC-2)', async () => {
    const fix = await mount({
      indicator: { indicator_id: 1, result_type_id: 7, result_level_id: OUTPUT_LEVEL, type_name: 'Number of innovations' },
      tocNode: { result_level_id: OUTPUT_LEVEL }
    });

    const card1: HTMLElement | null = fix.nativeElement.querySelector('[data-testid="card-result-identity"]');
    const card2: HTMLElement | null = fix.nativeElement.querySelector('[data-testid="card-target-contribution"]');
    const card3: HTMLElement | null = fix.nativeElement.querySelector('[data-testid="card-collaboration"]');

    expect(card1).toBeTruthy();
    expect(card2).toBeTruthy();
    expect(card3).toBeTruthy();

    expect(card1?.tagName.toLowerCase()).toBe('section');
    expect(card2?.tagName.toLowerCase()).toBe('section');
    expect(card3?.tagName.toLowerCase()).toBe('section');

    expect(card1?.textContent).toContain('1. Result Identity');
    expect(card1?.textContent).toContain('edit_note');

    expect(card2?.textContent).toContain('2. Target Contribution');
    expect(card2?.textContent).toContain('track_changes');

    expect(card3?.textContent).toContain('3. Collaboration & Attribution');
    expect(card3?.textContent).toContain('groups');

    expect(card1?.classList.contains('border')).toBe(true);
    expect(card1?.classList.contains('rounded-xl')).toBe(true);
    expect(card2?.classList.contains('border')).toBe(true);
    expect(card2?.classList.contains('rounded-xl')).toBe(true);
    expect(card3?.classList.contains('border')).toBe(true);
    expect(card3?.classList.contains('rounded-xl')).toBe(true);

    expect(fix.nativeElement.textContent).not.toContain('The result');
  });

  it('explains which collaboration fields are pre-filled from the ToC (RFUX-R-2)', async () => {
    const fix = await mount({
      indicator: {
        indicator_id: 1,
        result_type_id: 7,
        result_level_id: OUTPUT_LEVEL,
        type_name: 'Number of innovations',
        center_acronym: 'CIMMYT'
      },
      tocNode: { result_level_id: OUTPUT_LEVEL, contributing_synergy_program_initiative_ids: [6] }
    });

    const note = fix.nativeElement.querySelector('[data-testid="toc-attribution-note"]') as HTMLElement;
    expect(note).toBeTruthy();
    expect(note.textContent).toContain('Pre-filled from your Theory of Change');
    expect(note.textContent).toContain('Contributing CGIAR Centers');
    expect(note.textContent).toContain('CIMMYT');
    expect(note.textContent).toContain('Lead center');
    expect(note.textContent).toContain('W3 and bilateral projects');
    expect(note.textContent).toContain('not pre-filled');
  });

  it('preserves Knowledge Product browse flow: renders only Card 1 before item selection', async () => {
    const fix = await mount({
      indicator: { indicator_id: 2, result_type_id: 6, result_level_id: OUTPUT_LEVEL, type_name: 'Number of knowledge products' },
      tocNode: {}
    });

    const card1: HTMLElement | null = fix.nativeElement.querySelector('[data-testid="card-result-identity"]');
    const card2: HTMLElement | null = fix.nativeElement.querySelector('[data-testid="card-target-contribution"]');
    const card3: HTMLElement | null = fix.nativeElement.querySelector('[data-testid="card-collaboration"]');

    expect(card1).toBeTruthy();
    // Cards 2 and 3 must not render while in browse mode without a selected item
    expect(card2).toBeNull();
    expect(card3).toBeNull();
  });

  it('non-emerging: Card 2 and the ToC-attribution note both render (EHU-AC-3)', async () => {
    const fix = await mount({
      indicator: { indicator_id: 1, result_type_id: 7, result_level_id: OUTPUT_LEVEL, type_name: 'Number of innovations' },
      tocNode: { result_level_id: OUTPUT_LEVEL }
    });

    expect(fix.nativeElement.querySelector('[data-testid="card-target-contribution"]')).toBeTruthy();
    expect(fix.nativeElement.querySelector('[data-testid="toc-attribution-note"]')).toBeTruthy();

    const card3: HTMLElement | null = fix.nativeElement.querySelector('[data-testid="card-collaboration"]');
    expect(card3?.textContent).toContain('3. Collaboration & Attribution');
  });

  it('emerging mode: hides Card 2 and the ToC-attribution note, but keeps the Centers/Science Programs selects (EHU-AC-1, EHU-AC-2)', async () => {
    const fix = await mount({ emergingMode: true, emergingCategory: null, indicator: null, tocNode: null });

    expect(fix.nativeElement.querySelector('[data-testid="card-target-contribution"]')).toBeNull();
    expect(fix.nativeElement.querySelector('[data-testid="toc-attribution-note"]')).toBeNull();
    expect(fix.nativeElement.querySelector('app-pr-multi-select[name="centers"]')).toBeTruthy();
    expect(fix.nativeElement.querySelector('app-pr-multi-select[name="science"]')).toBeTruthy();

    const card3: HTMLElement | null = fix.nativeElement.querySelector('[data-testid="card-collaboration"]');
    expect(card3?.textContent).toContain('2. Collaboration & Attribution');
  });

  it('renders Cards 2 and 3 once a Knowledge Product is selected', async () => {
    const fix = await mount({
      indicator: { indicator_id: 2, result_type_id: 6, result_level_id: OUTPUT_LEVEL, type_name: 'Number of knowledge products' },
      tocNode: {}
    });

    fix.componentInstance.patch('handler', 'https://cgspace.cgiar.org/items/123');
    fix.detectChanges();

    const card1: HTMLElement | null = fix.nativeElement.querySelector('[data-testid="card-result-identity"]');
    const card2: HTMLElement | null = fix.nativeElement.querySelector('[data-testid="card-target-contribution"]');
    const card3: HTMLElement | null = fix.nativeElement.querySelector('[data-testid="card-collaboration"]');

    expect(card1).toBeTruthy();
    expect(card2).toBeTruthy();
    expect(card3).toBeTruthy();
  });
});

// @akili-spec changes/report-result-form-ux (RFUX-T-3, RFUX-R-3, RFUX-R-5, RFUX-AC-3, RFUX-AC-4)
describe('LabReportFormComponent — Auto-resizing Textarea & Dynamic Word Gauge (RFUX-T-3)', () => {
  let fixture: ComponentFixture<LabReportFormComponent>;
  let component: LabReportFormComponent;

  beforeEach(async () => {
    const apiMock = makeApiMock();
    await TestBed.configureTestingModule({
      imports: [LabReportFormComponent],
      providers: [
        { provide: ApiService, useValue: apiMock },
        { provide: CentersService, useValue: { getData: () => Promise.resolve(), centersList: [], centers: signal<any[]>([]) } },
        { provide: ResultLevelService, useValue: { resultLevelListSig: signal<any[]>([]) } },
        { provide: Router, useValue: { navigate: jest.fn().mockResolvedValue(true) } }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(LabReportFormComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('initiativeId', 42);
    fixture.componentRef.setInput('indicator', { indicator_id: 1, result_type_id: 7, result_level_id: 4, type_name: 'Number of innovations' });
    fixture.componentRef.setInput('canReport', true);
    fixture.detectChanges();
  });

  function makeWords(count: number): string {
    return Array.from({ length: count }, (_, i) => `word${i + 1}`).join(' ');
  }

  it('word count initializes at 0 with neutral class (RFUX-R-3, RFUX-AC-3)', () => {
    const badge: HTMLElement | null = fixture.nativeElement.querySelector('[data-testid="title-word-gauge"]');
    expect(badge).toBeTruthy();
    expect(badge?.textContent?.trim()).toBe('0 / 30 words');
    expect(badge?.className).toContain('bg-gray-100');
    expect(badge?.className).toContain('text-gray-600');
  });

  it('switches badge to amber warning when entering 26 words (25..29 ramp) (RFUX-R-3, RFUX-AC-3)', () => {
    component.patch('result_name', makeWords(26));
    fixture.detectChanges();

    const badge: HTMLElement | null = fixture.nativeElement.querySelector('[data-testid="title-word-gauge"]');
    expect(badge?.textContent?.trim()).toBe('26 / 30 words');
    expect(badge?.className).toContain('bg-amber-50');
    expect(badge?.className).toContain('text-amber-700');
  });

  it('switches badge to violet brand accent when entering exactly 30 words (RFUX-R-3, RFUX-AC-4)', () => {
    component.patch('result_name', makeWords(30));
    fixture.detectChanges();

    const badge: HTMLElement | null = fixture.nativeElement.querySelector('[data-testid="title-word-gauge"]');
    expect(badge?.textContent?.trim()).toBe('30 / 30 max words');
    expect(badge?.className).toContain('bg-violet-50');
    expect(badge?.className).toContain('text-[var(--pr-color-primary-400)]');
    expect(badge?.className).toContain('font-bold');
  });

  it('switches badge to red error, labels limit exceeded, and invalidates canSave when entering 31 words (RFUX-R-3, RFUX-AC-4)', () => {
    component.patch('contribution_to_indicator_target', 5);
    component.patch('result_name', makeWords(30));
    expect(component.canSave()).toBe(true);

    component.patch('result_name', makeWords(31));
    fixture.detectChanges();

    const badge: HTMLElement | null = fixture.nativeElement.querySelector('[data-testid="title-word-gauge"]');
    expect(badge?.textContent?.trim()).toBe('31 / 30 (Limit exceeded)');
    expect(badge?.className).toContain('bg-red-50');
    expect(badge?.className).toContain('text-red-700');

    expect(component.missingFields()).toContain('Result title exceeds 30 words');
    expect(component.canSave()).toBe(false);

    const textarea: HTMLTextAreaElement | null = fixture.nativeElement.querySelector('#result-title-input');
    expect(textarea?.classList.contains('border-red-400')).toBe(true);
  });

  it('renders persistent inline helper text directly in the DOM (RFUX-R-5)', () => {
    const helper: HTMLElement | null = fixture.nativeElement.querySelector('#title-helper');
    expect(helper).toBeTruthy();
    expect(helper?.textContent?.trim()).toBe('Provide a clear, concise title describing the output or outcome. Maximum 30 words.');

    const textarea: HTMLTextAreaElement | null = fixture.nativeElement.querySelector('#result-title-input');
    expect(textarea?.getAttribute('aria-describedby')).toBe('title-helper');
  });

  it('adjustTextareaHeight updates element height between min and max bounds', () => {
    const textarea: HTMLTextAreaElement | null = fixture.nativeElement.querySelector('#result-title-input');
    expect(textarea).toBeTruthy();
    if (!textarea) return;

    Object.defineProperty(textarea, 'scrollHeight', { value: 100, configurable: true });
    component.adjustTextareaHeight({ target: textarea } as unknown as Event);
    expect(textarea.style.height).toBe('100px');

    Object.defineProperty(textarea, 'scrollHeight', { value: 200, configurable: true });
    component.adjustTextareaHeight({ target: textarea } as unknown as Event);
    expect(textarea.style.height).toBe('140px');

    Object.defineProperty(textarea, 'scrollHeight', { value: 40, configurable: true });
    component.adjustTextareaHeight({ target: textarea } as unknown as Event);
    expect(textarea.style.height).toBe('68px');
  });
});

// @akili-spec changes/report-result-form-ux (RFUX-T-4, RFUX-R-4, RFUX-R-5, RFUX-AC-5)
describe('LabReportFormComponent — Contextual Contribution Input (RFUX-T-4)', () => {
  let fixture: ComponentFixture<LabReportFormComponent>;
  let component: LabReportFormComponent;

  async function mountForm(indicatorOverrides: Record<string, any> = {}) {
    const apiMock = makeApiMock();
    await TestBed.configureTestingModule({
      imports: [LabReportFormComponent],
      providers: [
        { provide: ApiService, useValue: apiMock },
        { provide: CentersService, useValue: { getData: () => Promise.resolve(), centersList: [], centers: signal<any[]>([]) } },
        { provide: ResultLevelService, useValue: { resultLevelListSig: signal<any[]>([]) } },
        { provide: Router, useValue: { navigate: jest.fn().mockResolvedValue(true) } }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(LabReportFormComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('initiativeId', 42);
    fixture.componentRef.setInput('indicator', {
      indicator_id: 1,
      result_type_id: 7,
      result_level_id: 4,
      type_name: 'Number of innovations',
      target_value_sum: 15,
      actual_achieved_value_sum: 3,
      unit_messurament: 'varieties',
      ...indicatorOverrides
    });
    fixture.componentRef.setInput('canReport', true);
    fixture.detectChanges();
  }

  it('input defaults to empty/null with placeholder "e.g. 5" (RFUX-R-4, RFUX-AC-5)', async () => {
    await mountForm();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('#contribution-input');

    expect(input).toBeTruthy();
    expect(input.placeholder).toBe('e.g. 5');
    expect(component.createResultBody().contribution_to_indicator_target).toBeNull();
    expect(input.value).toBe('');
  });

  it('renders unit suffix when unit_messurament is provided (RFUX-R-4, RFUX-AC-5)', async () => {
    await mountForm({ unit_messurament: 'varieties' });
    const suffix: HTMLElement = fixture.nativeElement.querySelector('[data-testid="contribution-unit-suffix"]');

    expect(suffix).toBeTruthy();
    expect(suffix.textContent?.trim()).toBe('varieties');
    expect(suffix.classList.contains('truncate')).toBe(false);
  });

  it('shows the full unit label beside the input when unit_messurament is long', async () => {
    const longUnit = 'Number of people trained on use of AI and digital tools';
    await mountForm({ unit_messurament: longUnit });
    const suffix: HTMLElement = fixture.nativeElement.querySelector('[data-testid="contribution-unit-suffix"]');

    expect(suffix.textContent?.trim()).toBe(longUnit);
    expect(suffix.classList.contains('truncate')).toBe(false);
  });

  it('hides unit suffix when unit_messurament is not provided', async () => {
    await mountForm({ unit_messurament: null });
    const suffix: HTMLElement = fixture.nativeElement.querySelector('[data-testid="contribution-unit-suffix"]');

    expect(suffix).toBeNull();
  });

  it('renders target reference with 2026 Target and achieved so far (RFUX-R-4, RFUX-AC-5)', async () => {
    await mountForm({ target_value_sum: 15, actual_achieved_value_sum: 3 });
    const ref: HTMLElement = fixture.nativeElement.querySelector('[data-testid="contribution-target-reference"]');

    expect(ref).toBeTruthy();
    expect(ref.textContent?.replace(/\s+/g, ' ').trim()).toContain('2026 Target: 15 · Achieved so far: 3');
  });

  it('renders persistent helper text and connects it via aria-describedby (RFUX-R-5)', async () => {
    await mountForm();
    const helper: HTMLElement = fixture.nativeElement.querySelector('#contribution-helper');
    expect(helper).toBeTruthy();
    expect(helper.textContent?.trim()).toBe('Enter the numerical amount this specific result contributes toward the target.');

    const input: HTMLInputElement = fixture.nativeElement.querySelector('#contribution-input');
    expect(input.getAttribute('aria-describedby')).toContain('contribution-helper');
    expect(input.getAttribute('aria-describedby')).toContain('contribution-target-reference');
  });

  it('updates contribution_to_indicator_target when numeric value is entered', async () => {
    await mountForm();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('#contribution-input');

    input.value = '8';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    component.patch('contribution_to_indicator_target', 8);
    expect(component.createResultBody().contribution_to_indicator_target).toBe(8);
  });
});

// @akili-spec changes/report-result-form-ux (RFUX-T-5, RFUX-R-7, RFUX-AC-7)
describe('LabReportFormComponent — Lead Center Protection & Layout Stability (RFUX-T-5)', () => {
  let fixture: ComponentFixture<LabReportFormComponent>;
  let component: LabReportFormComponent;

  const IRRI = { code: 'IRRI', acronym: 'IRRI', name: 'International Rice Research Institute' };
  const CIP = { code: 'CIP', acronym: 'CIP', name: 'International Potato Center' };

  beforeEach(async () => {
    const apiMock = makeApiMock();
    await TestBed.configureTestingModule({
      imports: [LabReportFormComponent],
      providers: [
        { provide: ApiService, useValue: apiMock },
        { provide: CentersService, useValue: { getData: () => Promise.resolve(), centersList: [IRRI, CIP], centers: signal<any[]>([IRRI, CIP]) } },
        { provide: ResultLevelService, useValue: { resultLevelListSig: signal<any[]>([]) } },
        { provide: Router, useValue: { navigate: jest.fn().mockResolvedValue(true) } }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(LabReportFormComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('initiativeId', 42);
    fixture.componentRef.setInput('indicator', {
      indicator_id: 1,
      result_type_id: 7,
      result_level_id: 4,
      type_name: 'Number of innovations',
      center_acronym: 'IRRI'
    });
    fixture.componentRef.setInput('canReport', true);
    fixture.detectChanges();
    await fixture.whenStable();
    await component.preselectCentersP;

    component.contributingCenters.set([IRRI, CIP]);
    fixture.detectChanges();
  });

  it('renders lead center chip with Lead badge and no remove button (RFUX-R-7, RFUX-AC-7)', () => {
    const leadChip: HTMLElement = fixture.nativeElement.querySelector('[data-testid="lead-center-chip"]');
    expect(leadChip).toBeTruthy();
    expect(leadChip.textContent).toContain('IRRI');
    expect(leadChip.textContent).toContain('Lead');

    const removeBtn = leadChip.querySelector('button');
    expect(removeBtn).toBeNull();
  });

  it('renders standard dismissible chip with close button for non-lead centers (RFUX-R-7)', () => {
    const chipsContainer: HTMLElement = fixture.nativeElement.querySelector('[data-testid="contributing-centers-chips"]');
    const cipBtn: HTMLButtonElement | null = chipsContainer.querySelector('button[aria-label="Remove CIP"]');

    expect(cipBtn).toBeTruthy();
  });

  it('isLeadCenter returns true for lead center acronym and false for other centers', () => {
    expect(component.isLeadCenter(IRRI)).toBe(true);
    expect(component.isLeadCenter(CIP)).toBe(false);
    expect(component.isLeadCenter({ code: 'irri' })).toBe(true);
  });

  it('calling removeCenter on lead center is a no-op and preserves the lead center (RFUX-R-7, RFUX-AC-7)', () => {
    component.removeCenter(IRRI);
    fixture.detectChanges();

    expect(component.contributingCenters().some(c => c.code === 'IRRI')).toBe(true);
    expect(component.contributingCenters().length).toBe(2);
  });

  it('calling removeCenter on non-lead center removes it from contributingCenters', () => {
    component.removeCenter(CIP);
    fixture.detectChanges();

    expect(component.contributingCenters().some(c => c.code === 'CIP')).toBe(false);
    expect(component.contributingCenters().length).toBe(1);
    expect(component.contributingCenters()[0].code).toBe('IRRI');
  });

  it('centers chip container has min-h-[32px] class for layout stability (CLS prevention)', () => {
    const container: HTMLElement = fixture.nativeElement.querySelector('[data-testid="contributing-centers-chips"]');
    expect(container).toBeTruthy();
    expect(container.classList.contains('min-h-[32px]')).toBe(true);
  });
});

// @akili-spec changes/report-result-form-ux (RFUX-T-6, RFUX-R-6, RFUX-AC-6, RFUX-AC-8)
describe('LabReportFormComponent — Interactive Readiness Action & Brand CTA (RFUX-T-6)', () => {
  let fixture: ComponentFixture<LabReportFormComponent>;
  let component: LabReportFormComponent;

  beforeEach(async () => {
    const apiMock = makeApiMock();
    await TestBed.configureTestingModule({
      imports: [LabReportFormComponent],
      providers: [
        { provide: ApiService, useValue: apiMock },
        { provide: CentersService, useValue: { getData: () => Promise.resolve(), centersList: [], centers: signal<any[]>([]) } },
        { provide: ResultLevelService, useValue: { resultLevelListSig: signal<any[]>([]) } },
        { provide: Router, useValue: { navigate: jest.fn().mockResolvedValue(true) } }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(LabReportFormComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('initiativeId', 42);
    fixture.componentRef.setInput('indicator', {
      indicator_id: 1,
      result_type_id: 7,
      result_level_id: 4,
      type_name: 'Number of innovations'
    });
    fixture.componentRef.setInput('canReport', true);
    window.HTMLElement.prototype.scrollIntoView = jest.fn();
    fixture.detectChanges();
  });

  it('renders missing fields as an interactive button when required fields are missing (RFUX-R-6, RFUX-AC-6)', () => {
    const button: HTMLButtonElement | null = fixture.nativeElement.querySelector('[data-testid="missing-fields-button"]');
    expect(button).toBeTruthy();
    expect(button?.tagName.toLowerCase()).toBe('button');
    expect(button?.textContent).toContain('left before you can create');
  });

  it('clicking missing fields button focuses title input when title is missing (RFUX-R-6, RFUX-AC-6)', () => {
    const titleEl: HTMLTextAreaElement = fixture.nativeElement.querySelector('#result-title-input');
    const focusSpy = jest.spyOn(titleEl, 'focus');
    const scrollSpy = jest.spyOn(titleEl, 'scrollIntoView').mockImplementation(() => {});

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('[data-testid="missing-fields-button"]');
    button.click();
    fixture.detectChanges();

    expect(focusSpy).toHaveBeenCalled();
    expect(scrollSpy).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
    expect(component.showValidationErrors()).toBe(true);
    expect(fixture.nativeElement.querySelector('[data-testid="field-title"].lrf-field--invalid')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="missing-fields-list"]')).toBeTruthy();
  });

  it('clicking missing fields button focuses contribution input when only contribution is missing (RFUX-R-6, RFUX-AC-6)', () => {
    component.patch('result_name', 'Valid scientific result title');
    fixture.detectChanges();

    const contribEl: HTMLInputElement = fixture.nativeElement.querySelector('#contribution-input');
    const focusSpy = jest.spyOn(contribEl, 'focus');
    const scrollSpy = jest.spyOn(contribEl, 'scrollIntoView').mockImplementation(() => {});

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('[data-testid="missing-fields-button"]');
    button.click();

    expect(focusSpy).toHaveBeenCalled();
    expect(scrollSpy).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
  });

  it('displays Ready to create indicator when all required fields are filled (RFUX-AC-8)', () => {
    component.patch('result_name', 'Valid title');
    component.patch('contribution_to_indicator_target', 10);
    fixture.detectChanges();

    const readyEl: HTMLElement = fixture.nativeElement.querySelector('[data-testid="ready-to-create-indicator"]');
    expect(readyEl).toBeTruthy();
    expect(readyEl.textContent).toContain('Ready to create');
    expect(fixture.nativeElement.querySelector('[data-testid="missing-fields-button"]')).toBeNull();
  });

  it('submit CTA button has brand gradient classes and stays clickable while incomplete (RFUX-AC-8)', () => {
    const submitBtn: HTMLButtonElement = fixture.nativeElement.querySelector('[data-testid="create-result-submit-btn"]');
    expect(submitBtn).toBeTruthy();
    expect(submitBtn.className).toContain('bg-gradient-to-r');
    expect(submitBtn.className).toContain('from-[var(--pr-color-primary-300)]');
    expect(submitBtn.className).toContain('to-[var(--pr-color-primary-400)]');
    expect(submitBtn.disabled).toBe(false);

    component.patch('result_name', 'Valid title');
    component.patch('contribution_to_indicator_target', 10);
    fixture.detectChanges();

    expect(submitBtn.disabled).toBe(false);
  });

  it('submitting an incomplete form reveals inline field errors without creating a result', () => {
    const createSpy = jest.spyOn(component, 'createResult');
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form');
    form.requestSubmit();
    fixture.detectChanges();

    expect(createSpy).not.toHaveBeenCalled();
    expect(component.showValidationErrors()).toBe(true);
    expect(fixture.nativeElement.querySelector('[data-testid="field-contribution"].lrf-field--invalid')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="field-title"].lrf-field--invalid')).toBeTruthy();
  });
});

// @akili-spec changes/progress-tracker-pull-bridge/progress-tracker-results-browse (PTB-T-3)
describe('LabReportFormComponent — Progress Tracker entry mode (PTB-T-3)', () => {
  // `KpCgspaceBrowseComponent` also injects `ResultsApiService` and calls `GET_cgspaceFacet` /
  // `GET_cgspaceSearch` from its own lifecycle (see `mount()` above, which never substitutes the
  // service either). Replacing the whole service with a minimal `{ GET_progressTrackerResults }`
  // stub — as a naive `useValue` provider would — breaks that unrelated component wherever both
  // are mounted together (the KP fixtures here). Spying on the prototype method instead keeps the
  // real service (and every other method on it) intact, exactly like `mount()`'s real-service
  // pattern, while still giving deterministic control over the one PT call this task owns.
  afterEach(() => jest.restoreAllMocks());

  function stubPtResults(envelope: any = { response: { status: 'ok', results: [] } }) {
    return jest.spyOn(ResultsApiService.prototype, 'GET_progressTrackerResults').mockReturnValue(of(envelope));
  }

  async function mountPt(inputs: Record<string, any> = {}) {
    const api = makeApiMock();
    const resultLevelSig = signal<any[]>([]);
    const outputOutcomeLevelsSig = computed(() => {
      const levels = resultLevelSig();
      return levels.length < 4 ? [] : levels.slice(2, 4).reverse();
    });
    const centersMock = { getData: () => Promise.resolve(), centersList: [], centers: signal<any[]>([]) };

    await TestBed.configureTestingModule({
      imports: [LabReportFormComponent],
      providers: [
        { provide: ApiService, useValue: api },
        { provide: CentersService, useValue: centersMock },
        { provide: ResultLevelService, useValue: { resultLevelListSig: resultLevelSig, outputOutcomeLevelsSig } },
        { provide: Router, useValue: { navigate: jest.fn().mockResolvedValue(true) } }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    const fix = TestBed.createComponent(LabReportFormComponent);
    fix.componentRef.setInput('initiativeId', 42);
    fix.componentRef.setInput('canReport', true);
    for (const [key, value] of Object.entries(inputs)) fix.componentRef.setInput(key, value);
    fix.detectChanges();
    return fix;
  }

  function tabs(fix: ComponentFixture<LabReportFormComponent>): HTMLButtonElement[] {
    return Array.from(fix.nativeElement.querySelectorAll('[role="tab"]'));
  }

  /**
   * PTB-T-6 rework (design.md §6.3): each tab now renders TWO `<span>`s (a short label and the
   * full label), toggled by a Tailwind `@container` query — CSS jsdom does not evaluate at all, so
   * `t.textContent` here concatenates BOTH spans regardless of which one a real browser would show
   * (e.g. "ManualManual entry"). `aria-label` is the stable, single source of the FULL label at
   * every width (the template keeps it constant), and is exactly what these tests intend to
   * identify a tab by — the CT spec (`lab-report-form.tabs.cy.ts`) is what verifies the visual
   * short/full swap a real browser renders, which jsdom cannot lay out anyway.
   */
  function tabLabel(t: HTMLButtonElement): string | null {
    return t.getAttribute('aria-label');
  }

  const nonKpIndicator = { indicator_id: 1, result_type_id: 7, result_level_id: OUTPUT_LEVEL, type_name: 'Number of innovations', related_node_id: 'toc-node-1' };
  const kpIndicator = { indicator_id: 2, result_type_id: 6, result_level_id: OUTPUT_LEVEL, type_name: 'Number of knowledge products', related_node_id: 'toc-node-2' };
  const somePtProposal: PtProposalDto = {
    result_key: 'pt-result-1',
    result_type: 'output',
    result_type_label: 'Output',
    title: 'A drafted result from the Progress Tracker',
    description: 'Drafted description',
    evidence: [],
    countries: [],
    impact_areas: null,
    gender_split: null,
    knowledge_product_handle: null,
    confidence: 0.87,
    rationale: 'because the evidence lines up',
    missing_info: []
  };

  it('PTB-AC-1: non-KP indicator renders exactly two tabs, no Browse repositories, defaulted to Manual entry with a non-empty tab body', async () => {
    const fix = await mountPt({ indicator: nonKpIndicator, tocNode: { result_level_id: OUTPUT_LEVEL } });

    const labels = tabs(fix).map(t => tabLabel(t));
    expect(labels).toEqual(['Manual entry', 'Progress Tracker']);
    expect(fix.nativeElement.textContent).not.toContain('Browse repositories');

    // The default-mode falsifier (`design.md` reversion challenge item 3): reverting the
    // per-type default back to a hard-coded 'browse' makes this assertion go red, because no tab
    // labelled 'browse' exists for a non-KP indicator.
    expect(fix.componentInstance.kpEntryMode()).toBe('manual');
    const manualTab = tabs(fix).find(t => tabLabel(t) === 'Manual entry');
    expect(manualTab?.getAttribute('aria-selected')).toBe('true');

    // Never an empty tab body (`DD-7`): the manual fields are visible regardless of the active tab
    // for a non-KP indicator, because the first clause of the reveal condition is already true.
    expect(fix.nativeElement.querySelector('[data-testid="field-title"]')).toBeTruthy();
  });

  it('PTB-AC-2: KP indicator renders three tabs and keeps Browse repositories as the default', async () => {
    const fix = await mountPt({ indicator: kpIndicator, tocNode: {} });

    const labels = tabs(fix).map(t => tabLabel(t));
    expect(labels).toEqual(['Browse repositories', 'Manual entry', 'Progress Tracker']);
    expect(fix.componentInstance.kpEntryMode()).toBe('browse');
    const browseTab = tabs(fix).find(t => tabLabel(t) === 'Browse repositories');
    expect(browseTab?.getAttribute('aria-selected')).toBe('true');
  });

  it('PTB-R-12: emerging mode renders no switcher and no Progress Tracker panel, and the create footer still renders', async () => {
    const fix = await mountPt({ emergingMode: true, emergingCategory: null, indicator: null, tocNode: null });

    expect(tabs(fix).length).toBe(0);
    expect(fix.nativeElement.querySelector('app-pt-results-browse')).toBeNull();

    const createBtn: HTMLButtonElement | null = fix.nativeElement.querySelector('[data-testid="create-result-submit-btn"]');
    expect(createBtn).toBeTruthy();
    expect(createBtn?.textContent).toContain('Create and continue');
  });

  // PTB-T-4: pins the `Create and continue` footer specifically (not "a footer") across the
  // emerging-mode shapes the Card 3 reveal condition (`!currentResultIsKnowledgeProduct() || ...`)
  // treats differently — no category (covered above), a non-KP category, and a KP category once a
  // handle makes the third clause true.
  it('PTB-T-4: emerging mode with a non-KP category still renders the reachable Create and continue control', async () => {
    const fix = await mountPt({
      emergingCategory: { id: 7, name: 'Innovation development', levelId: OUTPUT_LEVEL },
      indicator: null,
      tocNode: null
    });

    expect(fix.componentInstance.isEmerging()).toBe(true);
    expect(fix.componentInstance.currentResultIsKnowledgeProduct()).toBe(false);

    const createBtn: HTMLButtonElement | null = fix.nativeElement.querySelector('[data-testid="create-result-submit-btn"]');
    expect(createBtn).toBeTruthy();
    expect(createBtn?.hidden).toBe(false);
    expect(createBtn?.disabled).toBe(false);
    expect(createBtn?.textContent).toContain('Create and continue');
  });

  it('PTB-T-4: emerging mode with a Knowledge Product category renders the reachable Create and continue control once a handle is set', async () => {
    const fix = await mountPt({
      emergingCategory: { id: 6, name: 'Knowledge product', levelId: OUTPUT_LEVEL },
      indicator: null,
      tocNode: null
    });

    // Before a handle: Card 3 (and its footer) isn't revealed yet — matches HEAD's
    // KP-browse-before-selection behavior. Confirms the scenario actually exercises the
    // handler-truthy clause below rather than an already-true clause.
    expect(fix.nativeElement.querySelector('[data-testid="create-result-submit-btn"]')).toBeNull();

    fix.componentInstance.patch('handler', 'https://hdl.handle.net/10568/128401');
    fix.detectChanges();

    const createBtn: HTMLButtonElement | null = fix.nativeElement.querySelector('[data-testid="create-result-submit-btn"]');
    expect(createBtn).toBeTruthy();
    expect(createBtn?.hidden).toBe(false);
    expect(createBtn?.disabled).toBe(false);
    expect(createBtn?.textContent).toContain('Create and continue');
  });

  // Leader correction (PTB-T-3 re-review): emerging must render EXACTLY as HEAD. A KP-category
  // emerging result already shows the Browse/Manual switcher at HEAD — only the NEW Progress
  // Tracker tab/panel must stay hidden there, not the whole switcher.
  it('PTB-R-12/PTB-R-13 (Leader correction): emerging with a Knowledge Product category still renders Browse repositories and Manual entry (not Progress Tracker), and the handle field is present exactly as HEAD', async () => {
    const fix = await mountPt({ emergingCategory: { id: 6, name: 'Knowledge product', levelId: OUTPUT_LEVEL }, indicator: null, tocNode: null });

    const labels = tabs(fix).map(t => tabLabel(t));
    expect(labels).toEqual(['Browse repositories', 'Manual entry']);
    expect(fix.nativeElement.textContent).not.toContain('Progress Tracker');
    expect(fix.nativeElement.querySelector('[data-testid="field-handler"]')).toBeTruthy();
    expect(fix.nativeElement.querySelector('app-pt-results-browse')).toBeNull();
  });

  // Leader correction (PTB-T-3 re-review): the non-KP emerging path (no switcher at all) must stay
  // exactly as HEAD too — a second, focused lock beside the broader PTB-R-12 test above.
  it('PTB-R-12 (Leader correction): emerging without a Knowledge Product category renders no tablist at all', async () => {
    const fix = await mountPt({ emergingMode: true, emergingCategory: null, indicator: null, tocNode: null });

    expect(tabs(fix).length).toBe(0);
  });

  it('PTB-R-22: the panel is absent before the tab opens, mounts once opened, and is retained (no second fetch) across a tab switch', async () => {
    const getResults = stubPtResults({ response: { status: 'ok', results: [] } });
    const fix = await mountPt({ indicator: nonKpIndicator, tocNode: { result_level_id: OUTPUT_LEVEL } });

    expect(fix.nativeElement.querySelector('app-pt-results-browse')).toBeNull();
    expect(getResults).not.toHaveBeenCalled();

    fix.componentInstance.onOpenProgressTrackerTab();
    fix.detectChanges();
    const panelAfterOpen = fix.nativeElement.querySelector('app-pt-results-browse');
    expect(panelAfterOpen).toBeTruthy();
    expect(getResults).toHaveBeenCalledTimes(1);

    // Switch away and back — the component must not be remounted or refetched (PTB-R-22).
    fix.componentInstance.kpEntryMode.set('manual');
    fix.detectChanges();
    fix.componentInstance.kpEntryMode.set('progress-tracker');
    fix.detectChanges();

    const panelAfterSwitchBack = fix.nativeElement.querySelector('app-pt-results-browse');
    expect(panelAfterSwitchBack).toBeTruthy();
    expect(panelAfterSwitchBack).toBe(panelAfterOpen);
    expect(getResults).toHaveBeenCalledTimes(1);
  });

  it('after picking a Progress Tracker proposal on a KP indicator, the three reveal sites render (title card, Card 2, and the create footer)', async () => {
    stubPtResults({ response: { status: 'ok', results: [] } });
    const fix = await mountPt({ indicator: kpIndicator, tocNode: { result_level_id: OUTPUT_LEVEL } });

    fix.componentInstance.onOpenProgressTrackerTab();
    fix.detectChanges();

    // Before a pick: mirrors the KP-browse-before-selection behavior — the rest of the form stays hidden.
    expect(fix.nativeElement.querySelector('[data-testid="field-title"]')).toBeNull();
    expect(fix.nativeElement.querySelector('[data-testid="card-target-contribution"]')).toBeNull();
    expect(fix.nativeElement.querySelector('[data-testid="card-collaboration"]')).toBeNull();

    fix.componentInstance.onPtResultSelected(somePtProposal);
    fix.detectChanges();

    expect(fix.componentInstance.ptDraft()).toEqual(somePtProposal);
    expect(fix.nativeElement.querySelector('[data-testid="card-result-identity"]')).toBeTruthy();
    expect(fix.nativeElement.querySelector('[data-testid="field-title"]')).toBeTruthy();
    expect(fix.nativeElement.querySelector('[data-testid="card-target-contribution"]')).toBeTruthy();
    const card3: HTMLElement | null = fix.nativeElement.querySelector('[data-testid="card-collaboration"]');
    expect(card3).toBeTruthy();
    const createBtn: HTMLButtonElement | null = fix.nativeElement.querySelector('[data-testid="create-result-submit-btn"]');
    expect(createBtn).toBeTruthy();
    expect(createBtn?.textContent).toContain('Create and continue');
  });

  // Reviewer FAIL, attempt 2: `resetForm()`'s default only fires at re-arm. Two paths carry no
  // category then (emerging without a preset category, and any uncategorised planned indicator) —
  // picking Knowledge product BY HAND afterwards must still land on Browse, and flipping back off
  // Knowledge product must still land on Manual. None of this was covered before: the earlier
  // emerging-KP test used a PRESET `emergingCategory`, which is already KP at re-arm.
  describe('onCategoryChange re-derives the entry mode when KP-ness flips (Reviewer FAIL, attempt 2)', () => {
    it('emerging mode, no preset category: picking Knowledge product by hand selects Browse repositories', async () => {
      const fix = await mountPt({ emergingMode: true, emergingCategory: null, indicator: null, tocNode: null });
      expect(fix.componentInstance.kpEntryMode()).toBe('manual');

      fix.componentInstance.onCategoryChange(6);
      fix.detectChanges();

      expect(fix.componentInstance.kpEntryMode()).toBe('browse');
      const browseTab = tabs(fix).find(t => tabLabel(t) === 'Browse repositories');
      expect(browseTab?.getAttribute('aria-selected')).toBe('true');
    });

    it('an uncategorised planned indicator: picking Knowledge product by hand selects Browse repositories', async () => {
      const uncategorisedIndicator = { indicator_id: 9, result_level_id: OUTPUT_LEVEL };
      const fix = await mountPt({ indicator: uncategorisedIndicator, tocNode: { result_level_id: OUTPUT_LEVEL } });
      expect(fix.componentInstance.needsCategoryChoice()).toBe(true);
      expect(fix.componentInstance.kpEntryMode()).toBe('manual');

      fix.componentInstance.onCategoryChange(6);
      fix.detectChanges();

      expect(fix.componentInstance.kpEntryMode()).toBe('browse');
      const browseTab = tabs(fix).find(t => tabLabel(t) === 'Browse repositories');
      expect(browseTab?.getAttribute('aria-selected')).toBe('true');
    });

    it('reverse flip: switching an uncategorised indicator away from Knowledge product selects Manual entry', async () => {
      const uncategorisedIndicator = { indicator_id: 9, result_level_id: OUTPUT_LEVEL };
      const fix = await mountPt({ indicator: uncategorisedIndicator, tocNode: { result_level_id: OUTPUT_LEVEL } });
      fix.componentInstance.onCategoryChange(6);
      fix.detectChanges();
      expect(fix.componentInstance.kpEntryMode()).toBe('browse');

      fix.componentInstance.onCategoryChange(7);
      fix.detectChanges();

      expect(fix.componentInstance.kpEntryMode()).toBe('manual');
      expect(fix.nativeElement.textContent).not.toContain('Browse repositories');
      const manualTab = tabs(fix).find(t => tabLabel(t) === 'Manual entry');
      expect(manualTab?.getAttribute('aria-selected')).toBe('true');
    });
  });

  // @akili-spec changes/progress-tracker-pull-bridge/progress-tracker-results-browse (PTB-T-5)
  describe('Pick-to-prefill mapping and the create payload (PTB-T-5)', () => {
    /** No preset category, no `type_name` — mirrors the ~350 live indicators that leave the type open. */
    const openTypeIndicator = { indicator_id: 9, result_level_id: OUTPUT_LEVEL, related_node_id: 'toc-node-9' };
    const longTitle = Array.from({ length: 35 }, (_, i) => `word${i + 1}`).join(' ');

    function proposal(overrides: Partial<PtProposalDto> = {}): PtProposalDto {
      return { ...somePtProposal, ...overrides };
    }

    it('PTB-AC-8: truncates a title longer than 30 words and shows a visible notice', async () => {
      const fix = await mountPt({ indicator: nonKpIndicator, tocNode: { result_level_id: OUTPUT_LEVEL } });
      fix.componentInstance.onOpenProgressTrackerTab();

      fix.componentInstance.onPtResultSelected(proposal({ title: longTitle }));
      fix.detectChanges();

      const savedTitle = fix.componentInstance.createResultBody().result_name;
      expect(savedTitle.split(' ')).toHaveLength(30);
      expect(savedTitle).toBe(longTitle.split(' ').slice(0, 30).join(' '));
      expect(fix.componentInstance.ptTitleTruncated()).toBe(true);
      expect(fix.nativeElement.querySelector('[data-testid="pt-title-truncated-notice"]')).toBeTruthy();
    });

    it('does not show the truncation notice when the title already fits within 30 words', async () => {
      const fix = await mountPt({ indicator: nonKpIndicator, tocNode: { result_level_id: OUTPUT_LEVEL } });
      fix.componentInstance.onOpenProgressTrackerTab();

      fix.componentInstance.onPtResultSelected(proposal({ title: 'A short title' }));
      fix.detectChanges();

      expect(fix.componentInstance.ptTitleTruncated()).toBe(false);
      expect(fix.nativeElement.querySelector('[data-testid="pt-title-truncated-notice"]')).toBeNull();
    });

    // PTB-AC-9 / Falsifier 1 fixture (task brief): an indicator that FIXES the type.
    it('PTB-AC-9: an indicator that fixes the result type keeps it — the proposal type must NOT override it', async () => {
      const fix = await mountPt({ indicator: kpIndicator, tocNode: { result_level_id: OUTPUT_LEVEL } });
      expect(fix.componentInstance.ptIndicatorFixesResultType()).toBe(true);
      fix.componentInstance.onOpenProgressTrackerTab();

      fix.componentInstance.onPtResultSelected(proposal({ result_type: 'innovation_development', result_type_label: 'Innovation development' }));
      fix.detectChanges();

      expect(fix.componentInstance.createResultBody().result_type_id).toBe(6);
    });

    // PTB-AC-10 / Falsifier 1 fixture (task brief): an indicator that LEAVES the type open — the
    // second half of the two-indicator fixture pair the falsifier needs to discriminate the guard.
    it('PTB-AC-10: an indicator that leaves the type open gets the proposal type pre-filled', async () => {
      const fix = await mountPt({ indicator: openTypeIndicator, tocNode: { result_level_id: OUTPUT_LEVEL } });
      expect(fix.componentInstance.ptIndicatorFixesResultType()).toBe(false);
      fix.componentInstance.onOpenProgressTrackerTab();

      fix.componentInstance.onPtResultSelected(proposal({ result_type: 'innovation_development', result_type_label: 'Innovation development' }));
      fix.detectChanges();

      expect(fix.componentInstance.createResultBody().result_type_id).toBe(7);
    });

    it('leaves the type unset when the proposal type has no mapping, rather than guessing', async () => {
      const fix = await mountPt({ indicator: openTypeIndicator, tocNode: { result_level_id: OUTPUT_LEVEL } });
      fix.componentInstance.onOpenProgressTrackerTab();

      fix.componentInstance.onPtResultSelected(proposal({ result_type: 'something_unmapped', result_type_label: 'Something unmapped' }));
      fix.detectChanges();

      expect(fix.componentInstance.createResultBody().result_type_id).toBeNull();
    });

    it('PTB-R-11 / DD-3: pre-fills the KP handle through patch() without ever touching mqapJson', async () => {
      const fix = await mountPt({ indicator: kpIndicator, tocNode: { result_level_id: OUTPUT_LEVEL } });
      fix.componentInstance.onOpenProgressTrackerTab();

      fix.componentInstance.onPtResultSelected(proposal({ knowledge_product_handle: 'https://hdl.handle.net/10568/999999' }));
      fix.detectChanges();

      expect(fix.componentInstance.createResultBody().handler).toBe('https://hdl.handle.net/10568/999999');
      expect(fix.componentInstance.mqapJson()).toBeNull();
    });

    it('does not pre-fill the handle when the proposal carries none', async () => {
      const fix = await mountPt({ indicator: kpIndicator, tocNode: { result_level_id: OUTPUT_LEVEL } });
      fix.componentInstance.onOpenProgressTrackerTab();

      fix.componentInstance.onPtResultSelected(proposal({ knowledge_product_handle: null }));
      fix.detectChanges();

      expect(fix.componentInstance.createResultBody().handler).toBe('');
    });

    // Disqualifier check (task brief `P-8`/`DD-3`): pre-filling the handle does NOT by itself clear
    // `missingFields()`'s "Repository link/handle" entry — the field is not permanently stuck,
    // though: the existing MQAP Sync (`validateHandle()`, reachable from the Manual entry tab) still
    // clears it, working off the value the pick already placed in the field. This is the reported
    // finding, not a defect — `mqapJson` staying untouched is exactly what `DD-3` requires.
    it('Disqualifier check: handle pre-fill alone leaves "Repository link/handle" missing; the existing MQAP Sync still clears it', async () => {
      const fix = await mountPt({ indicator: kpIndicator, tocNode: { result_level_id: OUTPUT_LEVEL } });
      fix.componentInstance.onOpenProgressTrackerTab();

      fix.componentInstance.onPtResultSelected(proposal({ knowledge_product_handle: 'https://hdl.handle.net/10568/999999' }));
      fix.detectChanges();

      expect(fix.componentInstance.missingFields()).toContain('Repository link/handle');
      expect(fix.componentInstance.mqapJson()).toBeNull();

      // The user switches to Manual entry and presses Sync — GET_mqapValidation is the shared stub
      // from `makeApiMock()`, and it resolves off the value the pick ALREADY placed in the field.
      fix.componentInstance.kpEntryMode.set('manual');
      fix.componentInstance.validateHandle();
      fix.detectChanges();

      expect(fix.componentInstance.mqapJson()).toEqual({ title: 'Retrieved title', metadata: [{ source: 'CGSpace' }] });
      expect(fix.componentInstance.missingFields()).not.toContain('Repository link/handle');
    });

    it('PTB-R-15: the banner states nothing has been saved, and "Change proposal" clears the pick', async () => {
      const fix = await mountPt({ indicator: kpIndicator, tocNode: { result_level_id: OUTPUT_LEVEL } });
      fix.componentInstance.onOpenProgressTrackerTab();

      fix.componentInstance.onPtResultSelected(proposal());
      fix.detectChanges();

      const banner: HTMLElement | null = fix.nativeElement.querySelector('[data-testid="pt-nothing-saved-note"]');
      expect(banner?.textContent).toContain('Nothing has been saved yet');

      const changeBtn: HTMLButtonElement | null = fix.nativeElement.querySelector('[data-testid="pt-change-proposal"]');
      changeBtn?.click();
      fix.detectChanges();

      expect(fix.componentInstance.ptDraft()).toBeNull();
      expect(fix.nativeElement.querySelector('[data-testid="pt-pick-banner"]')).toBeNull();
    });

    it('PTB-AC-11: selecting a proposal issues no create request', async () => {
      const fix = await mountPt({ indicator: nonKpIndicator, tocNode: { result_level_id: OUTPUT_LEVEL } });
      const api: any = TestBed.inject(ApiService);
      fix.componentInstance.onOpenProgressTrackerTab();

      fix.componentInstance.onPtResultSelected(proposal());
      fix.detectChanges();

      expect(api.resultsSE.POST_createResult).not.toHaveBeenCalled();
    });

    it('PTB-AC-12 / PTB-R-16 / PTB-AC-17: Create and continue sends exactly one POST carrying the narrative + provenance, never the guidance-only fields', async () => {
      const fix = await mountPt({ indicator: nonKpIndicator, tocNode: { result_level_id: OUTPUT_LEVEL } });
      const api: any = TestBed.inject(ApiService);
      fix.componentInstance.onOpenProgressTrackerTab();

      fix.componentInstance.onPtResultSelected(
        proposal({
          description: 'Draft description',
          result_key: 'toc-node-1:1',
          evidence_fingerprint: 'fingerprint-1',
          generated_at: '2026-09-22T00:00:00.000Z',
          countries: ['Kenya'],
          impact_areas: { gender: 1 },
          gender_split: { women: 1, men: 2 }
        })
      );
      fix.componentInstance.patch('contribution_to_indicator_target', 3);
      fix.detectChanges();

      fix.componentInstance.createResult();

      expect(api.resultsSE.POST_createResult).toHaveBeenCalledTimes(1);
      const body = api.resultsSE.POST_createResult.mock.calls[0][0];
      expect(body.toc_progressive_narrative).toBe(
        'Draft description\n\nDrafted from Progress Tracker proposal toc-node-1:1, generated 2026-09-22T00:00:00.000Z.'
      );
      expect(body.progress_tracker_provenance).toEqual({
        result_key: 'toc-node-1:1',
        evidence_fingerprint: 'fingerprint-1',
        generated_at: '2026-09-22T00:00:00.000Z'
      });
      // PTB-AC-17: countries / impact areas / gender split are guidance only — never in the payload.
      expect(JSON.stringify(body)).not.toMatch(/Kenya|impact_areas|gender_split/);
    });

    it('PTB-AC-13: a manual (non-Progress-Tracker) create still sends an empty narrative and no provenance block', async () => {
      const fix = await mountPt({ indicator: nonKpIndicator, tocNode: { result_level_id: OUTPUT_LEVEL } });
      const api: any = TestBed.inject(ApiService);
      fix.componentInstance.patch('result_name', 'A manual title');
      fix.componentInstance.patch('contribution_to_indicator_target', 1);
      fix.detectChanges();

      fix.componentInstance.createResult();

      const body = api.resultsSE.POST_createResult.mock.calls[0][0];
      expect(body.toc_progressive_narrative).toBe('');
      expect(body).not.toHaveProperty('progress_tracker_provenance');
    });
  });

  // PTB-T-5 REWORK, attempt 2 — Reviewer FAIL + Requester ruling (2026-09-22)
  describe('Rework: banner travels with the pick, and a KP pick never auto-creates (PTB-R-11 amended)', () => {
    function proposal(overrides: Partial<PtProposalDto> = {}): PtProposalDto {
      return { ...somePtProposal, ...overrides };
    }

    /** `validateHandle()`'s success path awaits `Promise.resolve(this.preselectCentersP)` before
     * deciding whether to auto-create — a real microtask boundary a synchronous test must flush
     * before asserting on `POST_createResult`, or the assertion passes on EITHER side of the
     * `ptDraft()` guard purely from timing (the continuation simply hasn't run yet). */
    async function flushAsync(fix: ComponentFixture<LabReportFormComponent>): Promise<void> {
      await Promise.resolve();
      await Promise.resolve();
      await fix.whenStable();
    }

    // Test 1 (ruling's list) — the banner must travel with the pick across every tab.
    it('the "nothing saved" banner stays visible after switching away from the Progress Tracker tab to Manual entry', async () => {
      const fix = await mountPt({ indicator: kpIndicator, tocNode: { result_level_id: OUTPUT_LEVEL } });
      fix.componentInstance.onOpenProgressTrackerTab();

      fix.componentInstance.onPtResultSelected(proposal());
      fix.detectChanges();
      expect(fix.nativeElement.querySelector('[data-testid="pt-nothing-saved-note"]')).toBeTruthy();

      fix.componentInstance.kpEntryMode.set('manual');
      fix.detectChanges();

      expect(fix.nativeElement.querySelector('[data-testid="pt-nothing-saved-note"]')).toBeTruthy();
    });

    // Test 2 (ruling's list) — KP pick -> Sync -> no create; Create and continue -> exactly one POST.
    // Contribution is set BEFORE Sync so the form is otherwise fully save-ready the moment mqapJson
    // lands — the ONLY thing standing between Sync and an auto-create is the `ptDraft()` guard
    // (Falsifier F-a). An inert fixture that leaves contribution unset would pass whether or not the
    // guard exists, because `canSave()` would be false for an unrelated reason either way.
    it('a KP pick completes Sync without auto-creating; Create and continue then posts exactly once, carrying provenance', async () => {
      const fix = await mountPt({ indicator: kpIndicator, tocNode: { result_level_id: OUTPUT_LEVEL } });
      const api: any = TestBed.inject(ApiService);
      fix.componentInstance.onOpenProgressTrackerTab();

      fix.componentInstance.onPtResultSelected(
        proposal({ knowledge_product_handle: 'https://hdl.handle.net/10568/999999', result_key: 'toc-node-2:1' })
      );
      fix.componentInstance.patch('contribution_to_indicator_target', 1);
      fix.detectChanges();

      fix.componentInstance.kpEntryMode.set('manual');
      fix.componentInstance.validateHandle();
      await flushAsync(fix);
      fix.detectChanges();

      // Sync still validates and fills mqapJson exactly as today — it just never auto-creates.
      expect(fix.componentInstance.mqapJson()).toEqual({ title: 'Retrieved title', metadata: [{ source: 'CGSpace' }] });
      expect(fix.componentInstance.missingFields()).toHaveLength(0);
      expect(api.resultsSE.POST_createResult).not.toHaveBeenCalled();

      fix.componentInstance.createResult();

      expect(api.resultsSE.POST_createResult).toHaveBeenCalledTimes(1);
      const body = api.resultsSE.POST_createResult.mock.calls[0][0];
      expect(body.progress_tracker_provenance).toEqual({ result_key: 'toc-node-2:1' });
    });

    // Test 3 (ruling's list) — with NO pick, KP Sync auto-create stays byte-identical. Already
    // locked by the pre-existing `KPAC-TEST-4 — validateHandle auto-creates on valid handle; invalid
    // handle does not POST` (this file, `describe('KPAC — knowledge-product auto-create ...')`),
    // which passed unchanged after this rework (`ptDraft()` is null on that fixture — `setup()`
    // never touches the Progress Tracker tab). No new test added for this case; naming it here.

    // Test 4 (ruling's list) — the inline sync prompt on the PT tab of an unsynced KP pick.
    it('the inline sync-required prompt renders on the Progress Tracker tab for an unsynced KP pick, and its button switches to Manual entry', async () => {
      const fix = await mountPt({ indicator: kpIndicator, tocNode: { result_level_id: OUTPUT_LEVEL } });
      fix.componentInstance.onOpenProgressTrackerTab();

      fix.componentInstance.onPtResultSelected(proposal({ knowledge_product_handle: 'https://hdl.handle.net/10568/999999' }));
      fix.detectChanges();

      expect(fix.nativeElement.querySelector('[data-testid="pt-sync-required-prompt"]')).toBeTruthy();

      const switchBtn: HTMLButtonElement | null = fix.nativeElement.querySelector('[data-testid="pt-sync-required-switch-to-manual"]');
      expect(switchBtn).toBeTruthy();
      switchBtn?.click();
      fix.detectChanges();

      expect(fix.componentInstance.kpEntryMode()).toBe('manual');
    });

    it('the inline sync-required prompt disappears once the handle is synced', async () => {
      const fix = await mountPt({ indicator: kpIndicator, tocNode: { result_level_id: OUTPUT_LEVEL } });
      fix.componentInstance.onOpenProgressTrackerTab();

      fix.componentInstance.onPtResultSelected(proposal({ knowledge_product_handle: 'https://hdl.handle.net/10568/999999' }));
      fix.detectChanges();
      expect(fix.nativeElement.querySelector('[data-testid="pt-sync-required-prompt"]')).toBeTruthy();

      fix.componentInstance.kpEntryMode.set('manual');
      fix.componentInstance.validateHandle();
      fix.componentInstance.kpEntryMode.set('progress-tracker');
      fix.detectChanges();

      expect(fix.nativeElement.querySelector('[data-testid="pt-sync-required-prompt"]')).toBeNull();
    });

    // [advisory] onPtResultSelected clears stale KP metadata when the mapped type leaves KP.
    it('[advisory] clears mqapJson/handler when a re-picked proposal maps the open type away from Knowledge product', async () => {
      const openIndicator = { indicator_id: 9, result_level_id: OUTPUT_LEVEL, related_node_id: 'toc-node-9' };
      const fix = await mountPt({ indicator: openIndicator, tocNode: { result_level_id: OUTPUT_LEVEL } });
      fix.componentInstance.onOpenProgressTrackerTab();

      fix.componentInstance.onPtResultSelected(
        proposal({ result_type: 'knowledge_product', result_type_label: 'Knowledge product', knowledge_product_handle: 'https://hdl.handle.net/10568/1' })
      );
      fix.detectChanges();
      expect(fix.componentInstance.currentResultIsKnowledgeProduct()).toBe(true);
      expect(fix.componentInstance.createResultBody().handler).toBe('https://hdl.handle.net/10568/1');

      fix.componentInstance.onPtResultSelected(
        proposal({ result_type: 'innovation_development', result_type_label: 'Innovation development', knowledge_product_handle: null })
      );
      fix.detectChanges();

      expect(fix.componentInstance.currentResultIsKnowledgeProduct()).toBe(false);
      expect(fix.componentInstance.createResultBody().handler).toBe('');
      expect(fix.componentInstance.mqapJson()).toBeNull();
    });

    // [advisory] ptTitleTruncated clears when a KP Sync replaces the title.
    it('[advisory] clears the truncation notice once a KP Sync replaces the title', async () => {
      const fix = await mountPt({ indicator: kpIndicator, tocNode: { result_level_id: OUTPUT_LEVEL } });
      fix.componentInstance.onOpenProgressTrackerTab();

      const longTitle = Array.from({ length: 35 }, (_, i) => `word${i + 1}`).join(' ');
      fix.componentInstance.onPtResultSelected(proposal({ title: longTitle, knowledge_product_handle: 'https://hdl.handle.net/10568/2' }));
      fix.detectChanges();
      expect(fix.componentInstance.ptTitleTruncated()).toBe(true);

      fix.componentInstance.kpEntryMode.set('manual');
      fix.componentInstance.validateHandle();
      fix.detectChanges();

      expect(fix.componentInstance.ptTitleTruncated()).toBe(false);
    });
  });
});
