import { TestBed } from '@angular/core/testing';
import { ResultsListFilterPipe } from './results-list-filter.pipe';
import { ResultsListFilterService } from '../services/results-list-filter.service';

describe('ResultsListFilterPipe', () => {
  let pipe: ResultsListFilterPipe;
  let mockResultsListFilterService: any;

  const mockResultList = [
    {
      id: 1,
      title: 'Test Result One',
      result_code: 123,
      phase_name: 'Phase One',
      result_level_id: 456,
      result_type_id: 789,
      submitter: 'ORG001',
      status_id: 1,
      description: 'This is a test result',
      created_date: '2023-01-01'
    },
    {
      id: 2,
      title: 'Test Result Two',
      result_code: 124,
      phase_name: 'Phase Two',
      result_level_id: 457,
      result_type_id: 790,
      submitter: 'ORG002',
      status_id: 2,
      description: 'Another test result',
      created_date: '2023-01-02'
    },
    {
      id: 3,
      title: 'Duplicate Result',
      result_code: 123, // Same as first result
      phase_name: 'Phase One',
      result_level_id: 456,
      result_type_id: 789,
      submitter: 'ORG003',
      status_id: 1,
      description: 'Duplicate result code',
      created_date: '2023-01-03'
    }
  ];

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
              { attr: 'Phase One', selected: true, cleanAll: false },
              { attr: 'Phase Two', selected: false, cleanAll: false }
            ]
          }
        ],
        resultLevel: [
          {
            id: 456,
            options: [
              { id: 789, selected: true, cleanAll: false },
              { id: 790, selected: false, cleanAll: false }
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
    it('should return empty array when resultList is null or undefined', () => {
      expect(pipe.transform(null, 'test', false, [], [], [], [])).toEqual([]);
      expect(pipe.transform(undefined, 'test', false, [], [], [], [])).toEqual([]);
    });

    it('should return original list when no filters are applied', () => {
      const result = pipe.transform(mockResultList, '', false, [], [], [], []);
      expect(result).toEqual(mockResultList);
    });

    it('should apply text filter correctly', () => {
      const result = pipe.transform(mockResultList, 'Test Result One', false, [], [], [], []);
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Test Result One');
    });

    it('should apply phase filter correctly', () => {
      const selectedPhases = [{ attr: 'Phase One' }];
      const result = pipe.transform(mockResultList, '', false, selectedPhases, [], [], []);
      expect(result).toHaveLength(2);
      expect(result.every(r => r.phase_name === 'Phase One')).toBe(true);
    });

    it('should apply status filter correctly', () => {
      const selectedStatus = [{ status_id: 1 }];
      const result = pipe.transform(mockResultList, '', false, [], [], [], selectedStatus);
      expect(result).toHaveLength(2);
      expect(result.every(r => r.status_id === 1)).toBe(true);
    });

    it('should apply indicator categories filter correctly', () => {
      const selectedIndicatorCategories = [{ resultLevelId: 456, id: 789 }];
      const result = pipe.transform(mockResultList, '', false, [], [], selectedIndicatorCategories, []);
      expect(result).toHaveLength(2);
      expect(result.every(r => r.result_level_id === 456 && r.result_type_id === 789)).toBe(true);
    });

    it('should apply submitters filter correctly', () => {
      const selectedSubmitters = [{ official_code: 'ORG001' }];
      const result = pipe.transform(mockResultList, '', false, [], selectedSubmitters, [], []);
      expect(result).toHaveLength(1);
      expect(result[0].submitter).toBe('ORG001');
    });

    it('should combine results when combine is true', () => {
      const result = pipe.transform(mockResultList, '', true, [], [], [], []);
      expect(result).toHaveLength(2); // Two unique result codes
      const combinedResult = result.find(r => r.result_code === 123);
      expect(combinedResult.results).toHaveLength(2);
    });

    it('should separate results when combine is false', () => {
      const result = pipe.transform(mockResultList, '', false, [], [], [], []);
      expect(result).toHaveLength(3);
      result.forEach(r => {
        expect(r.results).toHaveLength(1);
        expect(r.results[0]).toEqual(r);
      });
    });

    it('should apply multiple filters simultaneously', () => {
      const selectedPhases = [{ attr: 'Phase One' }];
      const selectedStatus = [{ status_id: 1 }];
      const result = pipe.transform(mockResultList, 'Test', true, selectedPhases, [], [], selectedStatus);
      expect(result).toHaveLength(1);
      expect(result[0].result_code).toBe(123);
    });
  });

  describe('filterByStatus', () => {
    it('should return original list when no status filters are selected', () => {
      const result = pipe.filterByStatus(mockResultList, []);
      expect(result).toEqual(mockResultList);
    });

    it('should filter by single status', () => {
      const selectedStatus = [{ status_id: 1 }];
      const result = pipe.filterByStatus(mockResultList, selectedStatus);
      expect(result).toHaveLength(2);
      expect(result.every(r => r.status_id === 1)).toBe(true);
    });

    it('should filter by multiple statuses', () => {
      const selectedStatus = [{ status_id: 1 }, { status_id: 2 }];
      const result = pipe.filterByStatus(mockResultList, selectedStatus);
      expect(result).toHaveLength(3);
    });

    it('should return empty array when no matches found', () => {
      const selectedStatus = [{ status_id: 999 }];
      const result = pipe.filterByStatus(mockResultList, selectedStatus);
      expect(result).toEqual([]);
    });
  });

  describe('filterByIndicatorCategories', () => {
    it('should return original list when no indicator categories are selected', () => {
      const result = pipe.filterByIndicatorCategories(mockResultList, []);
      expect(result).toEqual(mockResultList);
    });

    it('should filter by single indicator category', () => {
      const selectedIndicatorCategories = [{ resultLevelId: 456, id: 789 }];
      const result = pipe.filterByIndicatorCategories(mockResultList, selectedIndicatorCategories);
      expect(result).toHaveLength(2);
      expect(result.every(r => r.result_level_id === 456 && r.result_type_id === 789)).toBe(true);
    });

    it('should filter by multiple indicator categories', () => {
      const selectedIndicatorCategories = [
        { resultLevelId: 456, id: 789 },
        { resultLevelId: 457, id: 790 }
      ];
      const result = pipe.filterByIndicatorCategories(mockResultList, selectedIndicatorCategories);
      expect(result).toHaveLength(3);
    });

    it('should return empty array when no matches found', () => {
      const selectedIndicatorCategories = [{ resultLevelId: 999, id: 999 }];
      const result = pipe.filterByIndicatorCategories(mockResultList, selectedIndicatorCategories);
      expect(result).toEqual([]);
    });
  });

  describe('filterBySubmitters', () => {
    it('should return original list when no submitters are selected', () => {
      const result = pipe.filterBySubmitters(mockResultList, []);
      expect(result).toEqual(mockResultList);
    });

    it('should filter by single submitter', () => {
      const selectedSubmitters = [{ official_code: 'ORG001' }];
      const result = pipe.filterBySubmitters(mockResultList, selectedSubmitters);
      expect(result).toHaveLength(1);
      expect(result[0].submitter).toBe('ORG001');
    });

    it('should filter by multiple submitters', () => {
      const selectedSubmitters = [{ official_code: 'ORG001' }, { official_code: 'ORG002' }];
      const result = pipe.filterBySubmitters(mockResultList, selectedSubmitters);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no matches found', () => {
      const selectedSubmitters = [{ official_code: 'ORG999' }];
      const result = pipe.filterBySubmitters(mockResultList, selectedSubmitters);
      expect(result).toEqual([]);
    });
  });

  describe('filterByPhase', () => {
    it('should return original list when no phases are selected', () => {
      const result = pipe.filterByPhase(mockResultList, []);
      expect(result).toEqual(mockResultList);
    });

    it('should filter by single phase', () => {
      const selectedPhases = [{ attr: 'Phase One' }];
      const result = pipe.filterByPhase(mockResultList, selectedPhases);
      expect(result).toHaveLength(2);
      expect(result.every(r => r.phase_name === 'Phase One')).toBe(true);
    });

    it('should filter by multiple phases', () => {
      const selectedPhases = [{ attr: 'Phase One' }, { attr: 'Phase Two' }];
      const result = pipe.filterByPhase(mockResultList, selectedPhases);
      expect(result).toHaveLength(3);
    });

    it('should return empty array when no matches found', () => {
      const selectedPhases = [{ attr: 'Non-existent Phase' }];
      const result = pipe.filterByPhase(mockResultList, selectedPhases);
      expect(result).toEqual([]);
    });
  });

  describe('filterByText', () => {
    it('should return original list when word is empty or null', () => {
      expect(pipe.filterByText(mockResultList, '')).toEqual(mockResultList);
      expect(pipe.filterByText(mockResultList, null)).toEqual(mockResultList);
      expect(pipe.filterByText(mockResultList, undefined)).toEqual(mockResultList);
    });

    it('should return empty array when resultList is null or undefined', () => {
      expect(pipe.filterByText(null, 'test')).toEqual([]);
      expect(pipe.filterByText(undefined, 'test')).toEqual([]);
    });

    it('should filter by title', () => {
      const result = pipe.filterByText(mockResultList, 'Test Result One');
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Test Result One');
    });

    it('should filter by description', () => {
      const result = pipe.filterByText(mockResultList, 'Another test');
      expect(result).toHaveLength(1);
      expect(result[0].description).toBe('Another test result');
    });

    it('should filter by result code', () => {
      const result = pipe.filterByText(mockResultList, '123');
      expect(result).toHaveLength(2);
      expect(result.every(r => r.result_code === 123)).toBe(true);
    });

    it('should be case insensitive', () => {
      const result = pipe.filterByText(mockResultList, 'test result one');
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Test Result One');
    });

    it('should exclude created_date and id fields from search', () => {
      const result = pipe.filterByText(mockResultList, '2023-01-01');
      expect(result).toHaveLength(0);
    });

    it('should handle empty strings in object values', () => {
      const testList = [
        { title: 'Test', description: '', result_code: 123 },
        { title: '', description: 'Test', result_code: 456 }
      ];
      const result = pipe.filterByText(testList, 'Test');
      expect(result).toHaveLength(2);
    });

    it('should trim whitespace from search term', () => {
      const result = pipe.filterByText(mockResultList, '  Test Result One  ');
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Test Result One');
    });
  });

  describe('convertList', () => {
    it('should call combineRepeatedResults when combine is true', () => {
      jest.spyOn(pipe, 'combineRepeatedResults').mockReturnValue([]);
      pipe.convertList(mockResultList, true);
      expect(pipe.combineRepeatedResults).toHaveBeenCalledWith(mockResultList);
    });

    it('should call separateResultInList when combine is false', () => {
      jest.spyOn(pipe, 'separateResultInList').mockReturnValue([]);
      pipe.convertList(mockResultList, false);
      expect(pipe.separateResultInList).toHaveBeenCalledWith(mockResultList);
    });
  });

  describe('separateResultInList', () => {
    it('should separate each result into its own array', () => {
      const result = pipe.separateResultInList(mockResultList);
      expect(result).toHaveLength(3);
      result.forEach((item, index) => {
        expect(item.results).toHaveLength(1);
        expect(item.results[0]).toEqual(mockResultList[index]);
      });
    });

    it('should handle empty array', () => {
      const result = pipe.separateResultInList([]);
      expect(result).toEqual([]);
    });
  });

  describe('combineRepeatedResults', () => {
    it('should combine results with same result_code', () => {
      const result = pipe.combineRepeatedResults(mockResultList);
      expect(result).toHaveLength(2);

      const combinedResult = result.find(r => r.result_code === 123);
      expect(combinedResult).toBeDefined();
      expect(combinedResult.results).toHaveLength(2);
      expect(combinedResult.submitter).toBe('ORG001'); // First result's submitter
    });

    it('should preserve unique result codes', () => {
      const result = pipe.combineRepeatedResults(mockResultList);
      const resultCodes = result.map(r => r.result_code);
      expect(resultCodes).toEqual([123, 124]);
    });

    it('should handle empty array', () => {
      const result = pipe.combineRepeatedResults([]);
      expect(result).toEqual([]);
    });

    it('should handle array with no duplicates', () => {
      const uniqueResults = [
        { result_code: 1, submitter: 'ORG001', title: 'Test 1' },
        { result_code: 2, submitter: 'ORG002', title: 'Test 2' }
      ];
      const result = pipe.combineRepeatedResults(uniqueResults);
      expect(result).toHaveLength(2);
      result.forEach(r => {
        expect(r.results).toHaveLength(1);
      });
    });
  });
});
