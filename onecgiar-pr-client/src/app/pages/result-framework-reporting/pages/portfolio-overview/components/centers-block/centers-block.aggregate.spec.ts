import { CENTER_STATUS_IDS, buildCenterRow, byOrigin, isReplicatedRow, isW3Row, originCounts, sumRows } from './centers-block.aggregate';

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

  describe('isReplicatedRow (CNR-2 encodings)', () => {
    it.each([1, '1', true])('treats %p as replicated', value => {
      expect(isReplicatedRow({ is_replicated: value } as any)).toBe(true);
    });

    it.each([0, '0', false, null, undefined])('treats %p as new', value => {
      expect(isReplicatedRow({ is_replicated: value } as any)).toBe(false);
    });

    it('treats a missing key as new', () => {
      expect(isReplicatedRow({} as any)).toBe(false);
    });
  });

  describe('isW3Row (CNR-1)', () => {
    it('is true only for source API', () => {
      expect(isW3Row({ source: 'API' } as any)).toBe(true);
      expect(isW3Row({ source: 'Result' } as any)).toBe(false);
      expect(isW3Row({} as any)).toBe(false);
    });
  });

  describe('byOrigin and originCounts', () => {
    const fixture = [
      { id: 1, is_replicated: 0 },
      { id: 2, is_replicated: '0' },
      { id: 3, is_replicated: 1 },
      { id: 4, is_replicated: '1' },
      { id: 5, is_replicated: true }
    ] as any[];

    it('all returns every row', () => {
      expect(byOrigin(fixture, 'all').map((r: any) => r.id)).toEqual([1, 2, 3, 4, 5]);
    });

    it('new returns the not-replicated rows', () => {
      expect(byOrigin(fixture, 'new').map((r: any) => r.id)).toEqual([1, 2]);
    });

    it('replicated returns the replicated rows', () => {
      expect(byOrigin(fixture, 'replicated').map((r: any) => r.id)).toEqual([3, 4, 5]);
    });

    it('originCounts splits the total with new + replicated === total', () => {
      const counts = originCounts(fixture);
      expect(counts).toEqual({ total: 5, new: 2, replicated: 3 });
      expect(counts.new + counts.replicated).toBe(counts.total);
    });

    it('originCounts of no rows is all zeros', () => {
      expect(originCounts([])).toEqual({ total: 0, new: 0, replicated: 0 });
    });
  });
});
