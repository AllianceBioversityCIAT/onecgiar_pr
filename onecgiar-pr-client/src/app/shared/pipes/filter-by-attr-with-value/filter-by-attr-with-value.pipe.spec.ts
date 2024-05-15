import { FilterByAttrWithValuePipe } from './filter-by-attr-with-value.pipe';

describe('FilterByAttrWithValuePipe', () => {
  let pipe: FilterByAttrWithValuePipe;

  beforeEach(() => {
    pipe = new FilterByAttrWithValuePipe();
  });

  it('should return the original list if no value is provided', () => {
    const list = [{ attr: 'test' }, { attr: 'other' }];
    expect(pipe.transform(list, 'attr', null)).toEqual(list);
  });

  it('should return an empty array if the list is undefined', () => {
    expect(pipe.transform(undefined, 'attr', 'test')).toEqual([]);
  });

  it('should filter the list based on the provided attribute and value', () => {
    const list = [{ attr: 'test' }, { attr: 'other' }];
    expect(pipe.transform(list, 'attr', 'test')).toEqual([{ attr: 'test' }]);
  });

  it('should be case insensitive', () => {
    const list = [{ attr: 'Test' }, { attr: 'Other' }];
    expect(pipe.transform(list, 'attr', 'test')).toEqual([{ attr: 'Test' }]);
  });
});
