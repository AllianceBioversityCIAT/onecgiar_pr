import { ResultImpactLevelRepository } from './result-impact-level.repository';
import { ResultImpactPreviousResultRepository } from './result-impact-previous-result.repository';

/**
 * IRS-T-8 / IRS-R-14 + FP-8 — shape of the replication SQL. The base `ReplicableRepository`
 * runs `insertQuery` through the caller's transaction manager, so the contract under test is the
 * text of the three queries (same convention as `results-policy-changes.repository.ts`).
 */
describe('impact-level repositories — replication queries', () => {
  const config: any = {
    old_result_id: 111,
    new_result_id: 222,
    user: { id: 7 },
  };
  const squash = (s: string) => s.replace(/\s+/g, ' ').trim();

  const level = () =>
    ResultImpactLevelRepository.prototype.createQueries.call({}, config);
  const links = () =>
    ResultImpactPreviousResultRepository.prototype.createQueries.call(
      {},
      config,
    );

  it('results_impact_level: findQuery projects the NEW result id as result_id', () => {
    expect(squash(level().findQuery)).toContain('222 AS result_id');
  });

  it('results_impact_previous_result: findQuery projects the NEW result id as result_id', () => {
    expect(squash(links().findQuery)).toContain('222 AS result_id');
  });

  it('results_impact_level: insert targets the new id, reads active old rows, last_updated_date NULL', () => {
    const insert = squash(level().insertQuery);
    expect(insert).toContain('SELECT 222,');
    expect(insert).toContain('WHERE ril.result_id = 111 AND ril.is_active = 1');
    expect(insert).not.toContain('ril.last_updated_date');
    expect(insert).toMatch(/NULL,\s*7,\s*7/);
    expect(squash(level().findQuery)).not.toContain('ril.last_updated_date');
  });

  it('results_impact_previous_result: insert keeps previous_result_id from the old row and points result_id at the copy', () => {
    const insert = squash(links().insertQuery);
    expect(insert).toContain('SELECT 222, rip.previous_result_id');
    expect(insert).toContain('WHERE rip.result_id = 111 AND rip.is_active = 1');
  });

  it('return queries read the NEW result rows', () => {
    expect(squash(level().returnQuery)).toContain('ril.result_id = 222');
    expect(squash(links().returnQuery)).toContain('rip.result_id = 222');
  });
});
