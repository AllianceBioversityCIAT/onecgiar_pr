import { FilterNotificationByBilateralProjectPipe } from './filter-notification-by-bilateral-project.pipe';

describe('FilterNotificationByBilateralProjectPipe', () => {
  let pipe: FilterNotificationByBilateralProjectPipe;

  beforeEach(() => {
    pipe = new FilterNotificationByBilateralProjectPipe();
  });

  // NOTIF-T-16: fixtures now shape the real server payload — `obj_result.obj_result_by_project[]`,
  // each linking to a `clarisa_projects` row via `obj_clarisa_project.shortName`/`.fullName` — instead
  // of the old (wrong) `obj_result.result_code` shape.
  const bilateralRow = (...shortNames: string[]) => ({
    obj_result: {
      obj_result_by_project: shortNames.map(shortName => ({
        obj_clarisa_project: { shortName, fullName: `${shortName} full name` }
      }))
    }
  });

  const w1w2Row = () => ({
    obj_result: {}
  });

  it('should no-op and return the original list when projectIds is an empty array', () => {
    const list = [bilateralRow('B-A1080'), bilateralRow('B-A1090')];

    const result = pipe.transform(list, []);

    expect(result).toEqual(list);
  });

  it('should return an empty array when the list is falsy', () => {
    const result = pipe.transform(null, ['B-A1080']);

    expect(result).toEqual([]);
  });

  it('should filter a mixed bilateral/W1-W2 list, matching only the bilateral row whose project shortName matches', () => {
    const matching = bilateralRow('B-A1080');
    const otherProject = bilateralRow('B-A1090');
    const nonBilateral = w1w2Row();
    const list = [matching, otherProject, nonBilateral];

    const result = pipe.transform(list, ['B-A1080']);

    expect(result).toEqual([matching]);
  });

  it('should return no matches (not throw) when no row has that project shortName', () => {
    const list = [bilateralRow('B-A1080'), w1w2Row()];

    const result = pipe.transform(list, ['B-A9999']);

    expect(result).toEqual([]);
  });

  it('should match a row tagged to multiple bilateral projects (many-to-many join) when any linked project matches', () => {
    const multiProjectRow = bilateralRow('B-A1080', 'B-A1090');
    const list = [multiProjectRow, bilateralRow('B-A2000')];

    const result = pipe.transform(list, ['B-A1090']);

    expect(result).toEqual([multiProjectRow]);
  });

  // NOTIF-T-3 regression: pre-existing Requests-only filtering behavior is unchanged by this task.
  it('regression: still matches a Requests-tab row whose linked project shortName matches the active bilateral-project filter', () => {
    const matching = bilateralRow('B-A1080');
    const nonMatching = bilateralRow('B-A9999');

    const result = pipe.transform([matching, nonMatching], ['B-A1080']);

    expect(result).toEqual([matching]);
  });

  // NOTIF-DD-4: an Updates-tab row has `obj_result` but never `obj_result_by_project` — the
  // bilateral-project filter has no field to match on, so the row is EXCLUDED, not passed through,
  // when the filter is active.
  it('NOTIF-DD-4: excludes a field-less Updates-tab row (obj_result present, no obj_result_by_project) when the bilateral-project filter is active', () => {
    const updatesRow = {
      notification_id: 1,
      obj_result: { result_code: 'R-1', title: 'Some update', obj_version: { id: 'v1' } }
    };
    const matchingRequestsRow = bilateralRow('B-A1080');
    const list = [updatesRow, matchingRequestsRow];

    const result = pipe.transform(list, ['B-A1080']);

    expect(result).toEqual([matchingRequestsRow]);
    expect(result).not.toContain(updatesRow);
  });
});
