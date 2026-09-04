import { ResultsInnovationsUseRepository } from './results-innovations-use.repository';

/**
 * Guard test over the column list of `InnovUseExists`, for the same reason Policy Change has one:
 * this SELECT names its columns one by one, so a column left out is written by the PATCH and never
 * read back — which reaches the screen as an empty field after a reload, with no error anywhere.
 */
describe('ResultsInnovationsUseRepository — the read must return every persisted column', () => {
  function makeRepository() {
    const repository: any = Object.create(
      ResultsInnovationsUseRepository.prototype,
    );
    repository.query = jest.fn().mockResolvedValue([]);
    repository._handlersError = { returnErrorRepository: jest.fn() };
    return repository;
  }

  const PERSISTED_COLUMNS = [
    'result_innovation_use_id',
    'male_using',
    'female_using',
    'has_innovation_link',
    'innovation_use_level_id',
    'has_scaling_studies',
    'readiness_level_explanation',
    'innov_use_to_be_determined',
    'innov_use_2030_to_be_determined',
    'innov_use_2030_justification',
  ];

  it.each(PERSISTED_COLUMNS)('asks the database for %s', async (column) => {
    const repository = makeRepository();

    await repository.InnovUseExists(11469);

    const [sql] = repository.query.mock.calls[0];
    expect(sql).toContain(`riu.${column}`);
  });

  /** P2-3295 §3: the review logic cannot resolve the previous phase without this alias. */
  it('carries the previous phase result id along', async () => {
    const repository = makeRepository();

    await repository.InnovUseExists(11469);

    const [sql, params] = repository.query.mock.calls[0];
    expect(sql).toContain('previous_r.id AS previous_result_id');
    expect(params).toEqual([11469]);
  });

  /**
   * P2-3568-adjacent, found 3 Sep 2026 — the join that must never go back to INNER.
   *
   * `createQueries` replicates this table copying only `male_using` and `female_using`, so a row
   * created by a phase change carries a NULL `innovation_use_level_id`. While the catalogue was
   * INNER JOINed, that NULL made this query return no row at all, `getInnovationUse` answered 404
   * "Innovation Use not found", and the client swallowed the error and painted an empty form: the
   * reporter opened their carried-over result and saw everything from last year as gone.
   *
   * Measured on prtest by phase-changing result 8694 into 11496. It is one word, it reads like
   * tidying, and it takes the whole section down — hence the lock.
   */
  describe('the innovation-use-level catalogue must be LEFT joined', () => {
    it('LEFT joins it, so a row with no level still comes back', async () => {
      const repository = makeRepository();

      await repository.InnovUseExists(11496);

      const [sql] = repository.query.mock.calls[0];
      expect(sql).toMatch(/LEFT\s+JOIN\s+clarisa_innovation_use_levels/i);
    });

    it('never INNER joins it', async () => {
      const repository = makeRepository();

      await repository.InnovUseExists(11496);

      const [sql] = repository.query.mock.calls[0];
      // Any `JOIN clarisa_innovation_use_levels` not preceded by LEFT is the regression.
      expect(sql).not.toMatch(
        /(?<!LEFT\s)(?<!LEFT\s\s)\bJOIN\s+clarisa_innovation_use_levels/i,
      );
    });

    it('still requires the innovation-use row itself', async () => {
      // The sibling join stays INNER on purpose: with no row there genuinely is no Innovation Use,
      // and loosening it would answer 200 with an empty shell for every result in the platform.
      const repository = makeRepository();

      await repository.InnovUseExists(11496);

      const [sql] = repository.query.mock.calls[0];
      expect(sql).toMatch(/(?<!LEFT\s)\bJOIN\s+results_innovations_use\s+riu/i);
    });
  });
});
