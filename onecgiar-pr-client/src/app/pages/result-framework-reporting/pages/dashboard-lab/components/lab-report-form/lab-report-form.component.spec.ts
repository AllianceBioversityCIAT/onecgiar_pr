import { readFileSync } from 'fs';
import { join } from 'path';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { LabReportFormComponent } from './lab-report-form.component';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { CentersService } from '../../../../../../shared/services/global/centers.service';
import { ResultLevelService } from '../../../../../results/pages/result-creator/services/result-level.service';
import { NO_ERRORS_SCHEMA, WritableSignal, computed, signal } from '@angular/core';

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
        { provide: Router, useValue: { navigate: jest.fn().mockResolvedValue(true) } }
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
  });

  // quick/category-picker-kp-reset (2026-09-04) — field bug: picking "Knowledge product" in the
  // category picker snapped back to "Select a category" while every other category stuck.
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

    it('renders both Browse CGSpace and Manual entry tabs in template', () => {
      const template = readFileSync(join(__dirname, 'lab-report-form.component.html'), 'utf8');

      expect(template.indexOf('Browse CGSpace')).toBeGreaterThan(-1);
      expect(template.indexOf('Manual entry')).toBeGreaterThan(-1);
      expect(template.indexOf('app-kp-cgspace-browse')).toBeGreaterThan(-1);
      expect(template.indexOf('Repository link/handle')).toBeGreaterThan(-1);
    });

    it('shows a section spinner overlay while creatingResult is true', () => {
      const template = readFileSync(join(__dirname, 'lab-report-form.component.html'), 'utf8');

      expect(template.indexOf('[attr.aria-busy]="creatingResult()"')).toBeGreaterThan(-1);
      expect(template.indexOf('Creating result…')).toBeGreaterThan(-1);
      expect(template.indexOf('pi pi-spin pi-spinner')).toBeGreaterThan(-1);
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
    const centersMock = { getData: () => Promise.resolve(), centersList: [], centers: signal<any[]>([]) };

    await TestBed.configureTestingModule({
      imports: [LabReportFormComponent],
      providers: [
        { provide: ApiService, useValue: api },
        { provide: CentersService, useValue: centersMock },
        { provide: ResultLevelService, useValue: { resultLevelListSig: resultLevelSig } },
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

    expect(focusSpy).toHaveBeenCalled();
    expect(scrollSpy).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
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

  it('submit CTA button has brand gradient classes and is enabled when form is complete (RFUX-AC-8)', () => {
    const submitBtn: HTMLButtonElement = fixture.nativeElement.querySelector('[data-testid="create-result-submit-btn"]');
    expect(submitBtn).toBeTruthy();
    expect(submitBtn.className).toContain('bg-gradient-to-r');
    expect(submitBtn.className).toContain('from-[var(--pr-color-primary-300)]');
    expect(submitBtn.className).toContain('to-[var(--pr-color-primary-400)]');
    expect(submitBtn.disabled).toBe(true);

    component.patch('result_name', 'Valid title');
    component.patch('contribution_to_indicator_target', 10);
    fixture.detectChanges();

    expect(submitBtn.disabled).toBe(false);
  });
});






