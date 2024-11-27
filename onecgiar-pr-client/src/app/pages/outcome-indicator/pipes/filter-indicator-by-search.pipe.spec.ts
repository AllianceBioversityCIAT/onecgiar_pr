import { FilterIndicatorBySearchPipe } from './filter-indicator-by-search.pipe';

describe('FilterIndicatorBySearchPipe', () => {
  let pipe: FilterIndicatorBySearchPipe;

  beforeEach(() => {
    pipe = new FilterIndicatorBySearchPipe();
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should return an empty array if input is not an array', () => {
    const result = pipe.transform(null, 'search');
    expect(result).toEqual([]);
  });

  it('should return the original list if searchFilter is empty', () => {
    const list = [{ toc_result_description: 'Test', toc_results: [] }];
    const result = pipe.transform(list, '');
    expect(result).toBeDefined();
    expect(result).toEqual(list);
  });

  it('should filter the list based on searchFilter', () => {
    const list = [
      { toc_result_description: 'Test1', toc_results: [{ toc_result_description: 'Desc1', indicators: [] }] },
      { toc_result_description: 'Test2', toc_results: [{ toc_result_description: 'Desc2', indicators: [] }] }
    ];
    const result = pipe.transform(list, 'Desc1');
    expect(result.length).toBe(1);
    expect(result[0].toc_result_description).toBe('Test1');
  });

  it('should handle isWPsTable flag correctly', () => {
    const list = [
      {
        toc_result_description: 'Test1',
        toc_results: [
          {
            toc_result_description: 'Desc1',
            indicators: [{ indicator_description: 'Indicator1', isVisible: false }]
          }
        ]
      }
    ];
    const result = pipe.transform(list, 'Indicator1', true);
    expect(result.length).toBe(1);
    expect(result[0].toc_results[0].indicators[0].isVisible).toBe(true);
  });

  it('should reset indicators if searchFilter is empty and isWPsTable is true', () => {
    const list = [
      {
        toc_result_description: 'Test1',
        toc_results: [
          {
            toc_result_description: 'Desc1',
            indicators: [{ indicator_description: 'Indicator1', isVisible: true }]
          }
        ]
      }
    ];
    pipe.transform(list, '', true);
    expect(list[0].toc_results[0].indicators[0].isVisible).toBe(true);
  });
});
