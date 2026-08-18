import { buildReportModalNode, stripReportingDisplayKeys } from './report-modal-context.util';

/**
 * These assertions guard the CREATE PAYLOAD, not a view: the legacy modal forwards
 * `indicators[0]` verbatim into the POST body, so anything that leaks here reaches the server.
 */
describe('buildReportModalNode', () => {
  const indicatorA = { indicator_id: 11, center_id: 5, related_node_id: 'n-1', target_value_sum: 4 };
  const indicatorB = { indicator_id: 11, center_id: 9, related_node_id: 'n-1', target_value_sum: 7 };
  const indicatorC = { indicator_id: 22, center_id: 5, related_node_id: 'n-2' };

  const node = {
    toc_result_id: 'toc-1',
    result_title: 'HLO 1',
    result_level_id: 2,
    toc_partner_institution_ids: [3, 4],
    contributing_synergy_program_initiative_ids: [77],
    indicators: [indicatorA, indicatorB, indicatorC]
  };

  const rowFrom = (indicator: Record<string, unknown>) => ({
    ...indicator,
    __aowCode: 'AOW01',
    __aowName: 'Area one',
    __hlo: 'HLO 1',
    __tier: 'output',
    __hloNode: node
  });

  it('narrows a multi-indicator node down to the clicked indicator', () => {
    const result = buildReportModalNode(node, rowFrom(indicatorC));

    expect(result['indicators']).toEqual([indicatorC]);
  });

  it('keeps the node fields the modal preselects from (ToC centers / Science Programs)', () => {
    const result = buildReportModalNode(node, rowFrom(indicatorA));

    expect(result['toc_result_id']).toBe('toc-1');
    expect(result['result_level_id']).toBe(2);
    expect(result['toc_partner_institution_ids']).toEqual([3, 4]);
    expect(result['contributing_synergy_program_initiative_ids']).toEqual([77]);
  });

  it('disambiguates two rows that share an indicator_id by center_id', () => {
    expect(buildReportModalNode(node, rowFrom(indicatorB))['indicators']).toEqual([indicatorB]);
    expect(buildReportModalNode(node, rowFrom(indicatorA))['indicators']).toEqual([indicatorA]);
  });

  it('keeps every center of an indicator that is not split per center', () => {
    // Parity with the old call site: a null center means "no center filter", not "no match".
    const row = rowFrom({ indicator_id: 11, center_id: null });

    expect(buildReportModalNode(node, row)['indicators']).toEqual([indicatorA, indicatorB]);
  });

  it('never leaks the table display keys — __hloNode alone would carry every sibling indicator', () => {
    const row = rowFrom({ indicator_id: 999, center_id: null });

    const indicators = buildReportModalNode(node, row)['indicators'] as Record<string, unknown>[];
    expect(indicators).toHaveLength(1);
    expect(Object.keys(indicators[0])).toEqual(['indicator_id', 'center_id']);
  });

  it('falls back to a minimal node when the row reached the table without its group', () => {
    const result = buildReportModalNode(null, rowFrom(indicatorA));

    expect(result['result_title']).toBe('HLO 1');
    expect(result['indicators']).toEqual([indicatorA]);
    expect(result['indicators']).not.toHaveProperty('0.__hloNode');
  });

  it('tolerates a group whose indicators array is missing', () => {
    const result = buildReportModalNode({ toc_result_id: 'toc-9' }, rowFrom(indicatorA));

    expect(result['toc_result_id']).toBe('toc-9');
    expect(result['indicators']).toEqual([indicatorA]);
  });
});

describe('stripReportingDisplayKeys', () => {
  it('drops only the table extras and copies the row', () => {
    const row = { indicator_id: 1, __hlo: 'x', __tier: 'output', __hloNode: {}, __aowCode: 'A', __aowName: 'a' };

    const clean = stripReportingDisplayKeys(row);

    expect(clean).toEqual({ indicator_id: 1 });
    expect(row.__hlo).toBe('x');
  });

  it('is safe on a null row', () => {
    expect(stripReportingDisplayKeys(null)).toEqual({});
  });
});
