import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PhaseManagementTableComponent } from './phase-management-table.component';
import { ResultsApiService } from '../../services/api/results-api.service';
import { CustomizedAlertsFeService } from '../../services/customized-alerts-fe.service';
import { PhasesService } from '../../services/global/phases.service';
import { ApiService } from '../../services/api/api.service';
import { of } from 'rxjs';
import { ModuleTypeEnum, StatusPhaseEnum } from '../../enum/api.enum';

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
    mockApiService = { dataControlSE: { getCurrentPhases: jest.fn(), getCurrentIPSRPhase: jest.fn() } };

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
});
