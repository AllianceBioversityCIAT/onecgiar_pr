import { centerTypeMatrix, levelCards, levelOf, programTypeMatrix, statusBucket } from './typology.aggregate';
import type { RawResult } from '../../services/portfolio-overview.service';

const times = <T>(n: number, row: T): T[] => Array.from({ length: n }, () => ({ ...row }));
const card = (cards: ReturnType<typeof levelCards>, level: string) => cards.find(c => c.level === level)!;

describe('typology.aggregate (TYV-T-1)', () => {
  describe('levelOf (TYV-R-1 map)', () => {
    it.each([
      ['Capacity sharing for development', 'output'],
      ['Knowledge product', 'output'],
      ['Innovation development', 'output'],
      ['Other output', 'output'],
      ['Policy change', 'outcome'],
      ['Innovation use', 'outcome'],
      ['Capacity change', 'outcome'],
      ['Other outcome', 'outcome'],
      ['Impact contribution', 'impact']
    ])('maps %p to %p', (type, level) => {
      expect(levelOf(type)).toBe(level);
    });

    it('sends unknown and missing types to unclassified', () => {
      expect(levelOf('Something else')).toBe('unclassified');
      expect(levelOf(undefined)).toBe('unclassified');
      expect(levelOf(null)).toBe('unclassified');
      expect(levelOf('   ')).toBe('unclassified');
    });
  });

  describe('levelCards', () => {
    // S-1.1: 10 rows: 4 KP, 1 Innovation development, 3 Policy change, 1 Impact contribution, 1 no type
    const s11 = [
      ...times(4, { result_type: 'Knowledge product' }),
      { result_type: 'Innovation development' },
      ...times(3, { result_type: 'Policy change' }),
      { result_type: 'Impact contribution' },
      {}
    ];

    it('S-1.1 levels reconcile to the page total', () => {
      const cards = levelCards(s11);
      expect(cards.map(c => c.level)).toEqual(['output', 'outcome', 'impact', 'unclassified']);
      expect(card(cards, 'output').count).toBe(5);
      expect(card(cards, 'outcome').count).toBe(3);
      expect(card(cards, 'impact').count).toBe(1);
      expect(card(cards, 'unclassified').count).toBe(1);
      expect(card(cards, 'unclassified').types).toEqual([{ name: '', count: 1 }]);
    });

    it('S-1.2 case and spacing do not split a type', () => {
      const cards = levelCards([{ result_type: 'Knowledge product' }, { result_type: ' knowledge Product ' }]);
      expect(card(cards, 'output').count).toBe(2);
      expect(card(cards, 'output').types).toEqual([{ name: 'Knowledge product', count: 2 }]);
      expect(card(cards, 'unclassified').count).toBe(0);
    });

    it('S-1.3 unclassified reads 0 when every row is mapped', () => {
      const cards = levelCards([{ result_type: 'Knowledge product' }, { result_type: 'Policy change' }]);
      expect(card(cards, 'unclassified').count).toBe(0);
      expect(card(cards, 'unclassified').types).toEqual([]);
      expect(cards).toHaveLength(4);
    });

    it('S-2.1 Output card reads 5 and 50%, types by count desc, no zero types', () => {
      const out = card(levelCards(s11), 'output');
      expect(out.count).toBe(5);
      expect(out.percent).toBe(50);
      expect(out.types).toEqual([
        { name: 'Knowledge product', count: 4 },
        { name: 'Innovation development', count: 1 }
      ]);
      expect(out.types.map(t => t.name)).not.toContain('Other output');
    });

    it('S-2.1 ties are ordered by name', () => {
      const out = card(levelCards([{ result_type: 'Knowledge product' }, { result_type: 'Innovation development' }]), 'output');
      expect(out.types.map(t => t.name)).toEqual(['Innovation development', 'Knowledge product']);
    });

    it('S-2.2 a level with no rows still renders at 0 and 0%', () => {
      const impact = card(levelCards([{ result_type: 'Knowledge product' }]), 'impact');
      expect(impact.count).toBe(0);
      expect(impact.percent).toBe(0);
      expect(impact.types).toEqual([]);
    });

    it('returns 0 percent everywhere for an empty page', () => {
      expect(levelCards([]).map(c => c.percent)).toEqual([0, 0, 0, 0]);
    });
  });
});

describe('programTypeMatrix (TBC-T-1)', () => {
  const row = (submitter: string, result_type: string | undefined, status_id: number, extra: Partial<RawResult> = {}): RawResult =>
    ({ submitter, result_type, status_id, ...extra }) as RawResult;
  const rep = <T>(n: number, make: () => T): T[] => Array.from({ length: n }, make);

  // SP01: 6 KP Submitted + 4 KP Editing + 3 Policy Editing, plus one row per status slot and a Draft row.
  const sp01: RawResult[] = [
    ...rep(6, () => row('SP01', 'Knowledge product', 3)),
    ...rep(4, () => row('SP01', 'Knowledge product', 1)),
    ...rep(3, () => row('SP01', 'Policy change', 1)),
    row('SP01', 'Impact contribution', 1, { status_name: 'Editing' }),
    row('SP01', 'Impact contribution', 2, { status_name: 'Quality Assessed' }),
    row('SP01', 'Impact contribution', 3, { status_name: 'Submitted' }),
    row('SP01', 'Impact contribution', 6, { status_name: 'Approved' }),
    row('SP01', 'Impact contribution', 7, { status_name: 'Rejected' }),
    row('SP01', 'Impact contribution', 4, { status_name: 'Discontinued' }),
    row('SP01', 'Impact contribution', 8, { status_name: 'Draft' })
  ];

  describe('statusBucket (TBC-DD-2)', () => {
    it.each([
      [1, 'Editing', 'editing'],
      [2, 'Quality Assessed', 'submitted'],
      [3, 'Submitted', 'submitted'],
      [6, 'Approved', 'submitted'],
      [7, 'Rejected', 'submitted'],
      [4, 'Discontinued', 'submitted'],
      [8, 'Draft', 'editing']
    ])('status %p (%s) -> %s', (status_id, status_name, bucket) => {
      expect(statusBucket({ status_id, status_name } as RawResult)).toBe(bucket);
    });
  });

  it('counts per segment: KP 6 submitted / 4 editing, Policy 3 editing', () => {
    const sp = programTypeMatrix(sp01).programs.find(p => p.key === 'SP01')!;
    expect(sp.submitted.get('Knowledge product')).toBe(6);
    expect(sp.editing.get('Knowledge product')).toBe(4);
    expect(sp.editing.get('Policy change')).toBe(3);
    expect(sp.submitted.get('Policy change') ?? 0).toBe(0);
    // 7 impact rows: editing, Draft -> editing (2); qa, submitted, approved, rejected, discontinued -> submitted (5)
    expect(sp.submitted.get('Impact contribution')).toBe(5);
    expect(sp.editing.get('Impact contribution')).toBe(2);
  });

  it('submitted + editing = the row count of every P/A', () => {
    const rows = [...sp01, row('SP02', 'Policy change', 3), row('SP02', 'Other output', 1), row('', 'Knowledge product', 1)];
    const sum = (m: Map<string, number>) => [...m.values()].reduce((a, b) => a + b, 0);
    for (const p of programTypeMatrix(rows).programs) {
      expect(sum(p.submitted) + sum(p.editing)).toBe(p.total);
      expect(p.total).toBe(rows.filter(r => (r.submitter ?? '') === p.key).length);
    }
  });

  it('zero buckets: a P/A with no Editing rows stays with an empty editing map', () => {
    const p = programTypeMatrix([row('SP11', 'Knowledge product', 3), ...sp01]).programs.find(x => x.key === 'SP11')!;
    expect(p.editing.size).toBe(0);
    expect(p.submitted.get('Knowledge product')).toBe(1);
  });

  it('unclassified type: unmapped and missing types share the "" key', () => {
    const m = programTypeMatrix([row('SP01', 'Weird', 3), row('SP01', undefined, 1), row('SP01', '  ', 1)]);
    const sp = m.programs[0];
    expect(sp.submitted.get('')).toBe(1);
    expect(sp.editing.get('')).toBe(2);
    expect(m.types).toEqual([{ key: '', name: '', level: 'unclassified' }]);
  });

  it('orders P/As naturally (SP2 before SP10), catch-all last', () => {
    const keys = programTypeMatrix([row('', 'Other output', 3), row('SP10', 'Other output', 3), row('SP2', 'Other output', 3)]).programs.map(p => p.key);
    expect(keys).toEqual(['SP2', 'SP10', '']);
  });

  it('types: present-only, level order then declaration order', () => {
    const m = programTypeMatrix([
      row('SP01', 'Impact contribution', 3),
      row('SP01', 'Policy change', 3),
      row('SP01', 'Other output', 3),
      row('SP01', 'Knowledge product', 3),
      row('SP01', 'nope', 3)
    ]);
    expect(m.types.map(t => t.key)).toEqual(['Knowledge product', 'Other output', 'Policy change', 'Impact contribution', '']);
    expect(m.types.map(t => t.level)).toEqual(['output', 'output', 'outcome', 'impact', 'unclassified']);
  });

  it('canonicalises type spelling and names the P/A from short name then name', () => {
    const m = programTypeMatrix([row('SP01', ' knowledge  PRODUCT ', 3, { submitter_name: 'Long', submitter_short_name: 'Short' })]);
    expect(m.programs[0].submitted.get('Knowledge product')).toBe(1);
    expect(m.programs[0].name).toBe('Short');
  });

  describe('centerTypeMatrix (TBC-R-10, DD-9)', () => {
    const w3 = (lead: string | null | undefined, type: string, status_id = 3): RawResult =>
      ({ lead_center: lead, result_type: type, status_id, source_name: 'W3/Bilaterals' }) as RawResult;

    it('counts W3/Bilateral rows only, by trimmed lead Center, A to Z, catch-all last', () => {
      const m = centerTypeMatrix([
        { lead_center: 'CIAT', result_type: 'Knowledge product', status_id: 3, source_name: 'W1/W2' } as RawResult,
        w3('IRRI', 'Knowledge product'),
        w3(' CIAT ', 'Policy change', 1),
        w3(null, 'Other output'),
        w3('ILRI', 'Other output')
      ]);
      expect(m.programs.map(p => p.key)).toEqual(['CIAT', 'ILRI', 'IRRI', '']);
      expect(m.programs.reduce((sum, p) => sum + p.total, 0)).toBe(4);
      expect(m.programs[0].editing.get('Policy change')).toBe(1);
      expect(m.programs[0].name).toBeUndefined();
    });

    it('is empty when no row is W3/Bilateral', () => {
      expect(centerTypeMatrix([{ lead_center: 'CIAT', result_type: 'Other output', source_name: 'W1/W2' } as RawResult]).programs).toEqual([]);
    });
  });
});
