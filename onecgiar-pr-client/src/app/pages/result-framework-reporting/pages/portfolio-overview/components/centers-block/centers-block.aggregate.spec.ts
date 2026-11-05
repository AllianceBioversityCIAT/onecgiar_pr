import { EMPTY_SELECTION, buildDimensionIndex, type PortfolioFilterSelection } from '../../services/portfolio-filters';
import { CENTER_BASE_STATUS_IDS, CENTER_STATUS_IDS, applyGlobal, buildCenterRow, byOrigin, hasLeadProgram, isReplicatedRow, isW3Row, originCounts, dedupeById } from './centers-block.aggregate';

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

    it('counts every row in exactly one status (base tiles 1,5,6,7 plus 2,3,4 in the deck order) and in the total', () => {
      const row = buildCenterRow('CENTER-10', 'IFPRI', rows);
      expect(CENTER_STATUS_IDS).toEqual([1, 2, 3, 5, 6, 7, 4]);
      expect(CENTER_BASE_STATUS_IDS).toEqual([1, 5, 6, 7]);
      expect(row.counts).toEqual([2, 0, 1, 1, 1, 1, 0]);
      expect(row.total).toBe(6);
    });

    describe('CBT: every row in exactly one status bucket', () => {
      const row = (id: number, status_id: unknown) => ({ id, status_id, source: 'API', submitter: 'SP01' }) as any;
      // Counts follow the order 1, 2, 3, 5, 6, 7, 4 (Draft 8, null and unknown fold into Editing).
      const fixture = [row(1, 1), row(2, '2'), row(3, 3), row(4, '4'), row(5, 5), row(6, '6'), row(7, 7), row(8, 8), row(9, '8'), row(10, null), row(11, 99)];

      it('counts by status id in the deck slot order and the counts add up to rows.length', () => {
        const result = buildCenterRow('CENTER-10', 'IFPRI', fixture);
        expect(result.counts).toEqual([5, 1, 1, 1, 1, 1, 1]);
        expect(result.counts.reduce((a, b) => a + b, 0)).toBe(result.total);
        expect(result.total).toBe(11);
      });

      it('Draft only: all rows land in Editing', () => {
        expect(buildCenterRow('C', 'C', [row(1, 8), row(2, 8), row(3, 8)]).counts).toEqual([3, 0, 0, 0, 0, 0, 0]);
      });
    });

    it('links to the Center Overview with the acronym encoded', () => {
      expect(buildCenterRow('CENTER-02', 'Bioversity (Alliance)', []).link).toBe('/bilateral/Bioversity%20(Alliance)/overview');
    });
  });

  describe('dedupeById (PCA-R-4)', () => {
    const r = (id: any, status_id = '1') => ({ id, status_id, source: 'API' }) as any;
    it('keeps one row per result id, first wins', () => {
      const out = dedupeById([r(10, '5'), r(11), r(10, '6')]);
      expect(out.map(x => x.id)).toEqual([10, 11]);
      expect(out[0].status_id).toBe('5');
    });
    it('keeps every row that has no id and does not mutate its input', () => {
      const input = [r(undefined), r(null), r(7), r(7)];
      expect(dedupeById(input).length).toBe(3);
      expect(input.length).toBe(4);
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

  describe('hasLeadProgram (PCA-DD-6)', () => {
    it('is true for a non-blank lead Program/Accelerator code', () => {
      expect(hasLeadProgram({ submitter: 'SP01' } as any)).toBe(true);
    });
    it.each([null, undefined, '', '   '])('is false for %p (no active lead P/A)', value => {
      expect(hasLeadProgram({ submitter: value } as any)).toBe(false);
    });
    it('is false when the key is missing', () => {
      expect(hasLeadProgram({} as any)).toBe(false);
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
  describe('applyGlobal (GLF-R-8, DD-9)', () => {
    const sel = (patch: Partial<Record<keyof PortfolioFilterSelection, string[]>>): PortfolioFilterSelection => ({
      ...EMPTY_SELECTION,
      ...Object.fromEntries(Object.entries(patch).map(([k, v]) => [k, new Set(v)]))
    });
    const rows = [
      { id: 1, submitter: 'SP01', result_type: 'Knowledge product', status_id: 1, status_name: 'Editing', is_replicated: 0 },
      { id: 2, submitter: 'SP01', result_type: 'Capacity sharing for development', status_id: 6, status_name: 'Approved', is_replicated: 1 },
      { id: 3, submitter: 'SP02', result_type: 'Policy change', status_id: 5, status_name: 'Pending Review', is_replicated: 0 },
      { id: 4, submitter: 'SP02', result_type: 'Other output', status_id: 7, status_name: 'Rejected', is_replicated: 1 }
    ] as any[];
    const index = buildDimensionIndex({
      projectLinks: [[1, 10], [2, 10], [3, 11], [4, 12]],
      centerLinks: []
    });
    const ids = (out: any[]) => out.map(r => r.id);

    it('an empty selection returns every row', () => {
      expect(ids(applyGlobal(rows, EMPTY_SELECTION, null, true))).toEqual([1, 2, 3, 4]);
    });

    it('typology matches the level token: only Output rows, and new + replicated = total', () => {
      const out = applyGlobal(rows, sel({ typology: ['output'] }), null, true);
      expect(ids(out)).toEqual([1, 2, 4]);
      const counts = originCounts(out);
      expect(counts.new + counts.replicated).toBe(counts.total);
    });

    it('typology also matches a type token', () => {
      expect(ids(applyGlobal(rows, sel({ typology: ['policy change'] }), null, true))).toEqual([3]);
    });

    it('program matches through the row submitter', () => {
      expect(ids(applyGlobal(rows, sel({ program: ['SP02'] }), null, true))).toEqual([3, 4]);
    });

    it('status resolves through the status slot', () => {
      expect(ids(applyGlobal(rows, sel({ status: ['approved', 'rejected'] }), null, true))).toEqual([2, 4]);
    });

    it('project goes through the index by row id when honoured', () => {
      expect(ids(applyGlobal(rows, sel({ project: ['10'] }), index, true))).toEqual([1, 2]);
    });

    it('project is ignored when not honoured (between cycles)', () => {
      expect(ids(applyGlobal(rows, sel({ project: ['10'] }), index, false))).toEqual([1, 2, 3, 4]);
    });

    it('PFF-R-4: funding is not a row rule here (rows carry no source_name): bilateral and w1w2 both return every row', () => {
      expect(ids(applyGlobal(rows, sel({ funding: ['bilateral'] }), null, true))).toEqual([1, 2, 3, 4]);
      expect(ids(applyGlobal(rows, sel({ funding: ['w1w2'] }), null, true))).toEqual([1, 2, 3, 4]);
      expect(ids(applyGlobal(rows, sel({ funding: ['w1w2', 'bilateral'] }), null, true))).toEqual([1, 2, 3, 4]);
    });

    it('PFF-R-4: funding + program still narrows by program', () => {
      expect(ids(applyGlobal(rows, sel({ funding: ['bilateral'], program: ['SP02'] }), null, true))).toEqual([3, 4]);
      expect(ids(applyGlobal(rows, sel({ funding: ['w1w2'], program: ['SP01'] }), null, true))).toEqual([1, 2]);
    });

    it('honoured project without an index is pending: no row is claimed as a match', () => {
      expect(applyGlobal(rows, sel({ project: ['10'] }), null, true)).toEqual([]);
    });

    it('dimensions compose with AND', () => {
      expect(ids(applyGlobal(rows, sel({ program: ['SP01'], status: ['approved'] }), null, true))).toEqual([2]);
    });

    it('the center dimension is not applied to rows (it limits Centers, not rows)', () => {
      expect(ids(applyGlobal(rows, sel({ center: ['CENTER-03'] }), index, true))).toEqual([1, 2, 3, 4]);
    });

    it('does not mutate its input', () => {
      const copy = [...rows];
      applyGlobal(rows, sel({ program: ['SP01'] }), null, true);
      expect(rows).toEqual(copy);
    });
  });
});
