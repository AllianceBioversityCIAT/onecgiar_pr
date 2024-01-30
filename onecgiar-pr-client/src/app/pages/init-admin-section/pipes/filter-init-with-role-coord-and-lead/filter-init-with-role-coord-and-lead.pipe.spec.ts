import { FilterInitWithRoleCoordAndLeadPipe } from './filter-init-with-role-coord-and-lead.pipe';

describe('FilterInitWithRoleCoordAndLeadPipe', () => {
  let pipe: FilterInitWithRoleCoordAndLeadPipe;

  beforeEach(() => {
    pipe = new FilterInitWithRoleCoordAndLeadPipe();
  });

  it('transforms the list to include only items with role "Lead" or "Coordinator"', () => {
    const inputList = [
      { role: 'Lead', name: 'Initiative 1' },
      { role: 'Coordinator', name: 'Initiative 2' },
      { role: 'Support', name: 'Initiative 3' },
    ];

    const transformedList = pipe.transform(inputList);

    expect(transformedList).toEqual([
      { role: 'Lead', name: 'Initiative 1' },
      { role: 'Coordinator', name: 'Initiative 2' },
    ]);
  });

  it('returns an empty array if the input list is falsy or has no items with role "Lead" or "Coordinator"', () => {
    const emptyList = pipe.transform([]);
    expect(emptyList).toEqual([]);

    const falsyList = pipe.transform(null);
    expect(falsyList).toEqual([]);

    const noMatchingItems = pipe.transform([
      { role: 'Support', name: 'Initiative 1' },
      { role: 'Support', name: 'Initiative 2' },
    ]);
    expect(noMatchingItems).toEqual([]);
  });
});
