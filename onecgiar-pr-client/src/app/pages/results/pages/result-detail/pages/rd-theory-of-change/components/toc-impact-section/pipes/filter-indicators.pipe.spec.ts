import { FilterIndicatorsPipe } from './filter-indicators.pipe';

describe('FilterIndicatorsPipe', () => {
  let pipe: FilterIndicatorsPipe;

  beforeEach(() => {
    pipe = new FilterIndicatorsPipe();
  });

  it('should filter the list based on impact area id', () => {
    const list = [
      { impact_area_id: 1, name: 'Indicator 1' },
      { impact_area_id: 2, name: 'Indicator 2' },
      { impact_area_id: 1, name: 'Indicator 3' },
    ];

    const filteredList = pipe.transform(list, 1);

    expect(filteredList.length).toBe(2);
    expect(filteredList[0].name).toBe('Indicator 1');
    expect(filteredList[1].name).toBe('Indicator 3');
  });

  it('should return an empty array if the input list is empty', () => {
    const filteredList = pipe.transform([], 1);

    expect(filteredList.length).toBe(0);
  });
});
