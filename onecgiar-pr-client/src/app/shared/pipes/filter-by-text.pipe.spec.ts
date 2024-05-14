import { FilterByTextPipe } from './filter-by-text.pipe';

describe('FilterByTextPipe', () => {
  let pipe: FilterByTextPipe;

  beforeEach(() => {
    pipe = new FilterByTextPipe();
  });

  it('create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should return the same list when no word is provided', () => {
    const list = [{ full_name: 'Test' }, { full_name: 'Example' }];
    expect(pipe.transform(list, '')).toEqual(list);
  });

  it('should return an empty list when the list is not provided', () => {
    expect(pipe.transform(null, 'Test')).toEqual([]);
  });

  it('should filter the list based on the provided word', () => {
    const list = [{ full_name: 'Test' }, { full_name: 'Example' }];
    expect(pipe.transform(list, 'Test')).toEqual([{ full_name: 'Test' }]);
  });

  it('should return an empty list when no item matches the provided word', () => {
    const list = [{ full_name: 'Test' }, { full_name: 'Example' }];
    expect(pipe.transform(list, 'NoMatch')).toEqual([]);
  });

  it('should skip items with no full_name', () => {
    const list = [{ full_name: 'Test' }, { full_name: null }, {}];
    expect(pipe.transform(list, 'Test')).toEqual([{ full_name: 'Test' }]);
  });
});
