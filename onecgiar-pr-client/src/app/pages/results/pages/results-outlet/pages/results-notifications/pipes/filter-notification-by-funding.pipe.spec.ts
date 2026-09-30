import { FilterNotificationByFundingPipe } from './filter-notification-by-funding.pipe';

describe('FilterNotificationByFundingPipe', () => {
  let pipe: FilterNotificationByFundingPipe;

  beforeEach(() => {
    pipe = new FilterNotificationByFundingPipe();
  });

  const requestRow = (sourceName: 'W1/W2' | 'W3/Bilaterals') => ({
    source: 'request',
    obj_result: { source_name: sourceName }
  });

  const updateRow = (sourceName: 'W1/W2' | 'W3/Bilaterals') => ({
    source: 'update',
    obj_result: { source_name: sourceName }
  });

  it('should no-op and return the original list when the selected values array is empty', () => {
    const list = [requestRow('W1/W2'), requestRow('W3/Bilaterals')];

    const result = pipe.transform(list, []);

    expect(result).toEqual(list);
  });

  it('should return an empty array when the list is falsy', () => {
    const result = pipe.transform(null, ['W3/Bilaterals']);

    expect(result).toEqual([]);
  });

  // Falsifier (NOTIF-T-11 verification): filtering by Funding = "W3/Bilateral" excludes W1/W2 rows
  // from both Requests and Updates sources.
  it('excludes W1/W2 rows from both Requests and Updates sources when filtering by Funding = W3/Bilaterals', () => {
    const bilateralRequest = requestRow('W3/Bilaterals');
    const bilateralUpdate = updateRow('W3/Bilaterals');
    const w1w2Request = requestRow('W1/W2');
    const w1w2Update = updateRow('W1/W2');

    const result = pipe.transform([bilateralRequest, bilateralUpdate, w1w2Request, w1w2Update], ['W3/Bilaterals']);

    expect(result).toEqual([bilateralRequest, bilateralUpdate]);
  });

  it('matches a W1/W2 row when W1/W2 is selected', () => {
    const matching = requestRow('W1/W2');
    const nonMatching = requestRow('W3/Bilaterals');

    const result = pipe.transform([matching, nonMatching], ['W1/W2']);

    expect(result).toEqual([matching]);
  });

  // NOTIF-DD-4: a row missing obj_result.source_name entirely (no obj_result at all) is excluded,
  // not passed through, without throwing.
  it('excludes a field-less row (no obj_result, no source_name) when the funding filter is active, without throwing', () => {
    const fieldLessRow = { notification_id: 1 };
    const matching = requestRow('W3/Bilaterals');

    let result;
    expect(() => {
      result = pipe.transform([fieldLessRow, matching] as any, ['W3/Bilaterals']);
    }).not.toThrow();

    expect(result).toEqual([matching]);
    expect(result).not.toContain(fieldLessRow);
  });
});
