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

  // NOTIF-T-3 regression: pre-existing Requests-only filtering behavior is unchanged by this task.
  it('regression: still matches a Requests-tab row whose result_center_array[0] matches the active center filter', () => {
    const matching = bilateralRow('10');
    const nonMatching = bilateralRow('20');

    const result = pipe.transform([matching, nonMatching], ['10']);

    expect(result).toEqual([matching]);
  });

  // NOTIF-DD-4: an Updates-tab row has `obj_result` (result_code/title/etc.) but never
  // `result_center_array` — the center filter has no field to match on, so the row is EXCLUDED,
  // not passed through, when the filter is active.
  it('NOTIF-DD-4: excludes a field-less Updates-tab row (obj_result present, no result_center_array) when the center filter is active', () => {
    const updatesRow = {
      notification_id: 1,
      obj_result: { result_code: 'R-1', title: 'Some update', obj_version: { id: 'v1' } }
    };
    const matchingRequestsRow = bilateralRow('10');
    const list = [updatesRow, matchingRequestsRow];

    const result = pipe.transform(list, ['10']);

    expect(result).toEqual([matchingRequestsRow]);
    expect(result).not.toContain(updatesRow);
  });
});
