import { ResultsInnovationsDevRepository } from './results-innovations-dev.repository';

/**
 * Night sweep 2026-09-23, P3 / R6 (NS-47) — phase replication (`createQueries`) copies the Innovation
 * Development row with hand-written column lists, and `has_innovation_link`, `has_scaling_studies`
 * and `ip_support_center_id` were missing; the scaling-study links were not copied at all. Guard
 * tests on the lists and on the link copy. Control negative: with the columns removed, or the
 * `replicateScalingStudyUrls` query pointing at the wrong ids, these tests fail.
 */
describe('ResultsInnovationsDevRepository — phase replication copies every answer', () => {
  const repository: any = Object.create(
    ResultsInnovationsDevRepository.prototype,
  );
  const config: any = { old_result_id: 1, new_result_id: 2, user: { id: 3 } };
  const queries = repository.createQueries(config);
  const squash = (sql: string) => sql.replace(/\s+/g, ' ');

  it.each([
    'has_innovation_link',
    'has_scaling_studies',
    'ip_support_center_id',
  ])('copies %s in the INSERT column list and in both SELECTs', (column) => {
    const insertCols = squash(queries.insertQuery).match(
      /insert into results_innovations_dev \(([^)]*)\)/,
    )[1];
    expect(insertCols).toContain(column);
    expect(squash(queries.insertQuery)).toContain(`rid.${column}`);
    expect(squash(queries.findQuery)).toContain(`rid.${column}`);
  });

  it('keeps the INSERT column list and its SELECT the same length', () => {
    const sql = squash(queries.insertQuery);
    const cols = sql
      .match(/insert into results_innovations_dev \(([^)]*)\)/)[1]
      .split(',').length;
    const selected = sql
      .split(/\bselect\b/i)[1]
      .split(/\bfrom results_innovations_dev\b/i)[0]
      .split(',').length;
    expect(selected).toBe(cols);
  });

  it('copies the scaling-study links from the old result to the new phase row, on the same manager', async () => {
    const manager: any = { query: jest.fn().mockResolvedValue(undefined) };
    await repository.replicateScalingStudyUrls(manager, config);
    expect(manager.query).toHaveBeenCalledTimes(1);
    const [sql, params] = manager.query.mock.calls[0];
    const flat = squash(sql);
    expect(flat).toContain('insert into result_scaling_study_urls');
    expect(flat).toContain('u.result_innov_dev_id');
    expect(flat).toContain('u.is_active > 0');
    // new result first (target row), then the user, then the old result (source rows)
    expect(params).toEqual([2, 3, 1]);
  });
});
