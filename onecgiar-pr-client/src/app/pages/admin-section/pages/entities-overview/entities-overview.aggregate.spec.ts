import { CENTER_STATUS_IDS, PROGRAM_STATUS_IDS, buildCenterRow, buildProgramRows, sumRows } from './entities-overview.aggregate';

describe('entities-overview.aggregate (P2-3858)', () => {
  describe('buildProgramRows', () => {
    const response = {
      mySciencePrograms: [
        {
          initiativeCode: 'SP01',
          initiativeShortName: 'Breeding for Tomorrow',
          versions: [
            { versionId: 36, totalResults: 166, statuses: [
              { statusId: 1, count: 151 },
              { statusId: 2, count: 2 },
              { statusId: 3, count: 12 },
              { statusId: 4, count: 1 }
            ] },
            { versionId: 30, totalResults: 9, statuses: [{ statusId: 3, count: 9 }] }
          ]
        }
      ],
      otherSciencePrograms: [
        { initiativeCode: 'SP10', initiativeName: 'Gender Equality and Inclusion ', versions: [{ versionId: 36, totalResults: 9, statuses: [{ statusId: 1, count: 9 }] }] },
        { initiativeCode: 'SP02', initiativeShortName: 'Sustainable Farming', versions: [] },
        { initiativeCode: 'SP01', initiativeShortName: 'duplicate', versions: [] }
      ]
    };

    it('joins my and other programs, drops duplicates and sorts by code numerically', () => {
      expect(buildProgramRows(response, 36).map(row => row.code)).toEqual(['SP01', 'SP02', 'SP10']);
    });

    it('reads the counts of the requested phase only, in the column order of the Program Overview', () => {
      const sp01 = buildProgramRows(response, 36)[0];
      expect(PROGRAM_STATUS_IDS).toEqual([1, 2, 3, 4]);
      expect(sp01.counts).toEqual([151, 2, 12, 1]);
      expect(sp01.total).toBe(166);
    });

    it('shows zeros for a program without results in that phase', () => {
      const sp02 = buildProgramRows(response, 36)[1];
      expect(sp02.total).toBe(0);
      expect(sp02.counts).toEqual([0, 0, 0, 0]);
    });

    it('trims the name and links to the Program Overview', () => {
      const sp10 = buildProgramRows(response, 36)[2];
      expect(sp10.name).toBe('Gender Equality and Inclusion');
      expect(sp10.link).toBe('/result-framework-reporting/entity-details/SP10/overview');
    });

    it('takes the latest version when no phase could be resolved', () => {
      expect(buildProgramRows(response, null)[0].total).toBe(166);
    });

    it('survives an empty or missing response', () => {
      expect(buildProgramRows(null, 36)).toEqual([]);
      expect(buildProgramRows({}, null)).toEqual([]);
    });
  });

  describe('buildCenterRow', () => {
    const rows = [
      { status_id: '1' },
      { status_id: '1' },
      { status_id: '5' },
      { status_id: '6' },
      { status_id: '7' },
      { status_id: '3' }
    ] as any[];

    it('uses the four tiles of the Center Overview and counts every row in the total', () => {
      const row = buildCenterRow('CENTER-10', 'IFPRI', rows);
      expect(CENTER_STATUS_IDS).toEqual([1, 5, 6, 7]);
      expect(row.counts).toEqual([2, 1, 1, 1]);
      expect(row.total).toBe(6);
    });

    it('links to the Center Overview with the acronym encoded', () => {
      expect(buildCenterRow('CENTER-02', 'Bioversity (Alliance)', []).link).toBe('/bilateral/Bioversity%20(Alliance)/overview');
    });
  });

  describe('sumRows', () => {
    it('adds every column of the rows passed in', () => {
      const a = buildCenterRow('A', 'A', [{ status_id: '1' }, { status_id: '6' }] as any[]);
      const b = buildCenterRow('B', 'B', [{ status_id: '1' }] as any[]);
      expect(sumRows([a, b], 4)).toEqual({ total: 3, counts: [2, 0, 1, 0] });
      expect(sumRows([], 4)).toEqual({ total: 0, counts: [0, 0, 0, 0] });
    });
  });
});
