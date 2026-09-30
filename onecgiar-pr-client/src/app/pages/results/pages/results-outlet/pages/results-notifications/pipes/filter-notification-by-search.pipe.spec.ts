import { FilterNotificationBySearchPipe } from './filter-notification-by-search.pipe';

describe('FilterNotificationBySearchPipe', () => {
  let pipe: FilterNotificationBySearchPipe;

  beforeEach(() => {
    pipe = new FilterNotificationBySearchPipe();
  });

  it('should return the original list if no search filter is provided', () => {
    const list = [{ obj_result: { result_code: '001', title: 'Title One' } }, { obj_result: { result_code: '002', title: 'Title Two' } }];
    expect(pipe.transform(list, '')).toEqual(list);
  });

  it('should filter the list based on the search filter', () => {
    const list = [
      {
        obj_result: { result_code: '001', title: 'Title One' },
        obj_requested_by: { first_name: 'Jane1', last_name: 'Doe1' },
        obj_shared_inititiative: { official_code: '01' },
        obj_owner_initiative: { official_code: '02' },
        is_map_to_toc: false
      },
      {
        obj_result: { result_code: '001', title: 'Title One' },
        obj_requested_by: { first_name: 'Jane2', last_name: 'Doe2' },
        obj_shared_inititiative: { official_code: '01' },
        obj_owner_initiative: { official_code: '02' },
        is_map_to_toc: false
      }
    ];
    const expected = [
      {
        obj_result: { result_code: '001', title: 'Title One' },
        obj_requested_by: { first_name: 'Jane1', last_name: 'Doe1' },
        obj_shared_inititiative: { official_code: '01' },
        obj_owner_initiative: { official_code: '02' },
        is_map_to_toc: false,
        joinAll: 'Jane1 Doe1 from 02 has requested inclusion of 01 as a contributor to result 001 - Title One'
      },
      {
        obj_result: { result_code: '001', title: 'Title One' },
        obj_requested_by: { first_name: 'Jane2', last_name: 'Doe2' },
        obj_shared_inititiative: { official_code: '01' },
        obj_owner_initiative: { official_code: '02' },
        is_map_to_toc: false,
        joinAll: 'Jane2 Doe2 from 02 has requested inclusion of 01 as a contributor to result 001 - Title One'
      }
    ];
    expect(pipe.transform(list, 'Title')).toEqual(expected);
  });

  it('should return an empty list if no items match the search filter', () => {
    const list = [{ obj_result: { result_code: '001', title: 'Title One' } }, { obj_result: { result_code: '002', title: 'Title Two' } }];
    expect(pipe.transform(list, 'Nonexistent')).toEqual([]);
  });

  it('should perform a case-insensitive search', () => {
    const list = [
      {
        obj_result: { result_code: '001', title: 'Title One' },
        obj_requested_by: { first_name: 'Jane1', last_name: 'Doe1' },
        obj_shared_inititiative: { official_code: '01' },
        obj_owner_initiative: { official_code: '02' },
        is_map_to_toc: false
      },
      {
        obj_result: { result_code: '001', title: 'Title One' },
        obj_requested_by: { first_name: 'Jane2', last_name: 'Doe2' },
        obj_shared_inititiative: { official_code: '01' },
        obj_owner_initiative: { official_code: '02' },
        is_map_to_toc: false
      }
    ];

    const expected = [
      {
        obj_result: { result_code: '001', title: 'Title One' },
        obj_requested_by: { first_name: 'Jane1', last_name: 'Doe1' },
        obj_shared_inititiative: { official_code: '01' },
        obj_owner_initiative: { official_code: '02' },
        is_map_to_toc: false,
        joinAll: 'Jane1 Doe1 from 02 has requested inclusion of 01 as a contributor to result 001 - Title One'
      },
      {
        obj_result: { result_code: '001', title: 'Title One' },
        obj_requested_by: { first_name: 'Jane2', last_name: 'Doe2' },
        obj_shared_inititiative: { official_code: '01' },
        obj_owner_initiative: { official_code: '02' },
        is_map_to_toc: false,
        joinAll: 'Jane2 Doe2 from 02 has requested inclusion of 01 as a contributor to result 001 - Title One'
      }
    ];

    expect(pipe.transform(list, 'title')).toEqual(expected);
  });

  it('should handle the isUpdateTab flag correctly', () => {
    const list = [
      {
        obj_result: { result_code: '001', title: 'Title One' },
        obj_shared_inititiative: { official_code: '01' },
        obj_owner_initiative: { official_code: '02' },
        notification_type: 1,
        obj_emitter_user: { first_name: 'John', last_name: 'Doe' }
      },
      {
        obj_result: { result_code: '002', title: 'Title Two' },
        obj_shared_inititiative: { official_code: '01' },
        obj_owner_initiative: { official_code: '02' },
        notification_type: 3
      }
    ];
    const expected = [
      {
        obj_result: { result_code: '001', title: 'Title One' },
        obj_shared_inititiative: { official_code: '01' },
        obj_owner_initiative: { official_code: '02' },
        notification_type: 1,
        obj_emitter_user: { first_name: 'John', last_name: 'Doe' },
        joinAll: 'John Doe has submitted the result 001 - Title One'
      },
      {
        obj_result: { result_code: '002', title: 'Title Two' },
        obj_shared_inititiative: { official_code: '01' },
        obj_owner_initiative: { official_code: '02' },
        notification_type: 3,
        joinAll: 'The result 002 - Title Two was successfully Quality Assessed.'
      }
    ];
    expect(pipe.transform(list, 'Title', true)).toEqual(expected);
  });

  it('should create the correct string for notification types 1', () => {
    const item = {
      obj_result: { result_code: '001', title: 'Title One' },
      notification_type: 1,
      obj_emitter_user: { first_name: 'John', last_name: 'Doe' }
    };
    const result = pipe['createUpdateTabString'](item);
    expect(result).toBe('John Doe has submitted the result 001 - Title One');
  });

  it('should create the correct string for notification types 2', () => {
    const item = {
      obj_result: { result_code: '001', title: 'Title One' },
      notification_type: 2,
      obj_emitter_user: { first_name: 'John', last_name: 'Doe' }
    };
    const result = pipe['createUpdateTabString'](item);
    expect(result).toBe('John Doe has unsubmitted the result 001 - Title One');
  });

  it('should create the correct string for other notification types', () => {
    const item = {
      obj_result: { result_code: '001', title: 'Title One' },
      notification_type: 3
    };
    const result = pipe['createUpdateTabString'](item);
    expect(result).toBe('The result 001 - Title One was successfully Quality Assessed.');
  });

  it('should create the correct default string when is_map_to_toc is true', () => {
    const item = {
      obj_result: { result_code: '001', title: 'Title One' },
      obj_requested_by: { first_name: 'Jane', last_name: 'Doe' },
      obj_shared_inititiative: { official_code: '01' },
      obj_owner_initiative: { official_code: '02' },
      is_map_to_toc: true
    };
    const result = pipe['createDefaultString'](item);
    expect(result).toBe('Jane Doe from 01 has requested contribution to result 001 - Title One submitted by 02');
  });

  it('should create the correct default string when is_map_to_toc is false', () => {
    const item = {
      obj_result: { result_code: '001', title: 'Title One' },
      obj_requested_by: { first_name: 'Jane', last_name: 'Doe' },
      obj_shared_inititiative: { official_code: '01' },
      obj_owner_initiative: { official_code: '02' },
      is_map_to_toc: false
    };
    const result = pipe['createDefaultString'](item);
    expect(result).toBe('Jane Doe from 02 has requested inclusion of 01 as a contributor to result 001 - Title One');
  });

  // NOTIF-T-3 regression: pre-existing Requests-only search behavior (createDefaultString branch,
  // isUpdateTab=false) is unchanged by this task.
  it('regression: still matches a Requests-tab row by result title when isUpdateTab is false', () => {
    const list = [
      {
        obj_result: { result_code: '001', title: 'Findable Title' },
        obj_requested_by: { first_name: 'Jane', last_name: 'Doe' },
        obj_shared_inititiative: { official_code: '01' },
        obj_owner_initiative: { official_code: '02' },
        is_map_to_toc: false
      },
      {
        obj_result: { result_code: '002', title: 'Other Title' },
        obj_requested_by: { first_name: 'Jane', last_name: 'Doe' },
        obj_shared_inititiative: { official_code: '01' },
        obj_owner_initiative: { official_code: '02' },
        is_map_to_toc: false
      }
    ];

    const result = pipe.transform(list, 'Findable');

    expect(result).toHaveLength(1);
    expect(result[0].obj_result.result_code).toBe('001');
  });

  // NOTIF-DD-4-adjacent: unlike the center/bilateral-project pipes, the search pipe does not key on
  // a field that Updates rows lack — `buildResultNotificationText`/`createDefaultString` both use
  // optional chaining and produce a (possibly partial) string for any row shape. A field-less
  // Updates-tab row therefore does not crash; it simply doesn't match a search term it has no text
  // for, and still doesn't leak into a filtered result that should exclude it.
  it('does not throw for a field-less Updates-tab row (no obj_requested_by/obj_shared_inititiative) and excludes it from an unrelated search match', () => {
    const fieldLessUpdateRow: any = { obj_result: { result_code: '003', title: 'Bare update' } };
    const requestsRow = {
      obj_result: { result_code: '001', title: 'Findable Title' },
      obj_requested_by: { first_name: 'Jane', last_name: 'Doe' },
      obj_shared_inititiative: { official_code: '01' },
      obj_owner_initiative: { official_code: '02' },
      is_map_to_toc: false
    };

    let result;
    expect(() => {
      result = pipe.transform([fieldLessUpdateRow, requestsRow], 'Findable', false);
    }).not.toThrow();

    expect(result).toHaveLength(1);
    expect(result[0].obj_result.result_code).toBe('001');
  });

  // NOTIF-T-6 fix (flagged by NOTIF-T-3's Reviewer): on a genuinely MIXED unified list, each row
  // must pick its own text-builder branch from its own `source` field, not one `isUpdateTab` flag
  // applied to the whole list.
  describe('per-row branching on a mixed unified list (NOTIF-T-6)', () => {
    it('uses the update-tab builder for a source:"update" row and the default builder for a source:"request" row, in the SAME call, regardless of the isUpdateTab flag passed', () => {
      const updateRow = {
        source: 'update',
        obj_result: { result_code: '003', title: 'Update Title' },
        notification_type: 1,
        obj_emitter_user: { first_name: 'John', last_name: 'Doe' }
      };
      const requestRow = {
        source: 'request',
        obj_result: { result_code: '001', title: 'Request Title' },
        obj_requested_by: { first_name: 'Jane', last_name: 'Doe' },
        obj_shared_inititiative: { official_code: '01' },
        obj_owner_initiative: { official_code: '02' },
        is_map_to_toc: false
      };

      // isUpdateTab passed as false (the "All"/mixed-tab call) — must not force the request row
      // into the update-tab builder, nor the update row into the default builder.
      const result = pipe.transform([updateRow, requestRow], 'Title', false);

      expect(result).toHaveLength(2);
      expect(result[0].joinAll).toBe('John Doe has submitted the result 003 - Update Title');
      expect(result[1].joinAll).toBe('Jane Doe from 02 has requested inclusion of 01 as a contributor to result 001 - Request Title');
    });

    it('falls back to the isUpdateTab flag for a row with no source field (pre-existing, un-tagged call sites)', () => {
      const untaggedUpdateShapedRow = {
        obj_result: { result_code: '004', title: 'Legacy Update' },
        notification_type: 3
      };

      const result = pipe.transform([untaggedUpdateShapedRow], 'Legacy', true);

      expect(result).toHaveLength(1);
      expect(result[0].joinAll).toBe('The result 004 - Legacy Update was successfully Quality Assessed.');
    });
  });
});
