import { EMPTY_SELECTION, matchesRow, type FilterRow, type PortfolioFilterSelection } from '../../services/portfolio-filters';
import { axisLabelPayload, bucketSlots, decodeSeriesId, encodeSeriesId, resolveTypologyClick, segmentPayload } from './typology.click';

const sel = (parts: Partial<Record<keyof PortfolioFilterSelection, string[]>>): PortfolioFilterSelection => ({
  ...EMPTY_SELECTION,
  ...Object.fromEntries(Object.entries(parts).map(([k, v]) => [k, new Set(v)]))
});
const resolve = (event: Parameters<typeof resolveTypologyClick>[0], selection: PortfolioFilterSelection): PortfolioFilterSelection => {
  const result = resolveTypologyClick(event, selection);
  expect(result).not.toBeNull();
  return result as PortfolioFilterSelection;
};
const arr = (s: ReadonlySet<string>): string[] => [...s].sort();

const NON_EDITING = ['approved', 'discontinued', 'in-qa', 'rejected', 'submitted'];
const START = sel({ project: ['P1'], center: ['C1'], funding: ['bilateral'] });

describe('typology.click (TBC-T-2)', () => {
  describe('series id + payload helpers', () => {
    it('round-trips bucket and type key, including the Unclassified key and a "|" in the type', () => {
      expect(encodeSeriesId('editing', 'Knowledge product')).toBe('editing|Knowledge product');
      expect(decodeSeriesId('submitted|Policy change')).toEqual({ bucket: 'submitted', typeKey: 'Policy change' });
      expect(decodeSeriesId('editing|')).toEqual({ bucket: 'editing', typeKey: '' });
      expect(decodeSeriesId('editing|a|b')).toEqual({ bucket: 'editing', typeKey: 'a|b' });
    });

    it('rejects ids that are not bucket|typeKey', () => {
      expect(decodeSeriesId(undefined)).toBeNull();
      expect(decodeSeriesId('')).toBeNull();
      expect(decodeSeriesId('no-separator')).toBeNull();
      expect(decodeSeriesId('other|Knowledge product')).toBeNull();
    });

    it('segmentPayload carries seriesId and the P/A key as name; axisLabelPayload is a yAxis event with the key as value', () => {
      expect(segmentPayload('editing', 'Knowledge product', 'SP02')).toMatchObject({ seriesId: 'editing|Knowledge product', name: 'SP02' });
      expect(axisLabelPayload('SP02')).toMatchObject({ componentType: 'yAxis', value: 'SP02' });
    });

    it('bucketSlots: Editing is {editing}; Submitted is every other slot', () => {
      expect(bucketSlots('editing')).toEqual(['editing']);
      expect([...bucketSlots('submitted')].sort()).toEqual(NON_EDITING);
    });
  });

  describe('segment click (TBC-R-4)', () => {
    it('apply: sets program/typology/status and KEEPS project/center/funding (non-empty start)', () => {
      const next = resolve(segmentPayload('editing', 'Knowledge product', 'SP02'), START);
      expect(arr(next.program)).toEqual(['SP02']);
      expect(arr(next.typology)).toEqual(['knowledge product']);
      expect(arr(next.status)).toEqual(['editing']);
      expect(arr(next.project)).toEqual(['P1']);
      expect(arr(next.center)).toEqual(['C1']);
      expect(arr(next.funding)).toEqual(['bilateral']);
    });

    it('apply replaces earlier program/typology/status values rather than adding to them', () => {
      const start = sel({ program: ['SP01', 'SP03'], typology: ['output'], status: ['approved'], center: ['C1'] });
      const next = resolve(segmentPayload('editing', 'Policy change', 'SP02'), start);
      expect(arr(next.program)).toEqual(['SP02']);
      expect(arr(next.typology)).toEqual(['policy change']);
      expect(arr(next.status)).toEqual(['editing']);
      expect(arr(next.center)).toEqual(['C1']);
    });

    it('does not mutate the current selection', () => {
      resolve(segmentPayload('editing', 'Knowledge product', 'SP02'), START);
      expect(START.program.size).toBe(0);
      expect(START.project.size).toBe(1);
    });

    it('Submitted bucket: status = the 5 non-editing slot keys', () => {
      const next = resolve(segmentPayload('submitted', 'Knowledge product', 'SP02'), START);
      expect(arr(next.status)).toEqual(NON_EDITING);
    });

    it('Unclassified type key maps to the level key "unclassified"', () => {
      const next = resolve(segmentPayload('submitted', '', 'SP02'), START);
      expect(arr(next.typology)).toEqual(['unclassified']);
    });

    it('toggle off: the identical click clears program/typology/status and keeps project/center/funding', () => {
      const event = segmentPayload('editing', 'Knowledge product', 'SP02');
      const once = resolve(event, START);
      const twice = resolve(event, once);
      expect(arr(twice.program)).toEqual([]);
      expect(arr(twice.typology)).toEqual([]);
      expect(arr(twice.status)).toEqual([]);
      expect(arr(twice.project)).toEqual(['P1']);
      expect(arr(twice.center)).toEqual(['C1']);
      expect(arr(twice.funding)).toEqual(['bilateral']);
    });

    it('toggle off works for the Submitted bucket (set equality, not order)', () => {
      const event = segmentPayload('submitted', 'Policy change', 'SP02');
      const twice = resolve(event, resolve(event, START)!);
      expect(arr(twice.status)).toEqual([]);
      expect(arr(twice.program)).toEqual([]);
    });

    it('a different segment on the same P/A is NOT a toggle-off', () => {
      const once = resolve(segmentPayload('editing', 'Knowledge product', 'SP02'), START);
      const other = resolve(segmentPayload('submitted', 'Knowledge product', 'SP02'), once);
      expect(arr(other.status)).toEqual(NON_EDITING);
      expect(arr(other.program)).toEqual(['SP02']);
    });

    it('catch-all P/A, malformed series id and unknown events resolve to null', () => {
      expect(resolveTypologyClick(segmentPayload('editing', 'Knowledge product', ''), START)).toBeNull();
      expect(resolveTypologyClick({ seriesId: 'garbage', name: 'SP02' }, START)).toBeNull();
      expect(resolveTypologyClick({ name: 'SP02' }, START)).toBeNull();
      expect(resolveTypologyClick({}, START)).toBeNull();
      expect(resolveTypologyClick(null, START)).toBeNull();
      expect(resolveTypologyClick(undefined, START)).toBeNull();
    });
  });

  describe('axis label click (TBC-R-5)', () => {
    it('toggles program on, leaving other dimensions untouched', () => {
      const start = sel({ typology: ['output'], status: ['editing'], center: ['C1'] });
      const next = resolve(axisLabelPayload('SP02'), start);
      expect(arr(next.program)).toEqual(['SP02']);
      expect(arr(next.typology)).toEqual(['output']);
      expect(arr(next.status)).toEqual(['editing']);
      expect(arr(next.center)).toEqual(['C1']);
    });

    it('adds to an existing program set and toggles an included code off (toggleValue semantics)', () => {
      const start = sel({ program: ['SP01'], funding: ['w1w2'] });
      const on = resolve(axisLabelPayload('SP02'), start);
      expect(arr(on.program)).toEqual(['SP01', 'SP02']);
      const off = resolve(axisLabelPayload('SP02'), on);
      expect(arr(off.program)).toEqual(['SP01']);
      expect(arr(off.funding)).toEqual(['w1w2']);
    });

    it('catch-all label (empty / blank / non-string value) must NOT be a target', () => {
      expect(resolveTypologyClick(axisLabelPayload(''), START)).toBeNull();
      expect(resolveTypologyClick({ componentType: 'yAxis', value: '   ' }, START)).toBeNull();
      expect(resolveTypologyClick({ componentType: 'yAxis', value: 7 }, START)).toBeNull();
      expect(resolveTypologyClick({ componentType: 'yAxis' }, START)).toBeNull();
    });
  });

  describe('result is accepted by matchesRow (P-1)', () => {
    const row = (over: Partial<FilterRow>): FilterRow =>
      ({ submitter: 'SP02', result_type: 'Knowledge  Product ', status_id: 1, status_name: 'Editing', source_name: 'W3/Bilaterals', ...over }) as FilterRow;

    it('matches the row the segment represents and misses a different type / bucket / program', () => {
      const next = resolve(segmentPayload('editing', 'Knowledge product', 'SP02'), EMPTY_SELECTION);
      expect(matchesRow(row({}), next)).toBe('match');
      expect(matchesRow(row({ result_type: 'Policy change' }), next)).toBe('miss');
      expect(matchesRow(row({ status_id: 3, status_name: 'Submitted' }), next)).toBe('miss');
      expect(matchesRow(row({ submitter: 'SP01' }), next)).toBe('miss');
    });

    it('Submitted bucket matches an approved row and misses an editing one; Unclassified matches an unmapped type', () => {
      const sub = resolve(segmentPayload('submitted', '', 'SP02'), EMPTY_SELECTION);
      expect(matchesRow(row({ result_type: 'Weird', status_id: 6, status_name: 'Approved' }), sub)).toBe('match');
      expect(matchesRow(row({ result_type: 'Weird' }), sub)).toBe('miss');
      expect(matchesRow(row({ result_type: 'Knowledge product', status_id: 6, status_name: 'Approved' }), sub)).toBe('miss');
    });
  });
});
