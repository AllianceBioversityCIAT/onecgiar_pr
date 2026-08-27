import {
  filterOutAvisaFromGroupedInitiativeOptions,
  filterOutAvisaFromInitiativeEntityGroups,
  filterOutAvisaInitiatives,
  isAvisaInitiative
} from './avisa-initiative.util';

describe('avisa-initiative.util', () => {
  it('should identify AVISA by official code variants', () => {
    expect(isAvisaInitiative({ official_code: 'SGP-02' })).toBe(true);
    expect(isAvisaInitiative({ official_code: 'SGP02' })).toBe(true);
    expect(isAvisaInitiative({ official_code: 'sgp-02' })).toBe(true);
  });

  it('should identify AVISA by initiative id', () => {
    expect(isAvisaInitiative({ initiative_id: 41 })).toBe(true);
    expect(isAvisaInitiative({ id: 41 })).toBe(true);
  });

  it('should not flag other initiatives', () => {
    expect(isAvisaInitiative({ official_code: 'SP01', initiative_id: 10 })).toBe(false);
  });

  it('should filter AVISA from contributing initiative lists', () => {
    const list = [
      { id: 10, official_code: 'SP01' },
      { id: 41, official_code: 'SGP-02' },
      { id: 20, official_code: 'SP02' }
    ];

    expect(filterOutAvisaInitiatives(list)).toEqual([
      { id: 10, official_code: 'SP01' },
      { id: 20, official_code: 'SP02' }
    ]);
  });

  it('should filter AVISA entities from user-management groups', () => {
    const groups = [
      {
        name: 'P25',
        entities: [
          { initiative_id: 10, official_code: 'SP01' },
          { initiative_id: 41, official_code: 'SGP-02' }
        ]
      },
      {
        name: 'Empty',
        entities: [{ initiative_id: 41, official_code: 'SGP-02' }]
      }
    ];

    expect(filterOutAvisaFromInitiativeEntityGroups(groups)).toEqual([
      {
        name: 'P25',
        entities: [{ initiative_id: 10, official_code: 'SP01' }]
      }
    ]);
  });

  it('should filter AVISA from grouped result-creator options and drop orphan labels', () => {
    const options = [
      { isLabel: true, code: 'SP', name: 'Science Program' },
      { id: 41, typeCode: 'SP', official_code: 'SGP-02' },
      { isLabel: true, code: 'ACC', name: 'Accelerator' },
      { id: 20, typeCode: 'ACC', official_code: 'ACC-01' }
    ];

    expect(filterOutAvisaFromGroupedInitiativeOptions(options)).toEqual([
      { isLabel: true, code: 'ACC', name: 'Accelerator' },
      { id: 20, typeCode: 'ACC', official_code: 'ACC-01' }
    ]);
  });
});
