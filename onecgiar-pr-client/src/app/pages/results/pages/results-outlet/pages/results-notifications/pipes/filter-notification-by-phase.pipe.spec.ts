import { FilterNotificationByPhasePipe } from './filter-notification-by-phase.pipe';

describe('FilterNotificationByPhasePipe', () => {
  let pipe: FilterNotificationByPhasePipe;

  beforeEach(() => {
    pipe = new FilterNotificationByPhasePipe();
  });

  it('should return the original list if phaseId is false', () => {
    const list = [
      {
        obj_result: {
          obj_version: {
            id: '1'
          }
        }
      },
      {
        obj_result: {
          obj_version: {
            id: '2'
          }
        }
      }
    ];

    const result = pipe.transform(list, '');

    expect(result).toEqual(list);
  });

  it('should return an empty array if the list is false', () => {
    const list = null;

    const result = pipe.transform(list, '1');

    expect(result).toEqual([]);
  });

  it('should filter the list based on version_id', () => {
    const list = [
      {
        obj_result: {
          obj_version: {
            id: '1'
          }
        }
      },
      {
        obj_result: {
          obj_version: {
            id: '2'
          }
        }
      },
      {
        obj_result: {
          obj_version: {
            id: '1'
          }
        }
      }
    ];

    const result = pipe.transform(list, '1');

    expect(result).toEqual([
      {
        obj_result: {
          obj_version: {
            id: '1'
          }
        }
      },
      {
        obj_result: {
          obj_version: {
            id: '1'
          }
        }
      }
    ]);
  });

  // NOTIF-T-3 regression: pre-existing Requests-only filtering behavior (obj_version.id match) is
  // unchanged by this task.
  it('regression: still matches a Requests-tab row whose obj_version.id matches the active phase filter', () => {
    const matching = { obj_result: { obj_version: { id: '3' } } };
    const nonMatching = { obj_result: { obj_version: { id: '4' } } };

    const result = pipe.transform([matching, nonMatching], '3');

    expect(result).toEqual([matching]);
  });

  // NOTIF-DD-4-adjacent: a field-less Updates-tab row (no obj_result at all) must be excluded
  // (not throw) when the phase filter is active. Per NOTIF-P-2, a real Updates row DOES carry
  // obj_result.obj_version — the second test below proves that row still matches like a Requests row.
  it('excludes a field-less Updates-tab row (no obj_result) when the phase filter is active, without throwing', () => {
    const fieldLessUpdateRow = { notification_id: 1 };
    const matchingRequestsRow = { obj_result: { obj_version: { id: '3' } } };

    let result;
    expect(() => {
      result = pipe.transform([fieldLessUpdateRow, matchingRequestsRow] as any, '3');
    }).not.toThrow();

    expect(result).toEqual([matchingRequestsRow]);
    expect(result).not.toContain(fieldLessUpdateRow);
  });

  it('matches an Updates-tab row via obj_result.obj_version like any Requests row (NOTIF-P-2)', () => {
    const updatesRow = {
      notification_id: 1,
      obj_result: { result_code: 'R-1', title: 'Some update', obj_version: { id: '3' } }
    };

    const result = pipe.transform([updatesRow] as any, '3');

    expect(result).toEqual([updatesRow]);
  });
});
