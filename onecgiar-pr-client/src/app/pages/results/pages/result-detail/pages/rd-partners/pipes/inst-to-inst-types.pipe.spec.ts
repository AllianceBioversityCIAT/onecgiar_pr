import { InstToInstTypesPipe } from './inst-to-inst-types.pipe';

describe('InstToInstTypesPipe', () => {
  let pipe: InstToInstTypesPipe;

  beforeEach(() => {
    pipe = new InstToInstTypesPipe();
  });
  it('should return the input list unchanged', () => {
    const inputList = [{ name: 'Institution 1' }, { name: 'Institution 2' }];

    const transformedList = pipe.transform(inputList);

    expect(transformedList).toEqual(inputList);
  });

  it('should handle empty input list', () => {
    const emptyList: any[] = [];

    const transformedList = pipe.transform(emptyList);

    expect(transformedList).toEqual([]);
  });
});
