// @akili-spec results/impact-results-reporting/sp-reporting-entry (IRE-T-3, IRE-R-5, IRE-R-6)
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { signal } from '@angular/core';
import { LabReportFormComponent } from './lab-report-form.component';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { CentersService } from '../../../../../../shared/services/global/centers.service';
import { ResultLevelService } from '../../../../../results/pages/result-creator/services/result-level.service';
import { IMPACT_AREAS } from '../../../../shared/report-result/impact-areas.constant';

const CLIMATE = IMPACT_AREAS[3];
const words = (n: number) => Array.from({ length: n }, (_, i) => `w${i}`).join(' ');

describe('LabReportFormComponent — impact mode (IRE-T-3)', () => {
  let fixture: ComponentFixture<LabReportFormComponent>;
  let component: LabReportFormComponent;
  let post: jest.Mock;
  let navigate: jest.Mock;
  let alertsShow: jest.Mock;

  async function setup(inputs: Record<string, any> = {}, postImpl?: jest.Mock) {
    alertsShow = jest.fn();
    navigate = jest.fn().mockResolvedValue(true);
    post = postImpl ?? jest.fn().mockReturnValue(of({ response: { result: { result_code: 'R-1', version_id: 9 } } }));
    const api = {
      dataControlSE: { reportingCurrentPhase: { phaseYear: 2026 } },
      resultsSE: {
        GET_AllInitiatives: jest.fn().mockReturnValue(of({ response: [] })),
        GET_W3BilateralProjectsByProgram: jest.fn().mockReturnValue(of({ response: [] })),
        GET_qaInnovationDevelopmentResults: jest.fn().mockReturnValue(of({ response: [] })),
        POST_createResult: post
      },
      alertsFe: { show: alertsShow }
    };
    await TestBed.configureTestingModule({
      imports: [LabReportFormComponent],
      providers: [
        { provide: ApiService, useValue: api },
        { provide: CentersService, useValue: { getData: () => Promise.resolve(), centersList: [], centers: signal<any[]>([]) } },
        { provide: ResultLevelService, useValue: { resultLevelListSig: signal<any[]>([]), outputOutcomeLevelsSig: signal<any[]>([]) } },
        { provide: Router, useValue: { navigate } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LabReportFormComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('initiativeId', 42);
    fixture.componentRef.setInput('canReport', true);
    for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
    fixture.detectChanges();
  }

  const q = (sel: string): HTMLElement | null => fixture.nativeElement.querySelector(sel);
  const submitBtn = () => q('[data-testid="create-result-submit-btn"]') as HTMLButtonElement;
  async function type(title: string) {
    component.patch('result_name', title);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('renders the read-only area block and the title, and none of the hidden blocks', async () => {
    await setup({ impactArea: CLIMATE });
    expect(component.isImpact()).toBe(true);
    expect(q('[data-testid="impact-area-readonly"]')?.textContent).toContain('Impact result');
    expect(q('[data-testid="impact-area-name"]')?.textContent?.trim()).toBe(CLIMATE.name);
    expect(q('[data-testid="impact-area-readonly"] img')?.getAttribute('src')).toBe(CLIMATE.icon);
    expect(q('[data-testid="field-title"]')).toBeTruthy();
    for (const hidden of [
      'field-category',
      'emerging-result-level-chooser',
      'card-target-contribution',
      'field-contribution',
      'card-collaboration',
      'field-innovation-link',
      'pt-center-picker',
      'tab-label-full',
      'field-handler'
    ]) {
      expect(q(`[data-testid="${hidden}"]`)).toBeNull();
    }
    expect(fixture.nativeElement.querySelector('app-pr-select, app-pr-multi-select, app-pt-results-browse, app-pr-radio-button')).toBeNull();
    expect(fixture.nativeElement.querySelector('[role="tablist"]')).toBeNull();
  });

  it('Save is disabled with an empty title, enabled with a valid one, and canSave needs canReport', async () => {
    await setup({ impactArea: CLIMATE });
    expect(component.missingFields()).toEqual(['Result title']);
    expect(submitBtn().disabled).toBe(true);
    await type('Heat-tolerant beans reach 1M farmers');
    expect(component.missingFields()).toEqual([]);
    expect(component.canSave()).toBe(true);
    expect(submitBtn().disabled).toBe(false);
  });

  it('canSave is false when the user cannot report', async () => {
    await setup({ impactArea: CLIMATE, canReport: false });
    await type('A valid title');
    expect(component.canSave()).toBe(false);
    expect(submitBtn()).toBeNull();
  });

  it('a 31-word title is not savable (30 is)', async () => {
    await setup({ impactArea: CLIMATE });
    await type(words(31));
    expect(component.missingFields()).toEqual(['Result title exceeds 30 words']);
    expect(component.canSave()).toBe(false);
    expect(submitBtn().disabled).toBe(true);
    component.createResult();
    expect(post).not.toHaveBeenCalled();
    await type(words(30));
    expect(component.canSave()).toBe(true);
  });

  it('Save sends the impact body (not the standard builder) and navigates with ?phase=', async () => {
    await setup({ impactArea: CLIMATE });
    await type('  Heat-tolerant beans reach 1M farmers  ');
    submitBtn().click();
    await fixture.whenStable();

    expect(post).toHaveBeenCalledTimes(1);
    expect(post.mock.calls[0][0]).toEqual({
      result: {
        result_level_id: 1,
        result_type_id: 9,
        initiative_id: 42,
        result_name: 'Heat-tolerant beans reach 1M farmers',
        handler: '',
        impact_area_id: 4
      }
    });
    const body = post.mock.calls[0][0];
    for (const key of ['indicators', 'contributing_indicator', 'toc_result_id', 'contributing_center', 'bilateral_project', 'number_target']) {
      expect(body).not.toHaveProperty(key);
    }
    expect(alertsShow).toHaveBeenCalledWith(expect.objectContaining({ id: 'reportResultSuccess' }));
    expect(navigate).toHaveBeenCalledWith(['/result/result-detail/R-1/general-information'], { queryParams: { phase: 9 } });
  });

  it('a 400 keeps the drawer open (no created, no navigate), shows the server message, keeps the title and allows retry', async () => {
    const failing = jest.fn().mockReturnValue(throwError(() => ({ error: { message: 'Impact results require an Impact Area' } })));
    await setup({ impactArea: CLIMATE }, failing);
    const created = jest.fn();
    component.created.subscribe(created);
    await type('Heat-tolerant beans reach 1M farmers');
    component.createResult();
    await fixture.whenStable();

    expect(alertsShow).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'reportResultError', description: 'Impact results require an Impact Area', status: 'error' })
    );
    expect(created).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(alertsShow).not.toHaveBeenCalledWith(expect.objectContaining({ id: 'reportResultSuccess' }));
    expect(component.createResultBody().result_name).toBe('Heat-tolerant beans reach 1M farmers');
    expect(component.creatingResult()).toBe(false);
    expect(component.canSave()).toBe(true);
  });

  it('two quick clicks send one request: Save is disabled while the create is in flight', async () => {
    const pending = new Subject<any>();
    await setup({ impactArea: CLIMATE }, jest.fn().mockReturnValue(pending.asObservable()));
    await type('Heat-tolerant beans reach 1M farmers');
    submitBtn().click();
    fixture.detectChanges();
    expect(component.creatingResult()).toBe(true);
    expect(component.canSave()).toBe(false);
    expect(submitBtn().disabled).toBe(true);
    submitBtn().click();
    component.createResult();
    expect(post).toHaveBeenCalledTimes(1);
    pending.next({ response: { result: { result_code: 'R-2', version_id: 9 } } });
    pending.complete();
  });

  it('with impactArea null the form keeps today rules (contribution still required, standard card shown)', async () => {
    await setup({ indicator: { indicator_id: 1, result_type_id: 7, result_level_id: 4, type_name: 'x' } });
    expect(component.isImpact()).toBe(false);
    expect(component.missingFields()).toContain('Contribution to indicator target');
    expect(q('[data-testid="impact-area-readonly"]')).toBeNull();
    expect(q('[data-testid="card-target-contribution"]')).toBeTruthy();
  });
});
