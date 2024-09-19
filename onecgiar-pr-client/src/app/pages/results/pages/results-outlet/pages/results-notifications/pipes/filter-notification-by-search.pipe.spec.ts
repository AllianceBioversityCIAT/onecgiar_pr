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
        obj_shared_inititiative: { official_code: '01' },
        obj_owner_initiative: { official_code: '02' }
      },
      {
        obj_result: { result_code: '002', title: 'Title Two' },
        obj_shared_inititiative: { official_code: '01' },
        obj_owner_initiative: { official_code: '02' }
      },
      {
        obj_result: { result_code: '003', title: 'Another Title' },
        obj_shared_inititiative: { official_code: '01' },
        obj_owner_initiative: { official_code: '02' }
      }
    ];
    const expected = [
      {
        obj_result: { result_code: '001', title: 'Title One' },
        obj_shared_inititiative: { official_code: '01' },
        obj_owner_initiative: { official_code: '02' },
        joinAll: '001 - Title One - 01 - 02'
      },
      {
        obj_result: { result_code: '002', title: 'Title Two' },
        obj_shared_inititiative: { official_code: '01' },
        obj_owner_initiative: { official_code: '02' },
        joinAll: '002 - Title Two - 01 - 02'
      },
      {
        obj_result: { result_code: '003', title: 'Another Title' },
        obj_shared_inititiative: { official_code: '01' },
        obj_owner_initiative: { official_code: '02' },
        joinAll: '003 - Another Title - 01 - 02'
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
        obj_shared_inititiative: { official_code: '01' },
        obj_owner_initiative: { official_code: '02' }
      },
      {
        obj_result: { result_code: '002', title: 'Title Two' },
        obj_shared_inititiative: { official_code: '01' },
        obj_owner_initiative: { official_code: '02' }
      }
    ];
    const expected = [
      {
        obj_result: { result_code: '001', title: 'Title One' },
        obj_shared_inititiative: { official_code: '01' },
        obj_owner_initiative: { official_code: '02' },
        joinAll: '001 - Title One - 01 - 02'
      },
      {
        obj_result: { result_code: '002', title: 'Title Two' },
        obj_shared_inititiative: { official_code: '01' },
        obj_owner_initiative: { official_code: '02' },
        joinAll: '002 - Title Two - 01 - 02'
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

  it('should create the correct default string', () => {
    const item = {
      obj_result: { result_code: '001', title: 'Title One' },
      obj_shared_inititiative: { official_code: '01' },
      obj_owner_initiative: { official_code: '02' }
    };
    const result = pipe['createDefaultString'](item);
    expect(result).toBe('001 - Title One - 01 - 02');
  });
});
