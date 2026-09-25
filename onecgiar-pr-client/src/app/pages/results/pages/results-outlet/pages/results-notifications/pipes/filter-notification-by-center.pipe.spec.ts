import { FilterNotificationByCenterPipe } from './filter-notification-by-center.pipe';

describe('FilterNotificationByCenterPipe', () => {
  let pipe: FilterNotificationByCenterPipe;

  beforeEach(() => {
    pipe = new FilterNotificationByCenterPipe();
  });

  const bilateralRow = (centerId: string) => ({
    obj_result: {
      result_center_array: [
        {
          clarisa_center_object: {
            clarisa_institution: {
              id: centerId,
              acronym: `C${centerId}`
            }
          }
        }
      ]
    }
  });

  const w1w2Row = () => ({
    obj_result: {}
  });

  it('should no-op and return the original list when centerIds is an empty array', () => {
    const list = [bilateralRow('1'), bilateralRow('2')];

    const result = pipe.transform(list, []);

    expect(result).toEqual(list);
  });

  it('should return an empty array when the list is falsy', () => {
    const result = pipe.transform(null, ['1']);

    expect(result).toEqual([]);
  });

  it('should filter a mixed bilateral/W1-W2 list, matching only the bilateral row whose center id matches', () => {
    const matching = bilateralRow('1');
    const otherCenter = bilateralRow('2');
    const nonBilateral = w1w2Row();
    const list = [matching, otherCenter, nonBilateral];

    const result = pipe.transform(list, ['1']);

    expect(result).toEqual([matching]);
  });

  it('should return no matches (not throw) when no row has that center id', () => {
    const list = [bilateralRow('1'), w1w2Row()];

    const result = pipe.transform(list, ['999']);

    expect(result).toEqual([]);
  });
});
