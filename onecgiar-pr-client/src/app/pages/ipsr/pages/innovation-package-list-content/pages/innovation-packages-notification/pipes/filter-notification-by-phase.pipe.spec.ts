import { FilterNotificationByPhasePipe } from './filter-notification-by-phase.pipe';

describe('FilterNotificationByPhasePipe', () => {
  let pipe: FilterNotificationByPhasePipe;

  beforeEach(() => {
    pipe = new FilterNotificationByPhasePipe();
  });

  it('should return the original list if phaseId is false', () => {
    const list = [{ version_id: '1' }, { version_id: '2' }];

    const result = pipe.transform(list, '');

    expect(result).toEqual(list);
  });

  it('should return an empty array if the list is false', () => {
    const list = null;

    const result = pipe.transform(list, '1');

    expect(result).toEqual([]);
  });

  it('should filter the list based on version_id', () => {
    const list = [{ version_id: '1' }, { version_id: '2' }, { version_id: '1' }];

    const result = pipe.transform(list, '1');

    expect(result).toEqual([{ version_id: '1' }, { version_id: '1' }]);
  });
});
