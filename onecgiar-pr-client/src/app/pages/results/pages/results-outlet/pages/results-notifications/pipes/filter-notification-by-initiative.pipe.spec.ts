import { FilterNotificationByInitiativePipe } from './filter-notification-by-initiative.pipe';

describe('FilterNotificationByInitiativePipe', () => {
  let pipe: FilterNotificationByInitiativePipe;

  beforeEach(() => {
    pipe = new FilterNotificationByInitiativePipe();
  });

  it('should return the original list if initiativeId is false', () => {
    const list = [
      {
        obj_shared_inititiative: {
          id: '1'
        },
        obj_owner_initiative: {
          id: '1'
        },
        obj_result: {
          obj_result_by_initiatives: [
            {
              initiative_id: '1'
            }
          ]
        }
      },
      {
        obj_shared_inititiative: {
          id: '2'
        },
        obj_owner_initiative: {
          id: '2'
        },
        obj_result: {
          obj_result_by_initiatives: [
            {
              initiative_id: '2'
            }
          ]
        }
      }
    ];

    const result = pipe.transform(list, null);

    expect(result).toEqual(list);
  });

  it('should return an empty array if the list is false', () => {
    const list = null;

    const result = pipe.transform(list, '1');

    expect(result).toEqual([]);
  });

  it('should filter the list based on shared_inititiative_id', () => {
    const list = [
      {
        obj_shared_inititiative: {
          id: '1'
        },
        obj_owner_initiative: {
          id: '1'
        },
        obj_result: {
          obj_result_by_initiatives: [
            {
              initiative_id: '1'
            }
          ]
        }
      },
      {
        obj_shared_inititiative: {
          id: '2'
        },
        obj_owner_initiative: {
          id: '2'
        },
        obj_result: {
          obj_result_by_initiatives: [
            {
              initiative_id: '2'
            }
          ]
        }
      },
      {
        obj_shared_inititiative: {
          id: '1'
        },
        obj_owner_initiative: {
          id: '1'
        },
        obj_result: {
          obj_result_by_initiatives: [
            {
              initiative_id: '1'
            }
          ]
        }
      }
    ];

    const result = pipe.transform(list, '1');

    expect(result).toEqual([
      {
        obj_shared_inititiative: {
          id: '1'
        },
        obj_owner_initiative: {
          id: '1'
        },
        obj_result: {
          obj_result_by_initiatives: [
            {
              initiative_id: '1'
            }
          ]
        }
      },
      {
        obj_shared_inititiative: {
          id: '1'
        },
        obj_owner_initiative: {
          id: '1'
        },
        obj_result: {
          obj_result_by_initiatives: [
            {
              initiative_id: '1'
            }
          ]
        }
      }
    ]);
  });

  // NOTIF-T-3 regression: pre-existing Requests-only filtering behavior (shared/owner initiative
  // match) is unchanged by this task — same assertion as 'should filter the list based on
  // shared_inititiative_id' above, kept explicit per this task's Definition of Done.
  it('regression: still matches Requests-tab rows via obj_shared_inititiative/obj_owner_initiative/obj_result_by_initiatives', () => {
    const matching = {
      obj_shared_inititiative: { id: '7' },
      obj_owner_initiative: { id: '7' },
      obj_result: { obj_result_by_initiatives: [{ initiative_id: '7' }] }
    };
    const nonMatching = {
      obj_shared_inititiative: { id: '8' },
      obj_owner_initiative: { id: '8' },
      obj_result: { obj_result_by_initiatives: [{ initiative_id: '8' }] }
    };

    const result = pipe.transform([matching, nonMatching], '7');

    expect(result).toEqual([matching]);
  });

  // NOTIF-DD-4-adjacent: an Updates-tab row has neither obj_shared_inititiative nor
  // obj_owner_initiative (Requests-only fields) and, per NOTIF-P-2, DOES carry
  // obj_result.obj_result_by_initiatives — but a row that arrives without any obj_result at all
  // must still be excluded (not throw) when the initiative filter is active.
  it('excludes a field-less Updates-tab row (no obj_result, no shared/owner initiative) when the initiative filter is active, without throwing', () => {
    const fieldLessUpdateRow = { notification_id: 1 };
    const matchingRequestsRow = {
      obj_shared_inititiative: { id: '7' },
      obj_owner_initiative: { id: '7' },
      obj_result: { obj_result_by_initiatives: [{ initiative_id: '7' }] }
    };

    let result;
    expect(() => {
      result = pipe.transform([fieldLessUpdateRow, matchingRequestsRow] as any, '7');
    }).not.toThrow();

    expect(result).toEqual([matchingRequestsRow]);
    expect(result).not.toContain(fieldLessUpdateRow);
  });

  // Regression sibling: an Updates-tab row DOES carry obj_result.obj_result_by_initiatives
  // (NOTIF-P-2) and must still match the initiative filter like any Requests row.
  it('matches an Updates-tab row via obj_result.obj_result_by_initiatives when it has no shared/owner initiative fields', () => {
    const updatesRow = {
      notification_id: 1,
      obj_result: { result_code: 'R-1', title: 'Some update', obj_result_by_initiatives: [{ initiative_id: '7' }] }
    };

    const result = pipe.transform([updatesRow] as any, '7');

    expect(result).toEqual([updatesRow]);
  });

  // NOTIF-T-6 fix (flagged by NOTIF-T-3's Reviewer): `obj_result_by_initiatives?.[0].initiative_id`
  // was missing an optional chain after `[0]` — a row with `obj_result` present but
  // `obj_result_by_initiatives` an EMPTY array (not missing) used to throw
  // "Cannot read properties of undefined" instead of simply not matching.
  it('does not throw when obj_result_by_initiatives is an empty array (present but empty), and excludes that row', () => {
    const emptyInitiativesRow = {
      obj_result: { result_code: 'R-2', title: 'No initiatives', obj_result_by_initiatives: [] }
    };
    const matchingRow = {
      obj_shared_inititiative: { id: '7' },
      obj_owner_initiative: { id: '7' },
      obj_result: { obj_result_by_initiatives: [{ initiative_id: '7' }] }
    };

    let result;
    expect(() => {
      result = pipe.transform([emptyInitiativesRow, matchingRow] as any, '7');
    }).not.toThrow();

    expect(result).toEqual([matchingRow]);
  });
});
