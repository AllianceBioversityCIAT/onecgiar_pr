// @akili-spec results/impact-results-reporting/result-detail-impact (IRD-T-3)
import { CUSTOM_ELEMENTS_SCHEMA, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { HTTP_INTERCEPTORS, HttpClient } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { HlmButton } from '@spartan/button';
import { HlmDialogService } from '@spartan/dialog';
import { ImpactLevelInfoComponent } from './impact-level-info.component';
import { ApiService } from '../../../../../../../shared/services/api/api.service';
import { AuthService } from '../../../../../../../shared/services/api/auth.service';
import { RolesService } from '../../../../../../../shared/services/global/roles.service';
import { GreenChecksService } from '../../../../../../../shared/services/global/green-checks.service';
import { GeneralInterceptorService } from '../../../../../../../shared/interceptors/general-interceptor.service';
import { IpsrCompletenessStatusService } from '../../../../../../../pages/ipsr/services/ipsr-completeness-status.service';
import { CustomFieldsModule } from '../../../../../../../custom-fields/custom-fields.module';
import { FeedbackValidationDirectiveModule } from '../../../../../../../shared/directives/feedback-validation-directive.module';
import { SaveButtonService } from '../../../../../../../custom-fields/save-button/save-button.service';
import { BeforeUnloadWarningDirective } from '../../../../../../../shared/directives/before-unload-warning.directive';
import { environment } from '../../../../../../../../environments/environment';

const TYPES = [
  { id: 1, name: 'Learning study', definition: 'Learning definition' },
  { id: 2, name: 'Accountability study', definition: 'Accountability definition' }
];

const prev = (id: number) => ({
  result_id: id,
  result_code: id + 1000,
  title: `Result ${id}`,
  result_type_name: 'Policy change',
  phase_name: 'Reporting 2025',
  portfolio_acronym: 'P25',
  status_name: 'Submitted'
});

const info = (over: any = {}) => ({
  impact_study_type_id: 1,
  cgiar_contribution: 'Saved statement',
  previously_reported: true,
  previous_results: [prev(1), prev(2)],
  ...over
});

const lines = (n: number) => Array.from({ length: n }, (_, i) => `w${i}`).join('\n');

describe('ImpactLevelInfoComponent', () => {
  let fixture: ComponentFixture<ImpactLevelInfoComponent>;
  let component: ImpactLevelInfoComponent;
  let resultsSE: any;
  let alertsFe: any;

  async function setup(opts: { types?: any; get?: any; readOnly?: boolean } = {}) {
    resultsSE = {
      currentResultId: 77,
      GET_impactStudyTypes: jest.fn().mockReturnValue(opts.types ?? of({ response: TYPES })),
      GET_impactLevelInfo: jest.fn().mockReturnValue(opts.get ?? of({ response: info() })),
      PATCH_impactLevelInfo: jest.fn().mockReturnValue(of({ response: info() }))
    };
    alertsFe = { show: jest.fn() };
    const api = {
      resultsSE,
      alertsFe,
      rolesSE: { readOnly: !!opts.readOnly },
      dataControlSE: { currentResultSectionName: signal(''), currentResultSignal: signal<any>({}) }
    };
    await TestBed.configureTestingModule({
      declarations: [ImpactLevelInfoComponent],
      imports: [HttpClientTestingModule, FormsModule, CustomFieldsModule, HlmButton, BeforeUnloadWarningDirective, FeedbackValidationDirectiveModule],
      providers: [{ provide: ApiService, useValue: api }],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();
    TestBed.inject(RolesService).readOnly = !!opts.readOnly;
    fixture = TestBed.createComponent(ImpactLevelInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  afterEach(() => jest.restoreAllMocks());

  describe('load (IRD-R-2)', () => {
    it('hydrates the four values and loads E2 + E3 once each, for the open result', async () => {
      await setup();
      expect(resultsSE.GET_impactStudyTypes).toHaveBeenCalledTimes(1);
      expect(resultsSE.GET_impactLevelInfo).toHaveBeenCalledTimes(1);
      expect(resultsSE.GET_impactLevelInfo).toHaveBeenCalledWith(77);
      expect(component.sectionLoading()).toBe(false);
      expect(component.impactStudyTypeId).toBe(1);
      expect(component.cgiarContribution).toBe('Saved statement');
      expect(component.previouslyReported).toBe(true);
      expect(component.previousResults).toHaveLength(2);
      expect(component.hasUnsavedChanges()).toBe(false);
    });

    it('lists every study type definition once, in the field description (no repeated selected-definition line)', async () => {
      await setup();
      expect(fixture.nativeElement.querySelector('[data-cy="impact-study-definition"]')).toBeNull();
      expect(component.studyTypeDescription).toContain('Learning study: Learning definition');
      expect(component.studyTypeDescription).toContain('Accountability study: Accountability definition');
    });

    it('lists the previous results with code, title, type, phase, portfolio and status', async () => {
      await setup();
      const text = fixture.nativeElement.querySelector('[data-cy="impact-previous-results"]').textContent;
      ['1001', 'Result 1', 'Policy change', 'Reporting 2025', 'P25', 'Submitted'].forEach(part => expect(text).toContain(part));
    });

    it('first visit (nothing saved): empty values and no answer', async () => {
      await setup({ get: of({ response: { impact_study_type_id: null, cgiar_contribution: null, previously_reported: null, previous_results: [] } }) });
      expect(component.impactStudyTypeId).toBeNull();
      expect(component.cgiarContribution).toBeNull();
      expect(component.previouslyReported).toBeNull();
      expect(component.previousResults).toEqual([]);
    });

    it.each([
      ['E2', { types: throwError(() => new Error('x')) }],
      ['E3', { get: throwError(() => new Error('x')) }]
    ])('%s failure shows a banner, no form, and blocks save (never an empty form)', async (_n, opts: any) => {
      await setup(opts);
      expect(component.loadError()).toBe(true);
      expect(component.sectionLoading()).toBe(false);
      expect(component.saveDisabled).toBe(true);
      expect(fixture.nativeElement.querySelector('[data-cy="impact-load-error"]')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('app-pr-select')).toBeNull();
      expect(fixture.nativeElement.querySelector('app-pr-textarea')).toBeNull();
      let result: boolean;
      component.saveSection().subscribe(r => (result = r));
      expect(result).toBe(false);
      expect(resultsSE.PATCH_impactLevelInfo).not.toHaveBeenCalled();
      expect(component.hasUnsavedChanges()).toBe(false);
    });
  });

  describe('word counter announcement (IRD-NFR-1)', () => {
    it('has a polite live region that follows the server word count', async () => {
      await setup();
      const region: HTMLElement = fixture.nativeElement.querySelector('[data-cy="impact-word-announcer"]');
      expect(region.getAttribute('aria-live')).toBe('polite');
      expect(region.textContent.trim()).toBe('2 of 100 words');
      component.cgiarContribution = 'one\ntwo\nthree';
      fixture.detectChanges();
      expect(region.textContent.trim()).toBe('3 of 100 words');
    });
  });

  describe('save body (IRD-R-7)', () => {
    it('sends exactly the four keys, with the ids when Yes', async () => {
      await setup();
      component.onSaveSection();
      expect(resultsSE.PATCH_impactLevelInfo).toHaveBeenCalledWith(77, {
        impact_study_type_id: 1,
        cgiar_contribution: 'Saved statement',
        previously_reported: true,
        previous_result_ids: [1, 2]
      });
      expect(Object.keys(resultsSE.PATCH_impactLevelInfo.mock.calls[0][1]).sort()).toEqual(['cgiar_contribution', 'impact_study_type_id', 'previous_result_ids', 'previously_reported']);
    });

    it('No sends an empty list even if links are still in memory', async () => {
      await setup();
      component.previouslyReported = false;
      expect(component.buildBody().previous_result_ids).toEqual([]);
      expect(component.buildBody().previously_reported).toBe(false);
    });

    it('a blank statement is sent as null, unanswered Yes/No as null', async () => {
      await setup({ get: of({ response: { impact_study_type_id: null, cgiar_contribution: null, previously_reported: null, previous_results: [] } }) });
      component.cgiarContribution = '';
      expect(component.buildBody()).toEqual({ impact_study_type_id: null, cgiar_contribution: null, previously_reported: null, previous_result_ids: [] });
    });

    it('partial data is saved (Yes with no results is not blocked)', async () => {
      await setup();
      component.previousResults = [];
      component.onSaveSection();
      expect(resultsSE.PATCH_impactLevelInfo).toHaveBeenCalledTimes(1);
    });

    it('re-hydrates from the response and takes a new snapshot', async () => {
      await setup();
      component.cgiarContribution = 'edited';
      expect(component.hasUnsavedChanges()).toBe(true);
      resultsSE.PATCH_impactLevelInfo.mockReturnValue(of({ response: info({ cgiar_contribution: 'server value', previous_results: [prev(9)] }) }));
      let result: boolean;
      component.saveSection().subscribe(r => (result = r));
      expect(result).toBe(true);
      expect(component.cgiarContribution).toBe('server value');
      expect(component.previousResults.map(r => r.result_id)).toEqual([9]);
      expect(component.hasUnsavedChanges()).toBe(false);
      expect(alertsFe.show).toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }));
    });

    it('a successful save bumps savedTick so the field cards clear "Unsaved changes" (IRD-T-8 F-3)', async () => {
      await setup();
      const saveSE = TestBed.inject(SaveButtonService);
      const before = saveSE.savedTick();
      component.onSaveSection();
      expect(saveSE.savedTick()).toBe(before + 1);
    });

    it('a failed save does not bump savedTick (IRD-T-8 F-3)', async () => {
      await setup();
      const saveSE = TestBed.inject(SaveButtonService);
      const before = saveSE.savedTick();
      resultsSE.PATCH_impactLevelInfo.mockReturnValue(throwError(() => ({ error: { message: 'x' } })));
      component.onSaveSection();
      expect(saveSE.savedTick()).toBe(before);
    });

    it('a 400 shows the server message and keeps what the user typed', async () => {
      await setup();
      component.cgiarContribution = 'typed text';
      component.impactStudyTypeId = 2;
      resultsSE.PATCH_impactLevelInfo.mockReturnValue(throwError(() => ({ error: { message: 'Previous results do not exist or are inactive: 123' } })));
      let result: boolean;
      component.saveSection().subscribe(r => (result = r));
      expect(result).toBe(false);
      expect(component.cgiarContribution).toBe('typed text');
      expect(component.impactStudyTypeId).toBe(2);
      expect(component.previousResults).toHaveLength(2);
      expect(component.hasUnsavedChanges()).toBe(true);
      expect(alertsFe.show).toHaveBeenCalledWith(expect.objectContaining({ status: 'error', description: 'Previous results do not exist or are inactive: 123' }));
      expect(component.saving()).toBe(false);
    });
  });

  describe('word limit (IRD-R-4)', () => {
    it('101 server-words separated by line breaks block the save', async () => {
      await setup();
      component.cgiarContribution = lines(101);
      expect(component.impactWordCount(component.cgiarContribution)).toBe(101);
      let result: boolean;
      component.saveSection().subscribe(r => (result = r));
      expect(result).toBe(false);
      expect(resultsSE.PATCH_impactLevelInfo).not.toHaveBeenCalled();
      expect(alertsFe.show).toHaveBeenCalledWith(expect.objectContaining({ status: 'error' }));
    });

    it('100 words with line breaks save', async () => {
      await setup();
      component.cgiarContribution = lines(100);
      component.onSaveSection();
      expect(resultsSE.PATCH_impactLevelInfo).toHaveBeenCalledTimes(1);
    });
  });

  describe('completeness markers for the bottom bar (IRD-T-8 F-4)', () => {
    const incomplete = () =>
      Array.from(fixture.nativeElement.querySelectorAll('[appfeedbackvalidation] .pr-field.mandatory:not(.complete)')).map((el: any) => el.previousSibling.textContent);

    it('reports nothing missing for a complete section', async () => {
      await setup();
      expect(incomplete()).toEqual([]);
    });

    it('reports an unanswered Yes/No', async () => {
      await setup({ get: of({ response: info({ previously_reported: null, previous_results: [] }) }) });
      expect(incomplete()).toEqual(['Already reported in PRMS?']);
    });

    it('reports a statement over the word limit', async () => {
      await setup();
      component.cgiarContribution = lines(101);
      fixture.detectChanges();
      expect(incomplete()).toEqual(['CGIAR contribution (up to 100 words)']);
    });

    it('reports Yes with no linked result', async () => {
      await setup({ get: of({ response: info({ previous_results: [] }) }) });
      expect(incomplete()).toEqual(['Previously reported results']);
    });

    it('No with no links is complete', async () => {
      await setup({ get: of({ response: info({ previously_reported: false, previous_results: [] }) }) });
      expect(incomplete()).toEqual([]);
    });
  });

  describe('Already reported in PRMS? (IRD-R-5)', () => {
    it('Yes -> No with links asks first and keeps Yes until confirmed', async () => {
      await setup();
      component.onPreviouslyReportedChange(false);
      expect(alertsFe.show).toHaveBeenCalledTimes(1);
      const [options, callback] = alertsFe.show.mock.calls[0];
      expect(options.description).toContain('2 links');
      expect(component.previouslyReported).toBe(true);
      expect(component.previousResults).toHaveLength(2);
      callback();
      expect(component.previouslyReported).toBe(false);
      expect(component.previousResults).toEqual([]);
    });

    it('clicking "No" with links: the rendered toggle stays on Yes before and after cancel, and moves to No only on confirm', async () => {
      await setup();
      const choices = () => Array.from(fixture.nativeElement.querySelectorAll('app-pr-yes-or-not .choice')) as HTMLElement[];
      expect(choices()[0].classList.contains('yes')).toBe(true);
      choices()[1].click();
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      expect(alertsFe.show).toHaveBeenCalledTimes(1);
      // Confirm is open (cancel = nothing else happens): control, model, list and body all say Yes.
      expect(choices()[0].classList.contains('yes')).toBe(true);
      expect(choices()[1].classList.contains('no')).toBe(false);
      expect(component.previouslyReported).toBe(true);
      expect(fixture.nativeElement.querySelector('[data-cy="impact-previous-results"]')).not.toBeNull();
      expect(component.buildBody().previously_reported).toBe(true);
      // Confirm.
      alertsFe.show.mock.calls[0][1]();
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      expect(choices()[1].classList.contains('no')).toBe(true);
      expect(choices()[0].classList.contains('yes')).toBe(false);
      expect(fixture.nativeElement.querySelector('[data-cy="impact-previous-results"]')).toBeNull();
      expect(component.buildBody()).toEqual(expect.objectContaining({ previously_reported: false, previous_result_ids: [] }));
    });

    it('No without links switches without asking', async () => {
      await setup({ get: of({ response: info({ previous_results: [] }) }) });
      component.onPreviouslyReportedChange(false);
      expect(alertsFe.show).not.toHaveBeenCalled();
    });

    it('each remove button has an accessible name and removes only its row', async () => {
      await setup();
      const button: HTMLButtonElement = fixture.nativeElement.querySelector('button[aria-label="Remove result 1001"]');
      expect(button).not.toBeNull();
      button.click();
      fixture.detectChanges();
      expect(component.previousResults.map(r => r.result_id)).toEqual([2]);
      expect(fixture.nativeElement.querySelector('button[aria-label="Remove result 1001"]')).toBeNull();
    });

    it('after Remove, focus moves to the next row, then the previous one, then "Add results"', async () => {
      await setup({ get: of({ response: info({ previous_results: [prev(1), prev(2), prev(3)] }) }) });
      const remove = (code: number) => (fixture.nativeElement.querySelector(`button[aria-label="Remove result ${code}"]`) as HTMLButtonElement).click();
      remove(1001);
      expect((document.activeElement as HTMLElement).getAttribute('aria-label')).toBe('Remove result 1002');
      remove(1003);
      expect((document.activeElement as HTMLElement).getAttribute('aria-label')).toBe('Remove result 1002');
      remove(1002);
      expect(document.activeElement).toBe(fixture.nativeElement.querySelector('[data-cy="impact-add-results"]'));
    });

    describe('picker wiring (IRD-T-4)', () => {
      function openWith(closed$: Subject<any>) {
        const open = jest.spyOn(TestBed.inject(HlmDialogService), 'open').mockReturnValue({ closed$ } as any);
        (fixture.nativeElement.querySelector('[data-cy="impact-add-results"]') as HTMLButtonElement).click();
        return open;
      }

      it('"Add results" opens the dialog with the open result id and a copy of the list', async () => {
        await setup();
        const open = openWith(new Subject());
        expect(open).toHaveBeenCalledTimes(1);
        const options: any = open.mock.calls[0][1];
        expect(options.context.resultId).toBe(77);
        expect(options.context.initialSelection.map((r: any) => r.result_id)).toEqual([1, 2]);
        expect(options.context.initialSelection).not.toBe(component.previousResults);
      });

      it('Done replaces the list and makes the section dirty; the picker never touches the page list before', async () => {
        await setup();
        const closed$ = new Subject<any>();
        openWith(closed$);
        expect(component.previousResults.map(r => r.result_id)).toEqual([1, 2]);
        closed$.next([prev(2), prev(5)]);
        expect(component.previousResults.map(r => r.result_id)).toEqual([2, 5]);
        expect(component.buildBody().previous_result_ids).toEqual([2, 5]);
        expect(component.hasUnsavedChanges()).toBe(true);
      });

      it('Cancel / Escape (closes with undefined) keeps the list', async () => {
        await setup();
        const closed$ = new Subject<any>();
        openWith(closed$);
        closed$.next(undefined);
        expect(component.previousResults.map(r => r.result_id)).toEqual([1, 2]);
        expect(component.hasUnsavedChanges()).toBe(false);
      });
    });
  });

  describe('read-only (IRD-NFR-6)', () => {
    it('renders no editable control, no add and no remove', async () => {
      await setup({ readOnly: true });
      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('textarea')).toBeNull();
      expect(el.querySelector('[data-cy="impact-add-results"]')).toBeNull();
      expect(el.querySelector('button[aria-label^="Remove result"]')).toBeNull();
      expect(el.querySelector('app-pr-select input:not([hidden]), app-pr-select [role="combobox"]')).toBeNull();
    });
  });
});

describe('Impact level info green-check refresh (requirements §8 gate)', () => {
  it('a successful PATCH to the E4 URL on a result-detail route reloads the green checks', () => {
    const greenChecks = { getGreenChecks: jest.fn() };
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        { provide: HTTP_INTERCEPTORS, useClass: GeneralInterceptorService, multi: true },
        { provide: Router, useValue: { url: '/result/result-detail/1234/impact-level-info?phase=1' } },
        { provide: GreenChecksService, useValue: greenChecks },
        { provide: AuthService, useValue: { localStorageToken: 'token-for-test' } },
        { provide: ApiService, useValue: {} },
        { provide: IpsrCompletenessStatusService, useValue: { updateGreenChecks: jest.fn() } }
      ]
    });
    const http = TestBed.inject(HttpClient);
    const controller = TestBed.inject(HttpTestingController);
    http.patch(`${environment.apiBaseUrl}api/results-framework-reporting/impact-level/save/result/77`, {}).subscribe();
    controller.expectOne(req => req.url.includes('/impact-level/save/result/77')).flush({ response: {} });
    expect(greenChecks.getGreenChecks).toHaveBeenCalledTimes(1);
  });
});
