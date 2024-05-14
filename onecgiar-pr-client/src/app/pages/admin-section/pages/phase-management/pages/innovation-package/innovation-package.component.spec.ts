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
});
