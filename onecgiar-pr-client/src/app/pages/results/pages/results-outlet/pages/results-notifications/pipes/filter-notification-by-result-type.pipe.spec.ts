import { FilterNotificationByResultTypePipe } from './filter-notification-by-result-type.pipe';

describe('FilterNotificationByResultTypePipe', () => {
  let pipe: FilterNotificationByResultTypePipe;

  beforeEach(() => {
    pipe = new FilterNotificationByResultTypePipe();
  });

  const requestRow = (typeName: string) => ({
    source: 'request',
    obj_result: { obj_result_type: { name: typeName } }
  });

  const updateRow = (typeName: string) => ({
    source: 'update',
    obj_result: { obj_result_type: { name: typeName } }
  });

  it('should no-op and return the original list when the selected values array is empty', () => {
    const list = [requestRow('Innovation Development'), requestRow('Policy Change')];

    const result = pipe.transform(list, []);

    expect(result).toEqual(list);
  });

  it('should return an empty array when the list is falsy', () => {
    const result = pipe.transform(null, ['Innovation Development']);

    expect(result).toEqual([]);
  });

  // Falsifier (NOTIF-T-11 verification): filtering by Result type excludes non-matching rows,
  // across both Requests and Updates sources.
  it('excludes non-matching rows from both Requests and Updates sources', () => {
    const matchingRequest = requestRow('Innovation Development');
    const matchingUpdate = updateRow('Innovation Development');
    const nonMatchingRequest = requestRow('Policy Change');
    const nonMatchingUpdate = updateRow('Capacity Sharing for Development');

    const result = pipe.transform([matchingRequest, matchingUpdate, nonMatchingRequest, nonMatchingUpdate], ['Innovation Development']);

    expect(result).toEqual([matchingRequest, matchingUpdate]);
  });

  it('matches when any of several selected result types is present', () => {
    const matching = requestRow('Policy Change');
    const nonMatching = requestRow('Knowledge Product');

    const result = pipe.transform([matching, nonMatching], ['Innovation Development', 'Policy Change']);

    expect(result).toEqual([matching]);
  });

  // NOTIF-DD-4: a row missing obj_result.obj_result_type.name is excluded, not passed through,
  // without throwing.
  it('excludes a field-less row (no obj_result, no obj_result_type) when the result-type filter is active, without throwing', () => {
    const fieldLessRow = { notification_id: 1 };
    const matching = requestRow('Innovation Development');

    let result;
    expect(() => {
      result = pipe.transform([fieldLessRow, matching] as any, ['Innovation Development']);
    }).not.toThrow();

    expect(result).toEqual([matching]);
    expect(result).not.toContain(fieldLessRow);
  });

  it('does not throw when obj_result_type is present but empty (no name), and excludes that row', () => {
    const emptyTypeRow = { obj_result: { obj_result_type: {} } };
    const matching = requestRow('Innovation Development');

    let result;
    expect(() => {
      result = pipe.transform([emptyTypeRow, matching] as any, ['Innovation Development']);
    }).not.toThrow();

    expect(result).toEqual([matching]);
  });
});
