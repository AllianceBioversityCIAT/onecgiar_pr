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

    it('should not splice when type ids are not found', () => {
      const list = [
        { id: 3, result_type: [{ id: 1 }, { id: 2 }] },
      ];

      service.removeResultTypes(list);

      expect(list[0].result_type).toEqual([{ id: 1 }, { id: 2 }]);
    });
  });

  describe('outputOutcomeLevelsSig', () => {
    it('should return empty array when levels is null or empty', () => {
      service.resultLevelListSig.set([]);
      expect(service.outputOutcomeLevelsSig()).toEqual([]);
    });

    it('should return empty array when levels has fewer than 4 items', () => {
      service.resultLevelListSig.set([
        { id: 1, name: 'Level 1', result_type: [], selected: false, description: '' },
        { id: 2, name: 'Level 2', result_type: [], selected: false, description: '' },
        { id: 3, name: 'Level 3', result_type: [], selected: false, description: '' }
      ]);
      expect(service.outputOutcomeLevelsSig()).toEqual([]);
    });

    it('should return reversed slice of levels[2..4] when levels has 4+ items', () => {
      const levels = [
        { id: 1, name: 'Level 1', result_type: [], selected: false, description: '' },
        { id: 2, name: 'Level 2', result_type: [], selected: false, description: '' },
        { id: 3, name: 'Level 3', result_type: [], selected: false, description: '' },
        { id: 4, name: 'Level 4', result_type: [], selected: false, description: '' }
      ];
      service.resultLevelListSig.set(levels);
      const result = service.outputOutcomeLevelsSig();
      expect(result).toEqual([
        { id: 4, name: 'Level 4', result_type: [], selected: false, description: '' },
        { id: 3, name: 'Level 3', result_type: [], selected: false, description: '' }
      ]);
    });
  });

  describe('onSelectResultLevel() branch coverage', () => {
    it('should handle when originalLevel is not found in resultLevelList', () => {
      service.resultLevelList = [
        { id: 1, name: 'Level 1', result_type: [{ id: 5, name: 'type5', description: '', result_level_id: 1 }], selected: false, description: '' }
      ];
      const externalLevel = { id: 99, name: 'External', result_type: [], selected: false, description: '' };

      service.onSelectResultLevel(externalLevel);

      expect(service.resultBody.result_level_id).toBe(99);
      expect(service.resultBody['result_level_name']).toBe('External');
      expect(service.currentResultTypeList).toEqual([]);
      expect(service.resultLevelList[0].selected).toBe(false);
    });

    it('should handle when resultLevelList is null', () => {
      service.resultLevelList = null;
      const level = { id: 1, name: 'Test', result_type: [{ id: 1, name: 'type', description: '', result_level_id: 1 }], selected: false, description: '' };

      service.onSelectResultLevel(level);

      expect(service.resultBody.result_level_id).toBe(1);
      expect(service.resultBody['result_level_name']).toBe('Test');
    });

    it('should set currentResultTypeListSig to empty array when result_type is null', () => {
      const level = { id: 1, name: 'Test', result_type: null, selected: false, description: '' };
      service.resultLevelList = [level];

      service.onSelectResultLevel(level);

      expect(service.currentResultTypeListSig()).toEqual([]);
    });
  });

  describe('resetSelection()', () => {
    it('should reset all selections in resultLevelListSig', () => {
      service.resultLevelListSig.set([
        { id: 1, name: 'L1', result_type: [], selected: true, description: '' },
        { id: 2, name: 'L2', result_type: [], selected: true, description: '' }
      ]);
      service.resultLevelList = [
        { id: 1, name: 'L1', result_type: [], selected: true, description: '' },
        { id: 2, name: 'L2', result_type: [], selected: true, description: '' }
      ];

      service.resetSelection();

      service.resultLevelListSig().forEach(rl => expect(rl.selected).toBe(false));
      service.resultLevelList.forEach(rl => expect(rl.selected).toBe(false));
    });

    it('should handle null resultLevelList', () => {
      service.resultLevelList = null;
      service.resultLevelListSig.set([
        { id: 1, name: 'L1', result_type: [], selected: true, description: '' }
      ]);

      service.resetSelection();

      service.resultLevelListSig().forEach(rl => expect(rl.selected).toBe(false));
      expect(service.resultLevelList).toBeNull();
    });

    it('should handle null resultLevelListSig value', () => {
      service.resultLevelListSig.set(null);
      service.resultLevelList = [
        { id: 1, name: 'L1', result_type: [], selected: true, description: '' }
      ];

      service.resetSelection();

      expect(service.resultLevelList[0].selected).toBe(false);
    });
  });

  describe('preselectResultType()', () => {
    const makeLevels = () => [
      { id: 1, name: 'Impact', result_type: [{ id: 1, name: 'Policy', description: '', result_level_id: 1 }], selected: false, description: '' },
      { id: 2, name: 'Other', result_type: [{ id: 2, name: 'Capacity', description: '', result_level_id: 2 }], selected: false, description: '' },
      { id: 3, name: 'Outcome', result_type: [{ id: 3, name: 'Innovation', description: '', result_level_id: 3 }, { id: 7, name: 'Shared', description: '', result_level_id: 3 }], selected: false, description: '' },
      { id: 4, name: 'Output', result_type: [{ id: 4, name: 'Knowledge', description: '', result_level_id: 4 }, { id: 8, name: 'SharedOut', description: '', result_level_id: 4 }], selected: false, description: '' }
    ];

    it('should return early when resultLevelList is empty', () => {
      service.resultLevelList = [];

      service.preselectResultType(1);

      expect(service.resultBody.result_level_id).toBe('');
    });

    it('should return early when resultLevelList is null', () => {
      service.resultLevelList = null;

      service.preselectResultType(1);

      expect(service.resultBody.result_level_id).toBe('');
    });

    it('should preselect by resultTypeId when type is in a visible level (id 3)', () => {
      service.resultLevelList = makeLevels();

      service.preselectResultType(3);

      expect(service.resultBody.result_level_id).toBe(3);
      expect(service.resultBody.result_type_id).toBe(3);
      expect(service.resultLevelList[2].selected).toBe(true);
      expect(service.resultLevelList[0].selected).toBe(false);
    });

    it('should preselect by resultTypeId when type is in a visible level (id 4)', () => {
      service.resultLevelList = makeLevels();

      service.preselectResultType(4);

      expect(service.resultBody.result_level_id).toBe(4);
      expect(service.resultBody.result_type_id).toBe(4);
      expect(service.resultLevelList[3].selected).toBe(true);
    });

    it('should preselect by resultTypeName (case insensitive)', () => {
      service.resultLevelList = makeLevels();

      service.preselectResultType(undefined, '  innovation  ');

      expect(service.resultBody.result_level_id).toBe(3);
      expect(service.resultBody.result_type_id).toBe(3);
    });

    it('should return early when no matching type is found', () => {
      service.resultLevelList = makeLevels();

      service.preselectResultType(999);

      expect(service.resultBody.result_level_id).toBe('');
    });

    it('should redirect to visible level when type is found in non-visible level', () => {
      const levels = [
        { id: 1, name: 'Impact', result_type: [{ id: 7, name: 'Shared', description: '', result_level_id: 1 }], selected: false, description: '' },
        { id: 2, name: 'Other', result_type: [{ id: 2, name: 'Capacity', description: '', result_level_id: 2 }], selected: false, description: '' },
        { id: 3, name: 'Outcome', result_type: [{ id: 7, name: 'Shared', description: '', result_level_id: 3 }], selected: false, description: '' },
        { id: 4, name: 'Output', result_type: [{ id: 4, name: 'Knowledge', description: '', result_level_id: 4 }], selected: false, description: '' }
      ];
      service.resultLevelList = levels;

      service.preselectResultType(7);

      expect(service.resultBody.result_level_id).toBe(3);
    });

    it('should fallback to outcomeLevel when type is not in visible levels but is in outcome (id=3)', () => {
      const levels = [
        { id: 1, name: 'Impact', result_type: [{ id: 7, name: 'Shared', description: '', result_level_id: 1 }], selected: false, description: '' },
        { id: 2, name: 'Other', result_type: [], selected: false, description: '' },
        { id: 3, name: 'Outcome', result_type: [{ id: 7, name: 'Shared', description: '', result_level_id: 3 }], selected: false, description: '' },
        { id: 4, name: 'Output', result_type: [], selected: false, description: '' }
      ];
      service.resultLevelList = levels;

      service.preselectResultType(7);

      expect(service.resultBody.result_level_id).toBe(3);
    });

    it('should fallback to outputLevel when type is not in visible levels or outcome, but is in output (id=4)', () => {
      const levels = [
        { id: 1, name: 'Impact', result_type: [{ id: 7, name: 'Shared', description: '', result_level_id: 1 }], selected: false, description: '' },
        { id: 2, name: 'Other', result_type: [], selected: false, description: '' },
        { id: 3, name: 'Outcome', result_type: [], selected: false, description: '' },
        { id: 4, name: 'Output', result_type: [{ id: 7, name: 'Shared', description: '', result_level_id: 4 }], selected: false, description: '' }
      ];
      service.resultLevelList = levels;

      service.preselectResultType(7);

      expect(service.resultBody.result_level_id).toBe(4);
    });

    it('should stay on non-visible level when no visible level has the type', () => {
      const levels = [
        { id: 1, name: 'Impact', result_type: [{ id: 7, name: 'Shared', description: '', result_level_id: 1 }], selected: false, description: '' },
        { id: 2, name: 'Other', result_type: [], selected: false, description: '' },
        { id: 3, name: 'Outcome', result_type: [], selected: false, description: '' },
        { id: 4, name: 'Output', result_type: [], selected: false, description: '' }
      ];
      service.resultLevelList = levels;

      service.preselectResultType(7);

      expect(service.resultBody.result_level_id).toBe(1);
    });

    it('should handle when outcomeLevel has null result_type and outputLevel has matching type', () => {
      const levels = [
        { id: 1, name: 'Impact', result_type: [{ id: 7, name: 'Shared', description: '', result_level_id: 1 }], selected: false, description: '' },
        { id: 2, name: 'Other', result_type: [], selected: false, description: '' },
        { id: 3, name: 'Outcome', result_type: null, selected: false, description: '' },
        { id: 4, name: 'Output', result_type: [{ id: 7, name: 'Shared', description: '', result_level_id: 4 }], selected: false, description: '' }
      ];
      service.resultLevelList = levels;

      service.preselectResultType(7);

      expect(service.resultBody.result_level_id).toBe(4);
    });

    it('should handle when neither outcomeLevel nor outputLevel exist in list', () => {
      const levels = [
        { id: 1, name: 'Impact', result_type: [{ id: 7, name: 'Shared', description: '', result_level_id: 1 }], selected: false, description: '' },
        { id: 2, name: 'Other', result_type: [], selected: false, description: '' },
        { id: 5, name: 'Custom', result_type: [], selected: false, description: '' },
        { id: 6, name: 'Custom2', result_type: [], selected: false, description: '' }
      ];
      service.resultLevelList = levels;

      service.preselectResultType(7);

      expect(service.resultBody.result_level_id).toBe(1);
    });

    it('should handle when outputLevel has null result_type', () => {
      const levels = [
        { id: 1, name: 'Impact', result_type: [{ id: 7, name: 'Shared', description: '', result_level_id: 1 }], selected: false, description: '' },
        { id: 2, name: 'Other', result_type: [], selected: false, description: '' },
        { id: 3, name: 'Outcome', result_type: [], selected: false, description: '' },
        { id: 4, name: 'Output', result_type: null, selected: false, description: '' }
      ];
      service.resultLevelList = levels;

      service.preselectResultType(7);

      expect(service.resultBody.result_level_id).toBe(1);
    });

    it('should set currentResultTypeListSig to empty array when result_type is null', () => {
      const levels = [
        { id: 3, name: 'Outcome', result_type: null, selected: false, description: '' },
        { id: 4, name: 'Output', result_type: null, selected: false, description: '' },
        { id: 1, name: 'Impact', result_type: null, selected: false, description: '' },
        { id: 2, name: 'Other', result_type: null, selected: false, description: '' }
      ];
      service.resultLevelList = levels;

      service.preselectResultType(1);

      // Should return early because no type matches
      expect(service.resultBody.result_level_id).toBe('');
    });

    it('should set result_type_id to null when targetType is not found', () => {
      const levels = [
        { id: 3, name: 'Outcome', result_type: [{ id: 3, name: 'Innovation', description: '', result_level_id: 3 }], selected: false, description: '' },
        { id: 4, name: 'Output', result_type: [{ id: 4, name: 'Knowledge', description: '', result_level_id: 4 }], selected: false, description: '' },
        { id: 1, name: 'Impact', result_type: [], selected: false, description: '' },
        { id: 2, name: 'Other', result_type: [], selected: false, description: '' }
      ];
      service.resultLevelList = levels;

      service.preselectResultType(3);

      expect(service.resultBody.result_type_id).toBe(3);
    });

    it('should handle preselectResultType with neither id nor name', () => {
      service.resultLevelList = makeLevels();

      service.preselectResultType(undefined, undefined);

      // matchesType returns false for everything, so no targetLevel found
      expect(service.resultBody.result_level_id).toBe('');
    });

    it('should handle preselectResultType with name that does not match', () => {
      service.resultLevelList = makeLevels();

      service.preselectResultType(undefined, 'nonexistent');

      expect(service.resultBody.result_level_id).toBe('');
    });
  });

  describe('setPendingResultType()', () => {
    it('should set pending result type with id', () => {
      service.setPendingResultType(5);
      expect(service.consumePendingResultType()).toEqual({ id: 5, name: undefined });
    });

    it('should set pending result type with name', () => {
      service.setPendingResultType(undefined, 'Innovation');
      expect(service.consumePendingResultType()).toEqual({ id: undefined, name: 'Innovation' });
    });

    it('should set pending result type with both id and name', () => {
      service.setPendingResultType(5, 'Innovation');
      expect(service.consumePendingResultType()).toEqual({ id: 5, name: 'Innovation' });
    });

    it('should handle null values via nullish coalescing', () => {
      service.setPendingResultType(null, null);
      expect(service.consumePendingResultType()).toEqual({ id: undefined, name: undefined });
    });
  });

  describe('consumePendingResultType()', () => {
    it('should return null when no pending selection exists', () => {
      expect(service.consumePendingResultType()).toBeNull();
    });

    it('should clear the pending selection after consumption', () => {
      service.setPendingResultType(1);
      service.consumePendingResultType();
      expect(service.consumePendingResultType()).toBeNull();
    });
  });

});
