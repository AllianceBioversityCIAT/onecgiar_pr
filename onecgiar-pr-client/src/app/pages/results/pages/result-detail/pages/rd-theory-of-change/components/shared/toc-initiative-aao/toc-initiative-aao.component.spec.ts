import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TocInitiativeAaoComponent } from './toc-initiative-aao.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { PrFieldHeaderComponent } from '../../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { of, throwError } from 'rxjs';
import { ApiService } from '../../../../../../../../../shared/services/api/api.service';

describe('TocInitiativeAaoComponent', () => {
  let component: TocInitiativeAaoComponent;
  let fixture: ComponentFixture<TocInitiativeAaoComponent>;
  let mockApiService: any;
  const mockGET_resultActionAreaResponse =
  {
    consImpactTarget: [
      {
        full_name: 'full name',
        name: 'name',
        target: 'target'
      }
    ],
    consSdgTargets: [
      {
        full_name: 'full name',
        sdg_target_code: 'code',
        sdg_target: 'target'
      }
    ],
    action: [
      {
        full_name: 'full name',
        outcomeSMOcode: 'outcomeSMOcode',
        outcomeStatement: 'outcomeStatement'
      }
    ]
  }

  beforeEach(async () => {

    mockApiService = {
      resultsSE: {
        GET_resultActionArea: () => of({ response: mockGET_resultActionAreaResponse }),
      },
      tocApiSE: {
        GET_fullInitiativeTocByinitId: () => of({ response: [{ toc_id: 1 }] }),
      }
    }

    await TestBed.configureTestingModule({
      declarations: [
        TocInitiativeAaoComponent,
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

    fixture = TestBed.createComponent(TocInitiativeAaoComponent);
    component = fixture.componentInstance;
  });

  describe('ngOnInit()', () => {
    it('should call GET_fullInitiativeTocByinitId() and getInformatioActionAreaResult() on initialization', () => {
      const spyGET_fullInitiativeTocByinitId = jest.spyOn(component, 'GET_fullInitiativeTocByinitId');
      const spyGetInformatioActionAreaResult = jest.spyOn(component, 'getInformatioActionAreaResult');

      component.ngOnInit();
      expect(spyGET_fullInitiativeTocByinitId).toHaveBeenCalled();
      expect(spyGetInformatioActionAreaResult).toHaveBeenCalled();
    });
  });

  describe('getInformatioActionAreaResult()', () => {
    it('should populate resultActionArea and set informationGet to true', () => {
      component.initiative = {
        result_toc_results: [
          {
            initiative_id: 'someId',
            results_id: 'someResultsId'
          }
        ]
      };
      component.indexList = 0;
      const spy = jest.spyOn(mockApiService.resultsSE, 'GET_resultActionArea');

      component.getInformatioActionAreaResult();
      expect(spy).toHaveBeenCalled();
      expect(component.theoryOfChangesServices.resultActionArea.length).toBe(1);
      expect(component.theoryOfChangesServices.resultActionArea[0].consImpactTarget[0].full_name).toBe('<strong>name</strong> - target');
      expect(component.theoryOfChangesServices.resultActionArea[0].consSdgTargets[0].full_name).toBe('<strong>code</strong> - target');
      expect(component.theoryOfChangesServices.resultActionArea[0].action[0].full_name).toBe('<strong>outcomeSMOcode</strong> - outcomeStatement');
      expect(component.informationGet).toBeTruthy();
    });
  });

  describe('GET_fullInitiativeTocByinitId()', () => {
    it('should set fullInitiativeToc and vesiondashboard on successful API response', () => {
      const spy = jest.spyOn(mockApiService.tocApiSE, 'GET_fullInitiativeTocByinitId');

      component.GET_fullInitiativeTocByinitId();

      expect(spy).toHaveBeenCalled();
      expect(component.fullInitiativeToc).toBe(1);
      expect(component.vesiondashboard).toBeTruthy();
    });

    it('should handle error when GET_resultIdToCode call fails', () => {
      const errorMessage = 'Your error message';
      const spy = jest.spyOn(mockApiService.tocApiSE, 'GET_fullInitiativeTocByinitId')
        .mockReturnValue(throwError(errorMessage));;
      const spyConsoleError = jest.spyOn(console, 'error');

      component.GET_fullInitiativeTocByinitId();

      expect(spy).toHaveBeenCalled();
      expect(spyConsoleError).toHaveBeenCalledWith(errorMessage);
    });
  });
});
