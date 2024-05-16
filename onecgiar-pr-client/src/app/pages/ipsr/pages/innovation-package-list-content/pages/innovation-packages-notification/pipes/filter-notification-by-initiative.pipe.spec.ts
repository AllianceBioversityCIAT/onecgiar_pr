import { FilterNotificationByInitiativePipe } from './filter-notification-by-initiative.pipe';

describe('FilterNotificationByInitiativePipe', () => {
  let pipe: FilterNotificationByInitiativePipe;

  beforeEach(() => {
    pipe = new FilterNotificationByInitiativePipe();
  });

  it('should return the original list if initiativeId is false', () => {
    const list = [{ shared_inititiative_id: '1' }, { shared_inititiative_id: '2' }];

    const result = pipe.transform(list, null);

    expect(result).toEqual(list);
  });

  it('should return an empty array if the list is false', () => {
    const list = null;

    const result = pipe.transform(list, '1');

    expect(result).toEqual([]);
  });

  it('should filter the list based on shared_inititiative_id', () => {
    const list = [{ shared_inititiative_id: '1' }, { shared_inititiative_id: '2' }, { shared_inititiative_id: '1' }];

    const result = pipe.transform(list, '1');

    expect(result).toEqual([{ shared_inititiative_id: '1' }, { shared_inititiative_id: '1' }]);
  });
});
