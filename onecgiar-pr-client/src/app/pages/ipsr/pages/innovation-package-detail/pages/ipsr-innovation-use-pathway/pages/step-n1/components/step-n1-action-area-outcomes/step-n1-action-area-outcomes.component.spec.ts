import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StepN1ActionAreaOutcomesComponent } from './step-n1-action-area-outcomes.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { PrFieldHeaderComponent } from '../../../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { FeedbackValidationDirective } from '../../../../../../../../../../shared/directives/feedback-validation.directive';
import { of, throwError } from 'rxjs';
import { ApiService } from '../../../../../../../../../../shared/services/api/api.service';

describe('StepN1ActionAreaOutcomesComponent', () => {
  let component: StepN1ActionAreaOutcomesComponent;
  let fixture: ComponentFixture<StepN1ActionAreaOutcomesComponent>;
  let mockApiService: any;
  const mockResponse = {
    systemTrasnformation: [
      {
        outcomeSMOcode: 'outcomeSTcode',
        outcomeStatement: 'outcomeSTStatement'
      }
    ],
    resilientAgrifoodSystems: [
      {
        outcomeSMOcode: 'outcomeRAScode',
        outcomeStatement: 'outcomeRASStatement'
      }
    ],
    geneticInnovation: [
      {
        outcomeSMOcode: 'outcomeGIcode',
        outcomeStatement: 'outcomeGIStatement'
      }
    ]
  };

  beforeEach(async () => {
    mockApiService = {
      resultsSE: {
        GETAllClarisaActionAreasOutcomes: () => of({ response: mockResponse })
      },
      tocApiSE: {
        GET_tocLevelsByconfig: () => of(mockResponse)
      }
    };

    await TestBed.configureTestingModule({
      declarations: [StepN1ActionAreaOutcomesComponent, PrFieldHeaderComponent, FeedbackValidationDirective],
      imports: [HttpClientTestingModule],
      providers: [
        {
          provide: ApiService,
          useValue: mockApiService
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(StepN1ActionAreaOutcomesComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call GETAllClarisaActionAreasOutcomes on ngOnInit', () => {
    const spy = jest.spyOn(component.api.resultsSE, 'GETAllClarisaActionAreasOutcomes');

    component.ngOnInit();

    expect(spy).toHaveBeenCalled();
    expect(component.actionAreasOutcomesList).toEqual(mockResponse);
    expect(component.actionAreasOutcomesList.systemTrasnformation[0].full_name).toBe('<strong>outcomeSTcode</strong> - outcomeSTStatement');
    expect(component.actionAreasOutcomesList.resilientAgrifoodSystems[0].full_name).toBe('<strong>outcomeRAScode</strong> - outcomeRASStatement');
    expect(component.actionAreasOutcomesList.geneticInnovation[0].full_name).toBe('<strong>outcomeGIcode</strong> - outcomeGIStatement');
  });

  it('should call GET_tocLevelsByresultId on ngOnInit', () => {
    jest.spyOn(component, 'GET_tocLevelsByresultId');
    component.ngOnInit();
    expect(component.GET_tocLevelsByresultId).toHaveBeenCalled();
  });

  it('should console.error on GETAllClarisaActionAreasOutcomes error', () => {
    const errorResponse = 'Test error';

    jest.spyOn(component.api.resultsSE, 'GETAllClarisaActionAreasOutcomes').mockReturnValue(throwError(() => errorResponse));
    const consoleSpy = jest.spyOn(console, 'error');

    component.ngOnInit();

    expect(consoleSpy).toHaveBeenCalledWith(errorResponse);
  });

  it('should set actionAreasOutcomesList on GET_tocLevelsByresultId', () => {
    const mockResponse = {
      response: {
        geneticInnovation: {},
        resilientAgrifoodSystems: {},
        systemTrasnformation: {}
      }
    };
    jest.spyOn(component.api.tocApiSE, 'GET_tocLevelsByconfig').mockReturnValue(of(mockResponse));
    component.GET_tocLevelsByresultId();
    expect(component.actionAreasOutcomesList).toEqual({
      geneticInnovation: {},
      resilientAgrifoodSystems: {},
      systemTrasnformation: {}
    });
  });

  it('should console.error on GET_tocLevelsByresultId error', () => {
    const errorResponse = 'Test error';
    jest.spyOn(component.api.tocApiSE, 'GET_tocLevelsByconfig').mockReturnValue(throwError(() => errorResponse));
    const consoleSpy = jest.spyOn(console, 'error');
    component.GET_tocLevelsByresultId();
    expect(consoleSpy).toHaveBeenCalledWith(errorResponse);
  });

  it('should remove option from body.actionAreaOutcomes on removeOption', () => {
    component.body.actionAreaOutcomes = [
      { action_area_outcome_id: 1, outcomeStatement: '', is_active: false, full_name: '', outcomeSMOcode: '' },
      { action_area_outcome_id: 2, outcomeStatement: '', is_active: false, full_name: '', outcomeSMOcode: '' }
    ];
    component.removeOption({ action_area_outcome_id: 1 });
    expect(component.body.actionAreaOutcomes).toEqual([{ action_area_outcome_id: 2, outcomeStatement: '', is_active: false, full_name: '', outcomeSMOcode: '' }]);
  });

  it('should filter body.actionAreaOutcomes by AAOId on filterByAAOId', () => {
    component.body.actionAreaOutcomes = [
      { actionAreaId: 1, outcomeStatement: '', is_active: false, full_name: '', outcomeSMOcode: '' },
      { actionAreaId: 2, outcomeStatement: '', is_active: false, full_name: '', outcomeSMOcode: '' },
      { actionAreaId: 2, outcomeStatement: '', is_active: false, full_name: '', outcomeSMOcode: '' }
    ] as any;
    const filteredItems = component.filterByAAOId(1);
    expect(filteredItems).toEqual([{ actionAreaId: 1, outcomeStatement: '', is_active: false, full_name: '', outcomeSMOcode: '' }]);
  });
});
