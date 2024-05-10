import { TestBed } from '@angular/core/testing';

import { ResultLevelService } from './result-level.service';
import { of } from 'rxjs';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ResultBody } from '../../../../../shared/interfaces/result.interface';

describe('ResultLevelService', () => {
  let service: ResultLevelService;
  let mockApiService: any;
  let mockResultsListFilterService: any
  const resultLevel = {
    id: 3,
    name: 'name',
    result_type: [],
    selected: false,
    description: 'description'
  };
  beforeEach(() => {
    mockApiService = {
      resultsSE: {
        GET_TypeByResultLevel: () => of({ response: [resultLevel] }),
      }
    };
    mockResultsListFilterService = {
      setFiltersByResultLevelTypes: jest.fn()
    }

    TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
      ],
    });

    service = new ResultLevelService(mockApiService, mockResultsListFilterService)
  });

  describe('onSelectResultLevel()', () => {
    it('should update properties when called', () => {
      service.onSelectResultLevel(resultLevel);

      expect(service.resultBody.result_level_id).toBe(3);
      expect(service.resultBody['result_level_name']).toBe('name');
      expect(service.resultBody.result_type_id).toBeNull();
      expect(service.currentResultTypeList).toBe(resultLevel.result_type);
      expect(service.resultLevelList[0].selected).toBe(true);
    });
  });

  describe('cleanData()', () => {
    it('should reset resultBody when called', () => {
      service.resultBody = new ResultBody();

      service.cleanData();

      expect(service.resultBody).toEqual(new ResultBody());
    });
  });

  describe('GET_TypeByResultLevel()', () => {
    it('should handle response and update properties', () => {
      const spy = jest.spyOn(mockApiService.resultsSE, 'GET_TypeByResultLevel');
      const removeResultTypesSpy = jest.spyOn(service, 'removeResultTypes');
      const setFiltersByResultLevelTypesSpy = jest.spyOn(mockResultsListFilterService, 'setFiltersByResultLevelTypes');

      service.GET_TypeByResultLevel();

      expect(removeResultTypesSpy).toHaveBeenCalledWith([resultLevel]);
      expect(service.resultLevelList).toEqual([resultLevel]);
      expect(setFiltersByResultLevelTypesSpy).toHaveBeenCalledWith(service.resultLevelList);
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('removeResultTypes()', () => {
    it('should remove result types with specified ids', () => {
      const list = [
        { id: 1, result_type: [{ id: 10 }, { id: 11 }] },
        { id: 3, result_type: [{ id: 10 }, { id: 11 }] },
      ];

      service.removeResultTypes(list);

      expect(list[0].result_type).toEqual([{ id: 10 }, { id: 11 }]);
      expect(list[1].result_type).toEqual([]);
    });
  });

});
