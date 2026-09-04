import { ResultsPolicyChangesRepository } from './results-policy-changes.repository';

/**
 * W-20260902-21 — the Policy Change "number of key actors influenced" field was written by the
 * PATCH and never came back from the GET, because this repository's SELECT lists its columns one by
 * one and that one was missing. The symptom was indistinguishable from an undeployed backend: HTTP
 * 200, no error, and the field empty after a reload.
 *
 * A guard test, on purpose: every column this SELECT stops listing disappears from the form in
 * silence, so the list itself is what needs asserting — not the value.
 */
describe('ResultsPolicyChangesRepository — the read must return every persisted column', () => {
  function makeRepository() {
    const repository: any = Object.create(
      ResultsPolicyChangesRepository.prototype,
    );
    repository.query = jest.fn().mockResolvedValue([]);
    repository._handlersError = { returnErrorRepository: jest.fn() };
    return repository;
  }

  const PERSISTED_COLUMNS = [
    'result_policy_change_id',
    'amount',
    'status_amount',
    'policy_stage_id',
    'policy_type_id',
    'linked_innovation_dev',
    'linked_innovation_use',
    'result_related_engagement',
    'actors_influenced',
  ];

  it.each(PERSISTED_COLUMNS)('asks the database for %s', async (column) => {
    const repository = makeRepository();

    await repository.ResultsPolicyChangesExists(11465);

    const [sql] = repository.query.mock.calls[0];
    expect(sql).toContain(`rpc.${column}`);
  });

  it('reads the row of the requested result only', async () => {
    const repository = makeRepository();

    await repository.ResultsPolicyChangesExists(11465);

    const [sql, params] = repository.query.mock.calls[0];
    expect(sql).toContain('rpc.result_id = ?');
    expect(params).toEqual([11465]);
  });
});
