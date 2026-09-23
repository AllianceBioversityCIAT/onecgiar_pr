import { ResultsCapacityDevelopmentsRepository } from './results-capacity-developments.repository';

/**
 * Night sweep 2026-09-23, P3 / R2 — phase replication (`createQueries`) copies the Capacity Sharing
 * row with hand-written column lists, and `non_binary_using`, `has_unkown_using` and
 * `is_attending_for_organization` were missing: the new-phase copy lost them. Guard test on the lists
 * themselves (the INSERT column list and both SELECTs). Control negative: with the three columns
 * removed from the queries these tests fail.
 */
describe('ResultsCapacityDevelopmentsRepository.createQueries — phase replication copies every answer', () => {
  const repository: any = Object.create(
    ResultsCapacityDevelopmentsRepository.prototype,
  );
  const queries = repository.createQueries({
    old_result_id: 1,
    new_result_id: 2,
    user: { id: 3 },
  } as any);
  const squash = (sql: string) => sql.replace(/\s+/g, ' ');

  it.each([
    'non_binary_using',
    'has_unkown_using',
    'is_attending_for_organization',
  ])('copies %s in the INSERT column list and in both SELECTs', (column) => {
    const insertCols = squash(queries.insertQuery).match(
      /insert into results_capacity_developments \(([^)]*)\)/,
    )[1];
    expect(insertCols).toContain(column);
    expect(squash(queries.insertQuery)).toContain(`rcd.${column}`);
    expect(squash(queries.findQuery)).toContain(`rcd.${column}`);
  });

  it('keeps the INSERT column list and its SELECT the same length', () => {
    const sql = squash(queries.insertQuery);
    const cols = sql
      .match(/insert into results_capacity_developments \(([^)]*)\)/)[1]
      .split(',').length;
    const selected = sql
      .split(/\bselect\b/i)[1]
      .split(/\bfrom results_capacity_developments\b/i)[0]
      .split(',').length;
    expect(selected).toBe(cols);
  });
});
