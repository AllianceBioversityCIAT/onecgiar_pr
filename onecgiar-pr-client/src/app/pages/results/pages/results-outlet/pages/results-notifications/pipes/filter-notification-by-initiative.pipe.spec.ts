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
});
