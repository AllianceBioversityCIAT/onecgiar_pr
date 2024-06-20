import { CountInstitutionsTypesPipe } from './count-institutions-types.pipe';

describe('CountInstitutionsTypesPipe', () => {
  let pipe: CountInstitutionsTypesPipe;

  beforeEach(() => {
    pipe = new CountInstitutionsTypesPipe();
  });
  it('should transform the list correctly', () => {
    const list = [
      {
        obj_institutions: {
          obj_institution_type_code: {
            id: 1,
            name: 'Type1'
          }
        }
      }
    ];

    const result = pipe.transform(list, 1);

    expect(result).toEqual([
      {
        count_name: 'Type1 (0)',
        count: 0
      }
    ]);
  });

  it('should handle the if condition correctly', () => {
    const list = [
      {
        obj_institutions: {
          obj_institution_type_code: {
            id: 1,
            name: 'Type1'
          }
        },
        institutions_id: 1
      },
      {
        obj_institutions: {
          obj_institution_type_code: {
            id: 2,
            name: 'Type2'
          }
        },
        institutions_id: 2
      },
      {
        obj_institutions: {
          obj_institution_type_code: {
            id: 1,
            name: 'Type1'
          }
        },
        institutions_id: 1
      }
    ];

    const result = pipe.transform(list, 1);

    expect(result).toEqual([
      { count_name: 'Type1 (2)', count: 2 },
      { count_name: 'Type2 (1)', count: 1 }
    ]);
  });
});
