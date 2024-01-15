import { OutcomeLevelFilterPipe } from './outcome-level-filter.pipe';

describe('OutcomeLevelFilterPipe', () => {
  let pipe: OutcomeLevelFilterPipe;

  beforeEach(() => {
    pipe = new OutcomeLevelFilterPipe();
  });

  it('should filter the list based on toc_level_id', () => {
    const list = [
      { toc_level_id: 1, name: 'Item 1' },
      { toc_level_id: 2, name: 'Item 2' },
      { toc_level_id: 3, name: 'Item 3' },
    ];

    const filteredList = pipe.transform(list, 2);

    expect(filteredList.length).toBe(2);
    expect(filteredList).toContain(list[1]);
    expect(filteredList).toContain(list[2]);
  });

  it('should return an empty array if the input list is empty', () => {
    const emptyList = [];

    const filteredList = pipe.transform(emptyList, 2);

    expect(filteredList.length).toBe(0);
  });
});
