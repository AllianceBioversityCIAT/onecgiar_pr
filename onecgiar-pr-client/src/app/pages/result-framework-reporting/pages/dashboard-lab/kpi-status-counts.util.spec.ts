import { countsForRow, indexLinks, IndicatorResultStatusLink, rowAnchor, statusGroupOf } from './kpi-status-counts.util';

/**
 * @akili-spec result-framework-reporting/kpi-row-status-counts (KRC-T-2)
 * Fixture shapes are copied from the server mapping spec (`findIndicatorResultStatusLinks`, KRC-T-1):
 * numeric ids, string `related_node_id`, `anchors` as a de-duplicated number[], boolean `has_unanchored`.
 */
const link = (over: Partial<IndicatorResultStatusLink>): IndicatorResultStatusLink => ({
  toc_result_id: 5,
  related_node_id: 'NODE-A',
  result_id: 11,
  status_id: 1,
  anchors: [],
  has_unanchored: false,
  ...over
});

const row = (over: Record<string, unknown> = {}) => ({ toc_result_id: 5, related_node_id: 'NODE-A', ...over });

describe('kpi-status-counts.util (KRC-T-2)', () => {
  it('S-2.1: a result anchored to row A only counts on A, not on sibling B', () => {
    const idx = indexLinks([link({ result_id: 11, status_id: 1, anchors: [340657] })]);
    expect(countsForRow(idx, row({ toc_indicator_target_id: 340657 }))).toEqual({ editing: 1, submitted: 0, approved: 0, pendingReview: 0 });
    expect(countsForRow(idx, row({ toc_indicator_target_id: 340658 }))).toEqual({ editing: 0, submitted: 0, approved: 0, pendingReview: 0 });
  });

  it('S-2.2: an unanchored link counts on every row of the node', () => {
    const idx = indexLinks([link({ result_id: 12, status_id: 3, anchors: [], has_unanchored: true })]);
    expect(countsForRow(idx, row({ toc_indicator_target_id: 340657 })).submitted).toBe(1);
    expect(countsForRow(idx, row({ toc_indicator_target_id: 340658 })).submitted).toBe(1);
  });

  it('S-2.3: one result with two anchors (and an unanchored row) counts once', () => {
    const idx = indexLinks([
      link({ result_id: 11, status_id: 1, anchors: [340657, 340658], has_unanchored: true }),
      link({ result_id: 11, status_id: 1, anchors: [340657], has_unanchored: false })
    ]);
    expect(countsForRow(idx, row({ toc_indicator_target_id: 340657 })).editing).toBe(1);
  });

  it('a row without an anchor counts every link of the node, anchored or not', () => {
    const idx = indexLinks([link({ result_id: 11, anchors: [340657] }), link({ result_id: 12, anchors: [340658] })]);
    expect(countsForRow(idx, row()).editing).toBe(2);
    expect(countsForRow(idx, row({ toc_indicator_target_id: null })).editing).toBe(2);
  });

  it('a blank / whitespace / non-finite anchor is treated as absent (drawer parity)', () => {
    const idx = indexLinks([link({ result_id: 11, anchors: [340657] })]);
    expect(rowAnchor('')).toBeUndefined();
    expect(rowAnchor('   ')).toBeUndefined();
    expect(rowAnchor('abc')).toBeUndefined();
    expect(rowAnchor(undefined)).toBeUndefined();
    expect(rowAnchor(null)).toBeUndefined();
    expect(rowAnchor('340657')).toBe(340657);
    expect(countsForRow(idx, row({ toc_indicator_target_id: '' })).editing).toBe(1);
    expect(countsForRow(idx, row({ toc_indicator_target_id: 'abc' })).editing).toBe(1);
  });

  it('S-1.4: statuses 4 / 7 / 8 are ignored', () => {
    const idx = indexLinks([link({ result_id: 1, status_id: 4 }), link({ result_id: 2, status_id: 7 }), link({ result_id: 3, status_id: 8 })]);
    expect(countsForRow(idx, row())).toEqual({ editing: 0, submitted: 0, approved: 0, pendingReview: 0 });
  });

  it('S-1.2: mixed 1/2/3/5/6 buckets to editing 1, submitted 2, approved 1, pending review 1', () => {
    const idx = indexLinks(
      [1, 2, 3, 5, 6].map((status_id, i) => link({ result_id: 100 + i, status_id, has_unanchored: true }))
    );
    expect(countsForRow(idx, row())).toEqual({ editing: 1, submitted: 2, approved: 1, pendingReview: 1 });
  });

  it('status 6 is approved, 2 and 3 are submitted (never approved under submitted)', () => {
    const idx = indexLinks([link({ result_id: 1, status_id: 6, has_unanchored: true }), link({ result_id: 2, status_id: 2, has_unanchored: true }), link({ result_id: 3, status_id: 3, has_unanchored: true })]);
    expect(countsForRow(idx, row())).toEqual({ editing: 0, submitted: 2, approved: 1, pendingReview: 0 });
    expect([1, 2, 3, 5, 6, 4, 7, 8].map(statusGroupOf)).toEqual(['editing', 'submitted', 'submitted', 'pendingReview', 'approved', null, null, null]);
  });

  it('a row of another node or toc result gets nothing; a missing row field yields zeros', () => {
    const idx = indexLinks([link({ has_unanchored: true })]);
    expect(countsForRow(idx, row({ related_node_id: 'NODE-B' }))).toEqual({ editing: 0, submitted: 0, approved: 0, pendingReview: 0 });
    expect(countsForRow(idx, row({ toc_result_id: 6 }))).toEqual({ editing: 0, submitted: 0, approved: 0, pendingReview: 0 });
    expect(countsForRow(idx, {})).toEqual({ editing: 0, submitted: 0, approved: 0, pendingReview: 0 });
    expect(countsForRow(idx, null)).toEqual({ editing: 0, submitted: 0, approved: 0, pendingReview: 0 });
  });

  it('matches a string toc_result_id on the row against the numeric one on the link', () => {
    const idx = indexLinks([link({ has_unanchored: true })]);
    expect(countsForRow(idx, row({ toc_result_id: '5' })).editing).toBe(1);
  });
});
