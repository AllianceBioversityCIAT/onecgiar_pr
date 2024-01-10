import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SimilarResultsComponent } from './similar-results.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { of } from 'rxjs';
import { ResultLevelService } from '../../services/result-level.service';
import { RetrieveModalService } from '../../../result-detail/components/retrieve-modal/retrieve-modal.service';

describe('SimilarResultsComponent', () => {
  let component: SimilarResultsComponent;
  let fixture: ComponentFixture<SimilarResultsComponent>;
  let mockApiService: any;
  let mockResultLevelService: any;
  let mockRetrieveModalService: any;

  beforeEach(async () => {
    mockApiService = {
      dataControlSE: {},
      resultsSE: {
        currentResultId: () => of({ response: {} }),
      }
    }

    mockResultLevelService = {
      currentResultId: 1,
      resultLevelList: [
        {
          id: 1,
          name: 'name',
          result_type:[
            {
              id: 1,
              name: 'name'
            }
          ]
        }
      ],
      resultBody: {
        result_level_id: 1,
        result_type_id: 1
      }
    }

    mockRetrieveModalService = {
      retrieveRequestBody: {
        legacy_id: 1
      }
    }


    await TestBed.configureTestingModule({
      declarations: [SimilarResultsComponent],
      imports: [
        HttpClientTestingModule,
      ],
      providers: [
        {
          provide: ApiService,
          useValue: mockApiService
        },
        {
          provide: ResultLevelService,
          useValue: mockResultLevelService
        },
        {
          provide: RetrieveModalService,
          useValue: mockRetrieveModalService
        },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SimilarResultsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('onPressAction()', () => {
    it('should set currentResultId and update currentResult properties', () => {
      const result = {
        id: 123,
        crp: 'crp',
        type: 'type',
        result_level_id: 1,
        result_level_name: 'name',
        result_type: 'type',
        result_type_name: 'name',
        submitter: 'crp',
      };

      component.onPressAction(result);

      expect(component.api.resultsSE.currentResultId).toBe(123);
      expect(component.api.dataControlSE.currentResult).toEqual(result);
      expect(component.api.dataControlSE.currentResult.result_type).toEqual(result.type);
      expect(component.api.dataControlSE.currentResult.result_level_name).toEqual(mockResultLevelService.resultLevelList[0].name);
      expect(component.api.dataControlSE.currentResult.result_type_name).toEqual('name');
      expect(component.api.dataControlSE.currentResult.submitter).toEqual(result.crp);
      expect(component.api.dataControlSE.currentResult.result_level_id).toEqual(component.api.dataControlSE.currentResult.result_level_id);
      expect(mockRetrieveModalService.retrieveRequestBody.legacy_id).toEqual(result.id);
    });
    it('should set currentResultId and update currentResult properties when api.dataControlSE.currentResult.result_level_id is undefined', () => {
      const result = {
        id: 123,
        crp: 'crp',
        type: 'type',
        result_level_name: 'name',
        result_type: 'type',
        result_type_name: 'name',
        submitter: 'crp',
      };

      component.onPressAction(result);

      expect(component.api.dataControlSE.currentResult.result_level_id).toEqual(component.resultLevelSE.resultBody.result_level_id);
    });
  });

  describe('getResultTypeName()', () => {
    it('should return result type name when result level and result type are found', () => {
      const result = component.getResultTypeName();

      expect(result).toBe('name');
    });
    it('should return "???" when result level is not found', () => {
      mockResultLevelService.resultLevelList = [];
      mockResultLevelService.resultBody.result_level_id = 1;

      const result = component.getResultTypeName();

      expect(result).toBe('???');
    });
  });
});
