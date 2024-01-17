import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActionAreaOutcomeComponent } from './action-area-outcome.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { PrFieldHeaderComponent } from '../../../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { of, throwError } from 'rxjs';
import { ApiService } from '../../../../../../../../../../shared/services/api/api.service';

describe('ActionAreaOutcomeComponent', () => {
  let component: ActionAreaOutcomeComponent;
  let fixture: ComponentFixture<ActionAreaOutcomeComponent>;
  let mockApiService: any;
  let mockResponse = {
    systemTrasnformation: [
      {
        outcomeSMOcode: 'outcomeSMOcode',
        outcomeStatement: 'outcomeStatement'
      }
    ],
    resilientAgrifoodSystems: [
      {
        outcomeSMOcode: 'outcomeSMOcode',
        outcomeStatement: 'outcomeStatement'
      }
    ],
    geneticInnovation: [
      {
        outcomeSMOcode: 'outcomeSMOcode',
        outcomeStatement: 'outcomeStatement'
      }
    ]
  }

  beforeEach(async () => {

    mockApiService = {
      resultsSE: {
        GETAllClarisaActionAreasOutcomes: () => of({ response: mockResponse}),
      },
      rolesSE: {
        readOnly: false
      }
    }
    
    await TestBed.configureTestingModule({
      declarations: [ 
        ActionAreaOutcomeComponent ,
        PrFieldHeaderComponent
      ],
      imports: [
        HttpClientTestingModule,
      ],
      providers: [
        {
          provide: ApiService,
          useValue: mockApiService
        }
      ]

    })
    .compileComponents();

    fixture = TestBed.createComponent(ActionAreaOutcomeComponent);
    component = fixture.componentInstance;
  });

  describe('ngOnInit()', () => {
    it('should call GET_AllClarisaImpactAreaIndicators()on initialization', () => {
      const spy = jest.spyOn(component, 'GET_AllClarisaImpactAreaIndicators');

      component.ngOnInit();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('GET_AllClarisaImpactAreaIndicators()', () => {
    it('should set actionAreasOutcomesList on successful GETAllClarisaActionAreasOutcomes response', () => {
      const spy = jest.spyOn(mockApiService.resultsSE, 'GETAllClarisaActionAreasOutcomes');

      component.GET_AllClarisaImpactAreaIndicators();

      expect(spy).toHaveBeenCalled();
      expect(component.actionAreasOutcomesList).toEqual(mockResponse)
      expect(component.actionAreasOutcomesList.systemTrasnformation[0].full_name).toBe('<strong>Systems Transformation</strong> (outcomeSMOcode) - outcomeStatement');
      expect(component.actionAreasOutcomesList.resilientAgrifoodSystems[0].full_name).toBe('<strong>Resilient Agrifood Systems</strong> (outcomeSMOcode) - outcomeStatement');
      expect(component.actionAreasOutcomesList.geneticInnovation[0].full_name).toBe('<strong>Genetic Innovation</strong> (outcomeSMOcode) - outcomeStatement');
    });
    it('should handle error when GET_fullInitiativeTocByinitId call fails', () => {
      const errorMessage = 'Your error message';
      const spy = jest.spyOn(mockApiService.resultsSE, 'GETAllClarisaActionAreasOutcomes')
        .mockReturnValue(throwError(errorMessage));;
      const spyConsoleError = jest.spyOn(console, 'error');

      component.GET_AllClarisaImpactAreaIndicators();

      expect(spy).toHaveBeenCalled();
      expect(spyConsoleError).toHaveBeenCalledWith(errorMessage);
    });
  });

  describe('filterImpactAreaIndicatorsByImpactAreaID()', () => {
    it('should filter impact area indicators correctly', () => {
      const mockAllImpactAreaIndicators = [
        { targetId: 1, impactAreaId: 1, name: 'Indicator 1' },
        { targetId: 2, impactAreaId: 1, name: 'Indicator 2' },
        { targetId: 3, impactAreaId: 2, name: 'Indicator 3' },
        { targetId: 4, impactAreaId: 2, name: 'Indicator 4' },
      ];
  
      component.allImpactAreaIndicators = mockAllImpactAreaIndicators;
  
      const filter = component.filterImpactAreaIndicatorsByImpactAreaID(1);
  
      expect(filter.length).toBe(2);
      expect(filter).toEqual([
        { targetId: 1, impactAreaId: 1, name: 'Indicator 1' },
        { targetId: 2, impactAreaId: 1, name: 'Indicator 2' },
      ])
    });
  });

  describe('removeOption()', () => {
    it('should remove option from body', () => {
      const optionToRemove = { targetId: 1 };
      component.body = [
        { targetId: 1 },
        { targetId: 2 },
        { targetId: 3 },
      ];
  
      component.removeOption(optionToRemove);
  
      expect(component.body.length).toBe(2);
      expect(component.body).toEqual([
        { targetId: 2 },
        { targetId: 3 },
      ])
    });
  });

  describe('selectImpactArea()', () => {
    it('should select impact area', () => {
      let impactAreaItem = { id: 1, selected: undefined };
      component.impactAreasData = [
        { 
          id: 1, 
          selected: false ,
          imageRoute: '',
           color: '',
           name: ''
        },
      ];
  
      component.selectImpactArea(impactAreaItem);
  
      expect(impactAreaItem.selected).toBeTruthy();
      expect(component.currentImpactAreaID).toBe(impactAreaItem.id);
    });

    it('should not select impact area if rolesSE.readOnly is true', () => {
      mockApiService.rolesSE.readOnly = true;
      let impactAreaItem = { id: 1, selected: undefined };

      component.selectImpactArea(impactAreaItem);
  
      expect(impactAreaItem.selected).toBeFalsy();
      expect(component.currentImpactAreaID).toBeNull();
    });
  });
});
