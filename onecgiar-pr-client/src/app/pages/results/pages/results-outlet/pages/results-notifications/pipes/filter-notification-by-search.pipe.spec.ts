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
});
