import { FilterIndicatorBySearchPipe } from './filter-indicator-by-search.pipe';

describe('FilterIndicatorBySearchPipe', () => {
  let pipe: FilterIndicatorBySearchPipe;

  beforeEach(() => {
    pipe = new FilterIndicatorBySearchPipe();
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should return the original list if searchFilter is empty', () => {
    const list = [{ toc_result_description: 'Test' }];
    const result = pipe.transform(list, '');
    expect(result).toEqual(list);
  });

  it('should filter the list based on searchFilter', () => {
    const list = [
      { toc_result_description: 'Test1', indicators: [{ indicator_description: 'Desc1', indicator_name: 'Name1', is_indicator_custom: false }] },
      { toc_result_description: 'Test2', indicators: [{ indicator_description: 'Desc2', indicator_name: 'Name2', is_indicator_custom: true }] }
    ];
    const result = pipe.transform(list, 'Desc1');
    expect(result.length).toBe(1);
    expect(result[0].toc_result_description).toBe('Test1');
  });

  it('should create joinAll string for each item', () => {
    const list = [
      {
        toc_result_description: 'Test1',
        indicators: [{ indicator_description: 'Desc1', indicator_name: 'Name1', is_indicator_custom: false }],
        joinAll: ''
      }
    ];
    pipe.transform(list, 'Desc1');
    expect(list[0].joinAll).toBe('Test1 Desc1 Standard - Name1');
  });

  it('should handle items with missing toc_result_description ', () => {
    const list = [
      {
        toc_result_description: null,
        indicators: [{ indicator_description: 'Desc1', indicator_name: 'Name1', is_indicator_custom: false }],
        joinAll: ''
      }
    ];
    pipe.transform(list, 'Desc1');
    expect(list[0].joinAll).toBe('Desc1 Standard - Name1');
  });

  it('should handle items with missing indicator_name', () => {
    const list = [
      {
        toc_result_description: 'Test1',
        indicators: [{ indicator_description: 'Desc1', indicator_name: null, is_indicator_custom: false }],
        joinAll: ''
      }
    ];
    pipe.transform(list, 'Desc1');
    expect(list[0].joinAll).toBe('Test1 Desc1');
  });

  it('should handle items with missing indicators array', () => {
    const list = [{ toc_result_description: 'Test1', indicators: [], joinAll: '' }];
    pipe.transform(list, 'Test1');
    expect(list[0].joinAll).toBe('Test1');
  });
});
