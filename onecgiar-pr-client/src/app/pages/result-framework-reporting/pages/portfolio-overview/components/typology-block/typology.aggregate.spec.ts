import { breakdownByCenter, breakdownByProgram, levelCards, levelOf } from './typology.aggregate';

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

  describe('breakdownByProgram', () => {
    it('S-4.1 row and column totals reconcile', () => {
      const rows = [
        ...times(2, { submitter: 'SP01', result_type: 'Knowledge product' }),
        { submitter: 'SP01', result_type: 'Policy change' },
        { submitter: 'SP02', result_type: 'Impact contribution' },
        { submitter: 'SP02', result_type: 'Innovation use' },
        { submitter: 'SP02', result_type: 'Other output' }
      ];
      const b = breakdownByProgram(rows);
      const sp01 = b.rows.find(r => r.key === 'SP01')!;
      const sp02 = b.rows.find(r => r.key === 'SP02')!;
      expect(sp01.total).toBe(3);
      expect(sp01.byLevel).toEqual({ output: 2, outcome: 1, impact: 0, unclassified: 0 });
      expect(sp02.total).toBe(3);
      expect(sp02.byLevel).toEqual({ output: 1, outcome: 1, impact: 1, unclassified: 0 });
      expect(b.rows.reduce((s, r) => s + r.total, 0)).toBe(6);
      expect(b.showUnclassified).toBe(false);
    });

    it('S-4.2 order is by code, not volume', () => {
      const rows = [...times(300, { submitter: 'SP02', result_type: 'Knowledge product' }), ...times(10, { submitter: 'SP01', result_type: 'Knowledge product' })];
      expect(breakdownByProgram(rows).rows.map(r => r.key)).toEqual(['SP01', 'SP02']);
    });

    it('S-4.3 a row without a P/A code lands in a final No Program row', () => {
      const rows = [{ submitter: 'SP01', result_type: 'Knowledge product' }, { result_type: 'Policy change' }, { submitter: '  ', result_type: 'Policy change' }];
      const b = breakdownByProgram(rows);
      expect(b.rows.map(r => r.key)).toEqual(['SP01', '']);
      expect(b.rows[1].key).toBe('');
      expect(b.rows[1].total).toBe(2);
      expect(b.rows.reduce((s, r) => s + r.total, 0)).toBe(3);
    });

    it('takes the name from the first non-empty short name or name, and flags unclassified page-wide', () => {
      const rows = [
        { submitter: 'SP06', result_type: 'Knowledge product' },
        { submitter: 'SP06', submitter_short_name: 'Climate Action', result_type: 'Knowledge product' },
        { submitter: 'SP07', submitter_name: 'Full name', result_type: 'Mystery' }
      ];
      const b = breakdownByProgram(rows);
      expect(b.rows[0].name).toBe('Climate Action');
      expect(b.rows[1].name).toBe('Full name');
      expect(b.showUnclassified).toBe(true);
    });
  });

  describe('breakdownByCenter', () => {
    it('S-5.1 reconciles to the W3/Bilateral card; W1/W2 rows never appear', () => {
      const w3 = 'W3/Bilaterals';
      const rows = [
        ...times(3, { source_name: w3, lead_center: 'IITA', result_type: 'Knowledge product' }),
        ...times(2, { source_name: w3, lead_center: 'CIMMYT', result_type: 'Policy change' }),
        { source_name: w3, lead_center: '', result_type: 'Knowledge product' },
        // falsifier: a W1/W2 row with a lead Center must not count
        { source_name: 'W1/W2', lead_center: 'IITA', result_type: 'Knowledge product' }
      ];
      const b = breakdownByCenter(rows);
      expect(b.rows.map(r => [r.key, r.total])).toEqual([
        ['CIMMYT', 2],
        ['IITA', 3],
        ['', 1]
      ]);
      expect(b.rows[2].key).toBe('');
      expect(b.rows.reduce((s, r) => s + r.total, 0)).toBe(6);
    });

    it('returns no rows when the page has no W3/Bilateral rows', () => {
      expect(breakdownByCenter([{ source_name: 'W1/W2', lead_center: 'IITA' }]).rows).toEqual([]);
    });
  });
});
