import { ResultsTocResultRepository } from './results-toc-results.repository';

/**
 * P2-3608 - `contributing_indicator` must never be persisted as a negative
 * number. `saveInditicatorsContributing` is the single write bottleneck for the
 * ToC v1/v2, IPSR, share-request and bilateral-center paths, so the guard lives
 * there and is exercised here on both branches (UPDATE and INSERT).
 */
describe('ResultsTocResultRepository - contributing_indicator sign guard (P2-3608)', () => {
  let repository: ResultsTocResultRepository;
  let indicatorRepo: any;
  let targetRepo: any;

  const buildRepository = () => {
    indicatorRepo = {
      update: jest.fn().mockResolvedValue(undefined),
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockResolvedValue({ result_toc_result_indicator_id: 77 }),
    };
    targetRepo = {
      update: jest.fn().mockResolvedValue(undefined),
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockResolvedValue(undefined),
    };

    const dataSource: any = {
      createEntityManager: jest.fn().mockReturnValue({}),
    };
    const handlersError: any = { returnErrorRepository: jest.fn((e) => e) };

    const repo = new ResultsTocResultRepository(
      dataSource,
      handlersError,
      indicatorRepo,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      targetRepo,
    );
    // getPhaseYearByResult and getCanonicalIndicatorTarget both go through
    // this.query; an empty result set makes them return null.
    (repo as any).query = jest.fn().mockResolvedValue([]);
    return repo;
  };

  const useInsertBranch = () => {
    indicatorRepo.findOne.mockResolvedValue(null);
  };

  const useUpdateBranch = () => {
    indicatorRepo.findOne.mockResolvedValue({
      result_toc_result_indicator_id: 77,
    });
    targetRepo.findOne.mockResolvedValue({ indicators_targets: 1048 });
  };

  const payloadWith = (target: any) => [
    { toc_results_indicator_id: 'node-1', targets: [target] },
  ];

  const savedTarget = () => targetRepo.save.mock.calls[0][0];

  const updatedTarget = () => {
    const call = targetRepo.update.mock.calls.find((c: any[]) =>
      Object.prototype.hasOwnProperty.call(c[1], 'contributing_indicator'),
    );
    return call[1];
  };

  beforeEach(() => {
    repository = buildRepository();
  });

  it('clamps a negative contribution to 0 on the INSERT branch', async () => {
    useInsertBranch();

    await repository.saveInditicatorsContributing(
      payloadWith({ number_target: 5, contributing_indicator: -1 }),
      500,
      1,
      9,
    );

    expect(savedTarget().contributing_indicator).toBe(0);
  });

  it('clamps a negative contribution sent through the `contributing` alias (P22 paths)', async () => {
    useInsertBranch();

    await repository.saveInditicatorsContributing(
      payloadWith({ number_target: 5, contributing: -7.5 }),
      500,
      1,
      9,
    );

    expect(savedTarget().contributing_indicator).toBe(0);
  });

  it('clamps a negative contribution to 0 on the UPDATE branch', async () => {
    useUpdateBranch();

    await repository.saveInditicatorsContributing(
      payloadWith({
        indicators_targets: 1048,
        number_target: 5,
        contributing_indicator: -1,
      }),
      500,
      1,
      9,
    );

    expect(updatedTarget().contributing_indicator).toBe(0);
  });

  it('keeps 0, which is a real answer for qualitative indicators (P2-3089)', async () => {
    useInsertBranch();

    await repository.saveInditicatorsContributing(
      payloadWith({ number_target: 5, contributing_indicator: 0 }),
      500,
      1,
      9,
    );

    expect(savedTarget().contributing_indicator).toBe(0);
  });

  it('keeps null and undefined as null ("not answered yet")', async () => {
    useInsertBranch();

    await repository.saveInditicatorsContributing(
      payloadWith({ number_target: 5, contributing_indicator: null }),
      500,
      1,
      9,
    );
    expect(savedTarget().contributing_indicator).toBeNull();

    targetRepo.save.mockClear();
    await repository.saveInditicatorsContributing(
      payloadWith({ number_target: 5 }),
      500,
      1,
      9,
    );
    expect(savedTarget().contributing_indicator).toBeNull();
  });

  it('leaves the pre-existing empty-string coercion alone (it already lands as 0)', async () => {
    useInsertBranch();

    await repository.saveInditicatorsContributing(
      payloadWith({ number_target: 5, contributing_indicator: '' }),
      500,
      1,
      9,
    );

    expect(savedTarget().contributing_indicator).toBe(0);
  });

  it('does not touch the sibling fields of the same payload', async () => {
    useInsertBranch();

    await repository.saveInditicatorsContributing(
      payloadWith({
        number_target: 5,
        target_date: 2026,
        indicator_question: true,
        target_progress_narrative: 'hola',
        contributing_indicator: -3,
      }),
      500,
      1,
      9,
    );

    expect(savedTarget()).toEqual(
      expect.objectContaining({
        number_target: 5,
        indicator_question: true,
        target_progress_narrative: 'hola',
        is_active: true,
        contributing_indicator: 0,
      }),
    );
  });
});
