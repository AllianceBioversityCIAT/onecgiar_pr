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
      start_date: new Date().toDateString(),
      end_date: new Date().toDateString(),
      status: true,
      previous_phase: null,
      reporting_phase: 'Reporting Phase 1'
    };

    component.updateVariablesToSave(mockPhaseItem);

    expect(mockPhaseItem).toEqual({
      phase_name: 'Phase 1',
      phase_year: 2020,
      toc_pahse_id: 2,
      start_date: new Date().toDateString(),
      end_date: new Date().toDateString(),
      status: true,
      previous_phase: null,
      reporting_phase: 'Reporting Phase 1',
      phase_name_ts: 'Phase 1',
      phase_year_ts: 2020,
      toc_pahse_id_ts: 2,
      start_date_ts: new Date().toDateString(),
      end_date_ts: new Date().toDateString(),
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

    component.savePhase(mockPhase);

    expect(updateMainVariablesSpy).toHaveBeenCalledWith(mockPhase);
    expect(mockResultsApiService.PATCH_updatePhase).toHaveBeenCalledWith(mockPhase.id, mockPhase);
    expect(getAllPhasesSpy).toHaveBeenCalled();
    expect(getNewPhasesSpy).toHaveBeenCalled();
    expect(getCurrentIPSRPhaseSpy).toHaveBeenCalled();
  });

  it('should get mandatory incomplete fields', () => {
    const mockPhaseItem = {
      phase_name_ts: '',
      phase_year_ts: '',
      toc_pahse_id_ts: '',
      start_date_ts: '',
      end_date_ts: '',
      reporting_phase_ts: ''
    };

    const result = component.getMandatoryIncompleteFields(mockPhaseItem);

    expect(result).toContain('<strong> Start date </strong> is required to create <br>');
    expect(result).toContain('<strong> End date </strong>is required to create <br>');
    expect(result).toContain('<strong> Reporting phase </strong>is required to create <br>');
  });

  it('should delete a phase', () => {
    const mockId = { id: 1 };

    component.deletePhase(mockId);

    expect(mockCustomizedAlertsFeService.show).toHaveBeenCalledWith(
      {
        id: 'manage-phase',
        title: 'Delete phase',
        description: 'Are you sure you want to delete the current phase?',
        status: 'warning',
        confirmText: 'Yes, delete'
      },
      expect.any(Function)
    );
  });

  it('should get feedback', () => {
    component.phaseList = [{ isNew: true }, { editing: true }];

    const result = component.getFeedback();

    expect(result).toBe('Create or cancel to add a new phase');
  });

  it('should add a new phase', () => {
    component.addNewPhase();

    expect(component.phaseList[component.phaseList.length - 1]).toEqual({
      app_module_id: null,
      editing: true,
      end_date: null,
      isNew: true,
      phase_name: null,
      phase_name_ts: null,
      phase_year: null,
      previous_phase: null,
      previous_phase_ts: null,
      start_date: null,
      status_ts: null,
      toc_pahse_id: null
    });
  });

  it('should get only previous phase', () => {
    component.phaseList = [{ phase_year_ts: 2020 }, { phase_year_ts: 2021 }, { phase_year_ts: 2022 }];

    const result = component.onlyPreviousPhase({ phase_year_ts: 2021 });

    expect(result).toEqual([{ phase_year_ts: 2021 }, { phase_year_ts: 2022 }]);
  });

  it('should cancel action', () => {
    component.phaseList = [{ id: 1 }, { id: 2 }, { id: 3 }];

    component.cancelAction({ id: 2 });

    expect(component.phaseList).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
  });
});
