import { FilterTargetsPipe } from './filter-targets.pipe';

describe('FilterTargetsPipe', () => {
  let pipe: FilterTargetsPipe;

  beforeEach(() => {
    pipe = new FilterTargetsPipe();
  });
  
  it('should filter the list based on impact area id', () => {
    const list = [
      { impactAreaId: 1, name: 'Target 1' },
      { impactAreaId: 2, name: 'Target 2' },
      { impactAreaId: 1, name: 'Target 3' },
    ];

    const filteredList = pipe.transform(list, 1);

    expect(filteredList.length).toBe(2);
    expect(filteredList[0].name).toBe('Target 1');
    expect(filteredList[1].name).toBe('Target 3');
  });

  it('should return an empty array if the input list is empty', () => {
    const filteredList = pipe.transform([], 1);

    expect(filteredList.length).toBe(0);
  });
});
