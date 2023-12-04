import { SimilarResultsPipe } from './similar-results.pipe';

describe('SimilarResultsPipe', () => {
  let pipe: SimilarResultsPipe;

  beforeEach(() => {
    pipe = new SimilarResultsPipe();
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should return an empty array if the input list is undefined or empty', () => {
    const undefinedList = undefined;
    const emptyList = [];

    const resultUndefined = pipe.transform(undefinedList, 'word');
    const resultEmpty = pipe.transform(emptyList, 'word');

    expect(resultUndefined).toEqual([]);
    expect(resultEmpty).toEqual([]);
  });

  it('should return an empty array if the search word is undefined or empty', () => {
    const list = [{ title: 'Example 1' }, { title: 'Example 2' }];

    const resultUndefined = pipe.transform(list, undefined);
    const resultEmpty = pipe.transform(list, '');

    expect(resultUndefined).toEqual([]);
    expect(resultEmpty).toEqual([]);
  });

  it('should filter the list based on the search word (case-insensitive)', () => {
    const list = [
      { title: 'Example 1' },
      { title: 'Example 2' },
      { title: 'Another Example' },
    ];

    const result = pipe.transform(list, 'exa');

    expect(result).toEqual(list);
  });
});
