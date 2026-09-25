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
});
