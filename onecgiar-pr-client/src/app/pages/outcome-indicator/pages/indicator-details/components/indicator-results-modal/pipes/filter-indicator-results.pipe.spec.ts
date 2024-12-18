import { FilterIndicatorResultsPipe } from './filter-indicator-results.pipe';

describe('FilterIndicatorResultsPipe', () => {
  let pipe: FilterIndicatorResultsPipe;

  beforeEach(() => {
    pipe = new FilterIndicatorResultsPipe();
  });

  it('should return the original list if no word is provided', () => {
    const list = [{ result_code: '001', title: 'Test' }];
    expect(pipe.transform(list, '')).toBe(list);
  });

  it('should return an empty array if the list is empty', () => {
    expect(pipe.transform([], 'test')).toEqual([]);
  });

  it('should filter the list based on the provided word', () => {
    const list = [
      { result_code: '001', title: 'Test' },
      { result_code: '002', title: 'Example' },
      { result_code: '003', title: 'Sample' }
    ];
    const result = pipe.transform(list, 'test');
    expect(result).toEqual([{ result_code: '001', title: 'Test', joinAll: '001 Test' }]);
  });

  it('should be case insensitive when filtering', () => {
    const list = [
      { result_code: '001', title: 'Test' },
      { result_code: '002', title: 'Example' },
      { result_code: '003', title: 'Sample' }
    ];
    const result = pipe.transform(list, 'TEST');
    expect(result).toEqual([{ result_code: '001', title: 'Test', joinAll: '001 Test' }]);
  });

  it('should handle items without result_code or title', () => {
    const list = [
      { result_code: '001', title: 'Test' },
      { result_code: null, title: 'Example' },
      { result_code: '003', title: null }
    ];
    const result = pipe.transform(list, 'test');
    expect(result).toEqual([{ result_code: '001', title: 'Test', joinAll: '001 Test' }]);
  });
});
