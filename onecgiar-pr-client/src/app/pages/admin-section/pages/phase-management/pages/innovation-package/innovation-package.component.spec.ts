import { TestBed, ComponentFixture } from '@angular/core/testing';
import { InnovationPackageComponent } from './innovation-package.component';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { ResultsApiService } from '../../../../../../shared/services/api/results-api.service';
import { CustomizedAlertsFeService } from '../../../../../../shared/services/customized-alerts-fe.service';
import { PhasesService } from '../../../../../../shared/services/global/phases.service';
import { of } from 'rxjs';

describe('InnovationPackageComponent', () => {
  let component: InnovationPackageComponent;
  let fixture: ComponentFixture<InnovationPackageComponent>;

  const mockApiService = {
    dataControlSE: {
      getCurrentIPSRPhase: jest.fn()
    }
  };

  const mockResultsApiService = {
    GET_resultYears: jest.fn().mockReturnValue(of({ response: [] })),
    GET_tocPhases: jest.fn().mockReturnValue(of({ response: [] })),
    GET_versioning: jest.fn().mockReturnValue(of({ response: [] })),
    PATCH_updatePhase: jest.fn(),
    POST_createPhase: jest.fn(),
    DELETE_updatePhase: jest.fn()
  };

  const mockCustomizedAlertsFeService = {
    show: jest.fn()
  };

  const mockPhasesService = {
    getNewPhases: jest.fn()
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [InnovationPackageComponent],
      providers: [
        { provide: ApiService, useValue: mockApiService },
        { provide: ResultsApiService, useValue: mockResultsApiService },
        { provide: CustomizedAlertsFeService, useValue: mockCustomizedAlertsFeService },
        { provide: PhasesService, useValue: mockPhasesService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(InnovationPackageComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call the necessary methods on ngOnInit', () => {
    component.ngOnInit();

    expect(mockResultsApiService.GET_resultYears).toHaveBeenCalled();
    expect(mockResultsApiService.GET_tocPhases).toHaveBeenCalled();
    expect(mockResultsApiService.GET_versioning).toHaveBeenCalledTimes(2);
    expect(mockApiService.dataControlSE.getCurrentIPSRPhase).toHaveBeenCalled();
  });

  it('should call the necessary methods on ngOnInit', () => {
    component.ngOnInit();

    expect(mockResultsApiService.GET_resultYears).toHaveBeenCalled();
    expect(mockResultsApiService.GET_tocPhases).toHaveBeenCalled();
    expect(mockApiService.dataControlSE.getCurrentIPSRPhase).toHaveBeenCalled();
  });
  it('should save the phase', () => {
    const mockPhase = {
      id: 1,
      phase_name: 'Phase 1',
      phase_year: 2020,
      toc_pahse_id: 2,
      start_date: new Date(),
      end_date: new Date(),
      status: true,
      previous_phase: null,
      reporting_phase: 'Reporting Phase 1',
      editing: false
    };

    const updateMainVariablesSpy = jest.spyOn(component, 'updateMainVariables');
    const getAllPhasesSpy = jest.spyOn(component, 'getAllPhases');
    const getNewPhasesSpy = jest.spyOn(mockPhasesService, 'getNewPhases');
    const getCurrentIPSRPhaseSpy = jest.spyOn(mockApiService.dataControlSE, 'getCurrentIPSRPhase');

    // Modify the code to return an observable
    mockResultsApiService.PATCH_updatePhase.mockReturnValue(of({}));

    component.savePhase(mockPhase);

    expect(updateMainVariablesSpy).toHaveBeenCalledWith(mockPhase);
    expect(mockResultsApiService.PATCH_updatePhase).toHaveBeenCalledWith(mockPhase.id, mockPhase);
    expect(getAllPhasesSpy).toHaveBeenCalled();
    expect(mockCustomizedAlertsFeService.show).toHaveBeenCalledWith({
      id: 'manage-phase-save',
      title: 'Phase saved',
      status: 'success',
      closeIn: 500
    });
    expect(getNewPhasesSpy).toHaveBeenCalled();
    expect(getCurrentIPSRPhaseSpy).toHaveBeenCalled();
  });

  it('should update variables to save', () => {
    const mockPhaseItem = {
      phase_name: 'Phase 1',
      phase_year: 2020,
      toc_pahse_id: 2,
      start_date: new Date(),
      end_date: new Date(),
      status: true,
      previous_phase: null,
      reporting_phase: 'Reporting Phase 1'
    };

    component.updateVariablesToSave(mockPhaseItem);

    expect(mockPhaseItem).toEqual({
      phase_name: 'Phase 1',
      phase_year: 2020,
      toc_pahse_id: 2,
      start_date: new Date(),
      end_date: new Date(),
      status: true,
      previous_phase: null,
      reporting_phase: 'Reporting Phase 1',
      phase_name_ts: 'Phase 1',
      phase_year_ts: 2020,
      toc_pahse_id_ts: 2,
      start_date_ts: new Date(),
      end_date_ts: new Date(),
      status_ts: true,
      previous_phase_ts: null,
      reporting_phase_ts: 'Reporting Phase 1'
    });
  });

  it('should create a phase', () => {
    const mockPhase = {
      id: 1,
      phase_name: 'Phase 1',
      phase_year: 2020,
      toc_pahse_id: 2,
      start_date: new Date(),
      end_date: new Date(),
      status: true,
      previous_phase: null,
      reporting_phase: 'Reporting Phase 1',
      editing: false
    };

    const updateMainVariablesSpy = jest.spyOn(component, 'updateMainVariables');
    const getAllPhasesSpy = jest.spyOn(component, 'getAllPhases');
    const getNewPhasesSpy = jest.spyOn(mockPhasesService, 'getNewPhases');
    const getCurrentIPSRPhaseSpy = jest.spyOn(mockApiService.dataControlSE, 'getCurrentIPSRPhase');

    mockResultsApiService.POST_createPhase.mockReturnValue(of({}));

    component.createPhase(mockPhase);

    expect(updateMainVariablesSpy).toHaveBeenCalledWith(mockPhase);
    expect(mockResultsApiService.POST_createPhase).toHaveBeenCalledWith(mockPhase);
    expect(getAllPhasesSpy).toHaveBeenCalled();
    expect(mockCustomizedAlertsFeService.show).toHaveBeenCalledWith({
      id: 'manage-phase-save',
      title: 'Phase created',
      status: 'success',
      closeIn: 500
    });
    expect(getNewPhasesSpy).toHaveBeenCalled();
    expect(getCurrentIPSRPhaseSpy).toHaveBeenCalled();
  });

  it('should get Toc Phase Name', () => {
    const mockTocPhaseList = [
      { phase_id: 1, name: 'Phase 1', status: 'Open' },
      { phase_id: 2, name: 'Phase 2', status: 'Closed' }
    ];

    component.tocPhaseList = mockTocPhaseList;

    const result = component.getTocPhaseName(2);

    expect(result).toEqual('Phase 2 - Closed');
  });
});
