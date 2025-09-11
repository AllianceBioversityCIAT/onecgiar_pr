import { TestBed } from '@angular/core/testing';
import { ResultsListFilterPipe } from './results-list-filter.pipe';
import { ResultsListFilterService } from '../services/results-list-filter.service';

describe('ResultsListFilterPipe', () => {
  let pipe: ResultsListFilterPipe;
  let mockResultsListFilterService: any;

  beforeEach(() => {
    mockResultsListFilterService = {
      filters: {
        general: [
          {
            options: [
              { selected: true, cleanAll: false },
              { selected: false, cleanAll: false }
            ]
          },
          {
            options: [
              { attr: 'Phase one', selected: true, cleanAll: false },
              { attr: 'Phase two', selected: false, cleanAll: false }
            ]
          }
        ],
        resultLevel: [
          {
            id: 456,
            options: [
              { id: 789, selected: true, cleanAll: false },
              { id: 2, selected: false, cleanAll: false }
            ]
          }
        ]
      }
    };

    TestBed.configureTestingModule({
      providers: [ResultsListFilterPipe, { provide: ResultsListFilterService, useValue: mockResultsListFilterService }]
    });

    pipe = TestBed.inject(ResultsListFilterPipe);
  });

  describe('transform', () => {
    it('should filter results based on filters', () => {
      const resultList = [
        { title: 'Result one', result_code: 123, phase_name: 'Phase one', result_level_id: 456, result_type_id: 789 },
        { title: 'Result two', result_code: 2, phase_name: 'Phase two', result_level_id: 2, result_type_id: 2 },
        {}
      ];
      const word = 'Result one';
      const combine = true;
      const filterJoin = 0;

      const result = pipe.transform(resultList, word, combine, filterJoin);

      expect(result).toEqual([
        {
          result_code: 123,
          submitter: undefined,
          results: [
            {
              title: 'Result one',
              result_code: 123,
              phase_name: 'Phase one',
              result_level_id: 456,
              result_type_id: 789,
              joinAll: 'Result one 123 Phase one 456 789 Result one 123 Phase one 456 789  '
            }
          ]
        }
      ]);
    });
  });

  describe('filterByText', () => {
    it('should return empty array for empty resultList', () => {
      const resultList = [];
      const word = 'Result';

      const result = pipe.filterByText(resultList, word);

      expect(result).toEqual([]);
    });
  });

  describe('filterByInitsAndYear', () => {
    it('should return original list when no submitter options are selected', () => {
      const resultList = [
        { submitter_id: 1, legacy_id: 5 },
        { submitter_id: 2, legacy_id: 6 },
        { submitter_id: 3, legacy_id: 7 }
      ];
      mockResultsListFilterService.filters.general[0].options.forEach(option => (option.selected = false));

      const result = pipe.filterByInitsAndYear(resultList);

      expect(result).toEqual(resultList);
    });

    it('should filter results by submitter and is_legacy', () => {
      const resultList = [{ submitter_id: 1, legacy_id: 5 }, { submitter_id: 2 }, { submitter_id: 3, legacy_id: 7 }];
      mockResultsListFilterService.filters.general[0].options = [{ id: 1, attr: 'is_legacy', selected: true, cleanAll: false }];

      const result = pipe.filterByInitsAndYear(resultList);

      expect(result).toEqual([
        { submitter_id: 1, legacy_id: 5 },
        { submitter_id: 3, legacy_id: 7 }
      ]);
    });
  });

  describe('filterByPhase', () => {
    it('should return the original result list when no phase filters are selected', () => {
      const resultList = [{ phase_name: 'Phase 1' }, { phase_name: 'Phase 2' }, { phase_name: 'Phase 3' }];
      mockResultsListFilterService.filters.general[1].options = [];

      const result = pipe.filterByPhase(resultList);

      expect(result).toEqual(resultList);
    });
    it('should return true if at least one phase filter matches the result', () => {
      const resultList = [{ phase_name: 'Phase 1' }, { phase_name: 'Phase 2' }, { phase_name: 'Phase 3' }];
      mockResultsListFilterService.filters.general[1].options = [{ attr: 'Phase 2', selected: true, cleanAll: false }];

      const result = pipe.filterByPhase(resultList);

      expect(result).toEqual([{ phase_name: 'Phase 2' }]);
    });
  });

  describe('filterByResultLevelOptions', () => {
    it('should return the original result list when no result level filters are selected', () => {
      const resultList = [
        { result_level_id: 1, result_type_id: 1 },
        { result_level_id: 2, result_type_id: 2 },
        { result_level_id: 3, result_type_id: 3 }
      ];
      mockResultsListFilterService.filters.resultLevel[0].options = [];

      const result = pipe.filterByResultLevelOptions(resultList);

      expect(result).toEqual(resultList);
    });
    it('should return false if no result level filter matches the result', () => {
      const resultList = [
        { result_level_id: 1, result_type_id: 1 },
        { result_level_id: 2, result_type_id: 2 },
        { result_level_id: 3, result_type_id: 3 }
      ];
      mockResultsListFilterService.filters.resultLevel[0].options = [{ id: 99, selected: true, cleanAll: false }];

      const result = pipe.filterByResultLevelOptions(resultList);

      expect(result).toEqual([]);
    });
  });

  describe('separateResultInList', () => {
    it('should separate results into an array', () => {
      const results = [
        { result_code: 1, submitter: 'Submitter 1' },
        { result_code: 2, submitter: 'Submitter 2' }
      ];

      const separatedResults = pipe.separateResultInList(results);

      expect(separatedResults.length).toBe(results.length);
      separatedResults.forEach((separatedResult, index) => {
        expect(separatedResult.result_code).toBe(results[index].result_code);
        expect(separatedResult.submitter).toBe(results[index].submitter);
        expect(separatedResult.results.length).toBe(1);
        expect(separatedResult.results[0]).toEqual(results[index]);
      });
    });
  });
});
