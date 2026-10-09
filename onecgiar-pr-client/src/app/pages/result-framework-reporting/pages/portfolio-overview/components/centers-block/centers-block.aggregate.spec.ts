import { CENTER_STATUS_IDS, buildCenterRow, sumRows } from './centers-block.aggregate';

describe('centers-block.aggregate (P2-3858, moved by P2-3928)', () => {
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
