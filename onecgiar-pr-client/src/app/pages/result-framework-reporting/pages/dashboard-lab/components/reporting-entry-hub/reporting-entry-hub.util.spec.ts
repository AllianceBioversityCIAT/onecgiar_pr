import { buildReportedResultsByProjectId } from './reporting-entry-hub.util';

describe('buildReportedResultsByProjectId', () => {
  it('maps project_id to the number of results in each group', () => {
    const map = buildReportedResultsByProjectId([
      { project_id: 1597, results: [{ id: 1 }, { id: 2 }] },
      { project_id: '1600', results: [] }
    ]);

    expect(map.get('1597')).toBe(2);
    expect(map.get('1600')).toBe(0);
  });
});
