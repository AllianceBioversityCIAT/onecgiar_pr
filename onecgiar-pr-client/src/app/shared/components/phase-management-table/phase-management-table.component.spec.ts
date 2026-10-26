import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PhaseManagementTableComponent } from './phase-management-table.component';
import { ResultsApiService } from '../../services/api/results-api.service';
import { CustomizedAlertsFeService } from '../../services/customized-alerts-fe.service';
import { PhasesService } from '../../services/global/phases.service';
import { ApiService } from '../../services/api/api.service';
import { of } from 'rxjs';
import { By } from '@angular/platform-browser';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { PHASE_MANAGEMENT_COPY } from '../../../internationalization/phase-management.copy';
import { PhaseManagementTableModule } from './phase-management-table.module';
import { PrTooltipDirective } from '../../directives/pr-tooltip.directive';

describe('PhaseManagementTableComponent', () => {
  let component: PhaseManagementTableComponent;
  let fixture: ComponentFixture<PhaseManagementTableComponent>;
  let mockResultsApiService: any;
  let mockCustomizedAlertsFeService: any;
  let mockPhasesService: any;
  let mockApiService: any;

  const mockPhases = [
    {
      id: 1,
      phase_name: 'Phase 1',
      phase_year: 2022,
      toc_pahse_id: 1,
      start_date: '2022-01-01',
      end_date: '2022-12-31',
      status: true,
      previous_phase: null,
      can_be_deleted: true,
      obj_previous_phase: null,
      portfolio_id: 2
    }
  ];

  const mockPortfolios = [{ id: 2, name: 'CGIAR portfolio 2022-2024', startDate: 2022, endDate: 2024, isActive: 1 }];

  const mockTocPhases = [{ phase_id: 1, name: 'TOC Phase 1', status: 'Active' }];

  const mockResultYears = [{ year: 2022 }];

  beforeEach(async () => {
    mockResultsApiService = {
      GET_portfolioList: jest.fn().mockReturnValue(of(mockPortfolios)),
      GET_resultYears: jest.fn().mockReturnValue(of({ response: mockResultYears })),
      GET_tocPhases: jest.fn().mockReturnValue(of({ response: mockTocPhases })),
      GET_versioning: jest.fn().mockReturnValue(of({ response: mockPhases })),
      PATCH_updatePhase: jest.fn().mockReturnValue(of({})),
      POST_createPhase: jest.fn().mockReturnValue(of({})),
      DELETE_updatePhase: jest.fn().mockReturnValue(of({}))
    };
    mockCustomizedAlertsFeService = { show: jest.fn() };
    mockPhasesService = { getNewPhases: jest.fn() };
    mockApiService = { dataControlSE: { getCurrentPhases: jest.fn(() => of({})), getCurrentIPSRPhase: jest.fn(() => of({})) } };

    await TestBed.configureTestingModule({
      declarations: [PhaseManagementTableComponent],
      providers: [
        { provide: ResultsApiService, useValue: mockResultsApiService },
        { provide: CustomizedAlertsFeService, useValue: mockCustomizedAlertsFeService },
        { provide: PhasesService, useValue: mockPhasesService },
        { provide: ApiService, useValue: mockApiService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PhaseManagementTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should setup column order correctly', () => {
    component.showReportingPhaseColumn = true;
    component.setupColumnOrder();
    expect(component.columnOrder.some(col => col.title === 'Portfolio')).toBe(true);
    expect(component.columnOrder.some(col => col.title === 'Results phase')).toBe(true);
  });

  it('should fetch portfolios on getPortfolios', () => {
    component.getPortfolios();
    expect(mockResultsApiService.GET_portfolioList).toHaveBeenCalled();
    expect(component.portfolioList).toEqual(mockPortfolios);
  });

  it('should fetch result years on get_resultYears', () => {
    component.get_resultYears();
    expect(mockResultsApiService.GET_resultYears).toHaveBeenCalled();
    expect(component.resultYearsList).toEqual(mockResultYears);
  });

  it('should fetch toc phases on getTocPhases', () => {
    component.getTocPhases();
    expect(mockResultsApiService.GET_tocPhases).toHaveBeenCalled();
    expect(component.tocPhaseList).toEqual(mockTocPhases);
  });

  it('should fetch phases on getAllPhases', () => {
    component.getAllPhases();
    expect(mockResultsApiService.GET_versioning).toHaveBeenCalled();
    expect(component.phaseList.length).toBeGreaterThan(0);
  });

  it('should map variables correctly in updateVariablesToSave and updateMainVariables', () => {
    const phase: any = {
      phase_name: 'Test',
      phase_year: 2022,
      portfolio_id: 2,
      toc_pahse_id: 1,
      start_date: '2022-01-01',
      end_date: '2022-12-31',
      status: true,
      previous_phase: null
    };
    component.showReportingPhaseColumn = true;
    phase.reporting_phase = 'Reporting';
    component.updateVariablesToSave(phase);
    expect(phase.phase_name_ts).toBe('Test');
    expect(phase.portfolio_id_ts).toBe(2);
    expect(phase.reporting_phase_ts).toBe('Reporting');

    // Now test updateMainVariables
    phase.phase_name_ts = 'Test2';
    phase.portfolio_id_ts = 3;
    phase.reporting_phase_ts = 'Reporting2';
    component.updateMainVariables(phase);
    expect(phase.phase_name).toBe('Test2');
    expect(phase.portfolio_id).toBe(3);
    expect(phase.reporting_phase).toBe('Reporting2');
  });

  it('should return correct feedback', () => {
    component.phaseList = [{ isNew: true }];
    expect(component.getFeedback()).toContain('Create or cancel');
    component.phaseList = [{ editing: true }];
    expect(component.getFeedback()).toContain('Save or cancel');
    component.phaseList = [];
    expect(component.getFeedback()).toBe('');
  });

  it('should add a new phase', () => {
    component.phaseList = [];
    component.addNewPhase();
    expect(component.phaseList.length).toBe(1);
    expect(component.phaseList[0].isNew).toBe(true);
    expect(component.phaseList[0].editing).toBe(true);
  });

  it('should remove new phase on cancelAction', () => {
    component.phaseList = [{ id: 1, isNew: true }];
    component.cancelAction({ id: 1, isNew: true });
    expect(component.phaseList.length).toBe(0);
  });

  it('should not remove phase if not new on cancelAction', () => {
    component.phaseList = [{ id: 1, isNew: false }];
    component.cancelAction({ id: 1, isNew: false });
    expect(component.phaseList.length).toBe(1);
  });

  it('should require mandatory fields in getMandatoryIncompleteFields', () => {
    const phase: any = {};
    const result = component.getMandatoryIncompleteFields(phase);
    expect(result).toContain('Name');
    expect(result).toContain('Portfolio');
  });

  it('should call PATCH_updatePhase on savePhase', () => {
    const phase: any = { id: 1, phase_name_ts: 'Test', isNew: false };
    component.savePhase(phase);
    expect(mockResultsApiService.PATCH_updatePhase).toHaveBeenCalled();
  });

  it('should call POST_createPhase on createPhase', () => {
    const phase: any = { phase_name_ts: 'Test', isNew: true };
    component.appModuleId = 1;
    component.createPhase(phase);
    expect(mockResultsApiService.POST_createPhase).toHaveBeenCalled();
  });

  it('should call DELETE_updatePhase on deletePhase', () => {
    const phase: any = { id: 1 };
    mockCustomizedAlertsFeService.show.mockImplementation((_, cb) => cb());
    component.deletePhase(phase);
    expect(mockResultsApiService.DELETE_updatePhase).toHaveBeenCalled();
  });

  it('should get TOC phase name', () => {
    component.tocPhaseList = [{ phase_id: 1, name: 'TOC Phase 1', status: 'Active' }];
    const name = component.getTocPhaseName(1);
    expect(name).toBe('TOC Phase 1 - Active');
  });

  it('should filter previous phases in onlyPreviousPhase', () => {
    component.phaseList = [{ phase_year_ts: 2022 }, { phase_year_ts: 2023 }];
    const filtered = component.onlyPreviousPhase({ phase_year_ts: 2022 });
    expect(filtered.every(el => el.phase_year_ts >= 2022)).toBe(true);
  });
  describe('Phases card header (PMR-T-3)', () => {
    const persisted = (id: number, status: boolean): any => ({ id, phase_name: `P${id}`, status });
    const render = (): void => fixture.componentRef.changeDetectorRef.detectChanges();
    const chip = (testId: string): string => fixture.nativeElement.querySelector(`[data-testid="${testId}"]`)?.textContent?.trim();

    it('totalPhases excludes isNew drafts and openPhases counts status true', () => {
      component.phaseList = [persisted(1, true), persisted(2, false), persisted(3, false), persisted(4, false), persisted(5, false), { isNew: true, status: true }];
      expect(component.totalPhases).toBe(5);
      expect(component.openPhases).toBe(1);
      render();
      expect(chip('pmt-total-chip')).toBe('5 total');
      expect(chip('pmt-open-chip')).toBe('1 open');
    });

    it('renders "0 open" when every phase is closed', () => {
      component.phaseList = [persisted(1, false), persisted(2, false)];
      render();
      expect(chip('pmt-open-chip')).toBe('0 open');
    });

    it('updates the chips after phaseList is reassigned with an extra open phase', () => {
      component.phaseList = [persisted(1, true)];
      render();
      expect(chip('pmt-open-chip')).toBe('1 open');
      component.phaseList = [...component.phaseList, persisted(2, true)];
      render();
      expect(chip('pmt-total-chip')).toBe('2 total');
      expect(chip('pmt-open-chip')).toBe('2 open');
    });

    it('does not add a draft when Add is clicked while a draft exists', () => {
      component.phaseList = [persisted(1, true), { isNew: true, editing: true }];
      render();
      const length = component.phaseList.length;
      const button = fixture.nativeElement.querySelector('app-pr-button');
      button.click();
      expect(component.phaseList.length).toBe(length);
      expect(fixture.nativeElement.textContent).toContain('Create or cancel to add a new phase');
    });

    it('exposes the card title copy', () => {
      expect(fixture.nativeElement.textContent).toContain('Configured phases');
    });
  });
});

describe('PhaseManagementTableComponent cells and actions (PMR-T-4)', () => {
  let fixture: ComponentFixture<PhaseManagementTableComponent>;
  let component: PhaseManagementTableComponent;

  const row = (over: any = {}): any => ({
    id: 1,
    phase_name: 'Reporting 2026',
    phase_year: 2026,
    status: true,
    can_be_deleted: true,
    obj_portfolio: { name: 'P25' },
    obj_previous_phase: null,
    ...over
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PhaseManagementTableModule, RouterTestingModule, HttpClientTestingModule],
      providers: [
        {
          provide: ResultsApiService,
          useValue: {
            GET_portfolioList: jest.fn().mockReturnValue(of([])),
            GET_resultYears: jest.fn().mockReturnValue(of({ response: [] })),
            GET_tocPhases: jest.fn().mockReturnValue(of({ response: [] })),
            GET_versioning: jest.fn().mockReturnValue(of({ response: [] }))
          }
        },
        { provide: CustomizedAlertsFeService, useValue: { show: jest.fn() } },
        { provide: PhasesService, useValue: { getNewPhases: jest.fn() } },
        { provide: ApiService, useValue: { dataControlSE: { getCurrentPhases: jest.fn(() => of({})), getCurrentIPSRPhase: jest.fn(() => of({})) } } }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(PhaseManagementTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  const render = (rows: any[]): HTMLElement => {
    component.phaseList = rows;
    fixture.componentRef.changeDetectorRef.detectChanges();
    return fixture.nativeElement;
  };

  it('highlights an open row and shows the "Open" pill text', () => {
    const root = render([row()]);
    const tr = root.querySelector('tbody tr') as HTMLElement;
    expect(tr.classList.contains('bg-brand-25')).toBe(true);
    expect(root.querySelector('[data-testid="pmt-status-pill"]')?.textContent?.trim()).toBe('Open');
  });

  it('shows "Closed" without highlight for a closed row', () => {
    const root = render([row({ status: false })]);
    const tr = root.querySelector('tbody tr') as HTMLElement;
    expect(tr.classList.contains('bg-brand-25')).toBe(false);
    expect(root.querySelector('[data-testid="pmt-status-pill"]')?.textContent?.trim()).toBe('Closed');
  });

  it('renders the portfolio as a chip', () => {
    const root = render([row()]);
    expect(root.querySelector('[data-testid="pmt-portfolio-chip"]')?.textContent?.trim()).toBe('P25');
  });

  it('does not call deletePhase when can_be_deleted is false and keeps the tooltip text', () => {
    const spy = jest.spyOn(component, 'deletePhase');
    const root = render([row({ can_be_deleted: false })]);
    const del = root.querySelector('[data-testid="pmt-delete-btn"]') as HTMLButtonElement;
    del.click();
    expect(spy).not.toHaveBeenCalled();
    expect(del.getAttribute('aria-disabled')).toBe('true');
    expect(del.getAttribute('aria-label')).toBe(PHASE_MANAGEMENT_COPY.deletePhaseLabel);
    expect(fixture.debugElement.query(By.css('[data-testid="pmt-delete-btn"]')).injector.get(PrTooltipDirective).text).toBe(
      'The phase has active results therefore cannot be eliminated'
    );
  });

  it('calls deletePhase when can_be_deleted is true', () => {
    const spy = jest.spyOn(component, 'deletePhase').mockImplementation(() => undefined);
    const root = render([row()]);
    (root.querySelector('[data-testid="pmt-delete-btn"]') as HTMLButtonElement).click();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('gives the delete button an aria-label', () => {
    const root = render([row()]);
    const del = root.querySelector('[data-testid="pmt-delete-btn"]') as HTMLButtonElement;
    expect(del.tagName).toBe('BUTTON');
    expect(del.getAttribute('type')).toBe('button');
    expect(del.getAttribute('aria-label')).toBe(PHASE_MANAGEMENT_COPY.deletePhaseLabel);
  });

  it('renders save and cancel as labelled buttons while editing', () => {
    const root = render([row({ editing: true })]);
    const expected: Record<string, string> = { 'pmt-save-btn': PHASE_MANAGEMENT_COPY.savePhaseLabel, 'pmt-cancel-btn': PHASE_MANAGEMENT_COPY.cancelEditLabel };
    for (const id of Object.keys(expected)) {
      const b = root.querySelector(`[data-testid="${id}"]`) as HTMLButtonElement;
      expect(b.tagName).toBe('BUTTON');
      expect(b.getAttribute('aria-label')).toBe(expected[id]);
    }
  });

  it('labels the save button "Create phase" for a new draft', () => {
    const root = render([row({ editing: true, isNew: true })]);
    expect((root.querySelector('[data-testid="pmt-save-btn"]') as HTMLElement).getAttribute('aria-label')).toBe(PHASE_MANAGEMENT_COPY.createPhaseLabel);
  });

  it('keeps the edit action as a plain div without role or tabindex', () => {
    const root = render([row()]);
    const edit = root.querySelector('td div.edit') as HTMLElement;
    expect(edit.hasAttribute('role')).toBe(false);
    expect(edit.hasAttribute('tabindex')).toBe(false);
    expect(edit.hasAttribute('aria-label')).toBe(false);
  });
});

@Component({
  selector: 'app-pmt-projection-host',
  template: '<app-phase-management-table><div data-testid="pmt-projected">x</div></app-phase-management-table>',
  standalone: false
})
class ProjectionHostComponent {}

describe('PhaseManagementTableComponent content projection (PMR-T-3)', () => {
  it('renders projected content through ng-content as a sibling of the card', async () => {
    await TestBed.configureTestingModule({
      declarations: [PhaseManagementTableComponent, ProjectionHostComponent],
      providers: [
        {
          provide: ResultsApiService,
          useValue: {
            GET_portfolioList: jest.fn().mockReturnValue(of([])),
            GET_resultYears: jest.fn().mockReturnValue(of({ response: [] })),
            GET_tocPhases: jest.fn().mockReturnValue(of({ response: [] })),
            GET_versioning: jest.fn().mockReturnValue(of({ response: [] }))
          }
        },
        { provide: CustomizedAlertsFeService, useValue: { show: jest.fn() } },
        { provide: PhasesService, useValue: { getNewPhases: jest.fn() } },
        { provide: ApiService, useValue: { dataControlSE: { getCurrentPhases: jest.fn(() => of({})), getCurrentIPSRPhase: jest.fn(() => of({})) } } }
      ]
    }).compileComponents();

    const hostFixture = TestBed.createComponent(ProjectionHostComponent);
    hostFixture.detectChanges();
    const root: HTMLElement = hostFixture.nativeElement;
    const projected = root.querySelector('[data-testid="pmt-projected"]');
    expect(projected).not.toBeNull();
    expect(root.querySelector('[data-testid="pmt-card"]')?.contains(projected)).toBe(false);
  });
});
