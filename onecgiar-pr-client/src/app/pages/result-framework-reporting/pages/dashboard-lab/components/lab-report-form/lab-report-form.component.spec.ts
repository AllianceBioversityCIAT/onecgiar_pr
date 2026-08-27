import { readFileSync } from 'fs';
import { join } from 'path';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { LabReportFormComponent } from './lab-report-form.component';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { CentersService } from '../../../../../../shared/services/global/centers.service';
import { ResultLevelService } from '../../../../../results/pages/result-creator/services/result-level.service';
import { signal } from '@angular/core';

/**
 * The template is replaced with an empty one on purpose: these tests are about the rules the form
 * enforces (which category branch is live, what blocks a save, what state survives a category
 * change), not about the custom-field controls, which are covered by their own Cypress component
 * specs. Rendering them here would drag half the design system into jsdom for no extra coverage.
 */

const OUTPUT_LEVEL = 4;

function makeApiMock() {
  return {
    resultsSE: {
      GET_AllInitiatives: jest.fn().mockReturnValue(of({ response: [] })),
      GET_W3BilateralProjectsByProgram: jest.fn().mockReturnValue(of({ response: [] })),
      GET_mqapValidation: jest.fn().mockReturnValue(of({ response: { title: 'Retrieved title', metadata: [{ source: 'CGSpace' }] } })),
      POST_createResult: jest.fn().mockReturnValue(of({ response: { result: { result_code: 'R-1', version_id: 9 } } }))
    },
    alertsFe: { show: jest.fn() }
  };
}

describe('LabReportFormComponent', () => {
  let fixture: ComponentFixture<LabReportFormComponent>;
  let component: LabReportFormComponent;
  let api: ReturnType<typeof makeApiMock>;
  let resultLevelSig: ReturnType<typeof signal<any[]>>;

  async function setup(inputs: Record<string, any> = {}) {
    api = makeApiMock();
    resultLevelSig = signal<any[]>([]);

    await TestBed.configureTestingModule({
      imports: [LabReportFormComponent],
      providers: [
        { provide: ApiService, useValue: api },
        { provide: CentersService, useValue: { getData: () => Promise.resolve(), centersList: [] } },
        { provide: ResultLevelService, useValue: { resultLevelListSig: resultLevelSig } },
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
});
