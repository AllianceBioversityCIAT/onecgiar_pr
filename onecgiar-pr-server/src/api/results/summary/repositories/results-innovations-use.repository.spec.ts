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
});
