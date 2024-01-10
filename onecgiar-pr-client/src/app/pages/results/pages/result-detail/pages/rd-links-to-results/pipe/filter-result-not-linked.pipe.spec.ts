import { TestBed } from '@angular/core/testing';
import { FilterResultNotLinkedPipe } from './filter-result-not-linked.pipe';
import { ApiService } from '../../../../../../../shared/services/api/api.service';

describe('FilterResultNotLinkedPipe', () => {
  let pipe: FilterResultNotLinkedPipe;
  let mockApiService: any;

  beforeEach(() => {
    mockApiService = {
      resultsSE: {
        currentResultId: 1
      }
    }

    TestBed.configureTestingModule({
      declarations: [FilterResultNotLinkedPipe],
      providers: [
        {
          provide: ApiService,
          useValue: mockApiService
        },
        FilterResultNotLinkedPipe
      ]
    });

    pipe = TestBed.inject(FilterResultNotLinkedPipe);
  });
  it('should filter out the current result', () => {
    const resultList = [
      { id: 1, name: 'Result 1' },
      { id: 2, name: 'Result 2' },
    ];
    const linkedList = [{ id: 2, name: 'Result 2' }];

    const result = pipe.transform(resultList, linkedList, true, 0, '');

    expect(result).toHaveLength(1);
    expect(result.some(item => item.id === 1)).toBeFalsy();
  });

  it('should return an empty [] when list is empty', () => {
    const resultList = [];

    const result = pipe.transform(resultList, [], true, 0, 'Result 1');

    expect(result).toHaveLength(0);
  });

  it('should filter results by text', () => {
    const resultList = [
      { name: 'John Doe', age: 25 },
      { name: 'Jane Doe', age: 30 },
    ];

    const filteredResults = pipe.filterByText(resultList, 'John');

    expect(filteredResults.length).toBe(1);
    expect(filteredResults[0].name).toBe('John Doe');
  });

  it('should handle empty result list', () => {
    const emptyResultList = [];

    const filteredResults = pipe.filterByText(emptyResultList, 'John');

    expect(filteredResults.length).toBe(0);
  });

  it('should handle empty word', () => {
    const resultList = [
      { name: 'John Doe', age: 25 },
      { name: 'Jane Doe', age: 30 },
    ];

    const filteredResults = pipe.filterByText(resultList, '');

    expect(filteredResults.length).toBe(resultList.length);
  });

  it('should handle undefined or null values in result properties', () => {
    const resultList = [
      { name: 'John Doe', age: 25, description: null },
      { name: 'Jane Doe', age: 30, description: undefined },
    ];

    const filteredResults = pipe.filterByText(resultList, 'John');

    expect(filteredResults.length).toBe(1);
    expect(filteredResults[0].name).toBe('John Doe');
  });

  it('should separate results in a list when combine is false', () => {
    const results = [
      { name: 'John Doe' },
      { name: 'Jane Doe' },
    ];

    const separatedResults = pipe.convertList(results, false);

    expect(separatedResults.length).toBe(results.length);
  });
});
