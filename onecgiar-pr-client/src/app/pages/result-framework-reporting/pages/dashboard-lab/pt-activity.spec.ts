import { buildPtActivityIndex, centerAcronymsOfRow, ptActivityCountOf, ptActivityHasAny, ptActivityTooltip } from './pt-activity';

const item = (over: Record<string, unknown> = {}) => ({
  toc_results_indicator_id: 'node-1',
  toc_indicator_integration_id: 101,
  center: 'CIAT',
  matched: true,
  evidence_count: 13,
  pt_indicator_id: 'pt-a',
  ...over
});

describe('pt-activity', () => {
  describe('buildPtActivityIndex', () => {
    it('returns null for a payload without an items array', () => {
      expect(buildPtActivityIndex(undefined)).toBeNull();
      expect(buildPtActivityIndex({ items: [] })).toBeNull();
    });

    it('indexes each item under both identifiers and drops malformed entries', () => {
      const index = buildPtActivityIndex([
        item(),
        null,
        'x',
        { center: 'IRRI' },
        item({ toc_indicator_integration_id: null, toc_results_indicator_id: 'node-2' })
      ])!;
      expect(index.get('id:101')?.length).toBe(1);
      expect(index.get('node:node-1')?.length).toBe(1);
      expect(index.get('node:node-2')?.length).toBe(1);
      expect(index.size).toBe(3);
    });

    it('coerces counts and flags defensively', () => {
      const index = buildPtActivityIndex([item({ evidence_count: 'nope', matched: 'yes', toc_indicator_integration_id: '101' })])!;
      const [it0] = index.get('id:101')!;
      expect(it0.evidence_count).toBe(0);
      expect(it0.matched).toBe(false);
      expect(it0.toc_indicator_integration_id).toBe(101);
    });
  });

  describe('ptActivityCountOf', () => {
    const index = buildPtActivityIndex([
      item(),
      item({ center: 'IRRI', pt_indicator_id: 'pt-b', evidence_count: 4 }),
      item({ center: 'ILRI', pt_indicator_id: 'pt-a', evidence_count: 13 }),
      item({ center: 'IITA', matched: false, pt_indicator_id: 'pt-c', evidence_count: 9 }),
      item({ toc_indicator_integration_id: 202, toc_results_indicator_id: 'node-2', center: '', pt_indicator_id: 'pt-d', evidence_count: 2 })
    ]);

    it('returns 0 without data, for an unknown indicator, or for a null row', () => {
      expect(ptActivityCountOf({ indicator_id: 101, center_acronym: 'CIAT' }, null)).toBe(0);
      expect(ptActivityCountOf({ indicator_id: 999, center_acronym: 'CIAT' }, index)).toBe(0);
      expect(ptActivityCountOf(null, index)).toBe(0);
    });

    it('matches the row center (case/space-insensitive) by the integration id', () => {
      expect(ptActivityCountOf({ indicator_id: 101, center_acronym: ' ciat ' }, index)).toBe(13);
      expect(ptActivityCountOf({ indicator_id: '101', center_acronym: 'IRRI' }, index)).toBe(4);
    });

    it('falls back to the related node id when the integration id is missing', () => {
      expect(ptActivityCountOf({ indicator_related_node_id: 'node-1', center_acronym: 'IRRI' }, index)).toBe(4);
    });

    it('shows nothing for an unmatched (needs review / none) mapping, even with evidence', () => {
      expect(ptActivityCountOf({ indicator_id: 101, center_acronym: 'IITA' }, index)).toBe(0);
    });

    it('sums the centres of a shared target, de-duplicating centres mapped to one PT KPI', () => {
      const shared = { indicator_id: 101, centers: [{ center_acronym: 'CIAT' }, { center_acronym: 'IRRI' }, { center_acronym: 'ILRI' }] };
      expect(ptActivityCountOf(shared, index)).toBe(17);
    });

    it('with no centre on the row, uses the indicator only when it is mapped exactly once', () => {
      expect(ptActivityCountOf({ indicator_id: 202 }, index)).toBe(2);
      expect(ptActivityCountOf({ indicator_id: 101 }, index)).toBe(0);
    });
  });

  it('ptActivityHasAny is true only when some matched item has evidence', () => {
    expect(ptActivityHasAny(null)).toBe(false);
    expect(ptActivityHasAny(buildPtActivityIndex([item({ matched: false })]))).toBe(false);
    expect(ptActivityHasAny(buildPtActivityIndex([item({ evidence_count: 0 })]))).toBe(false);
    expect(ptActivityHasAny(buildPtActivityIndex([item()]))).toBe(true);
  });

  it('centerAcronymsOfRow prefers the centers list and ignores dashes', () => {
    expect(centerAcronymsOfRow({ centers: [{ center_acronym: 'IRRI' }, { center_acronym: '—' }], center_acronym: 'CIAT' })).toEqual(['IRRI']);
    expect(centerAcronymsOfRow({ center_acronym: 'CIAT' })).toEqual(['CIAT']);
    expect(centerAcronymsOfRow({ center_acronym: '—' })).toEqual([]);
  });

  it('ptActivityTooltip carries the count', () => {
    expect(ptActivityTooltip(5)).toBe('Progress Tracker has 5 evidence items for this KPI');
  });
});
