import { ContributionToIndicatorsRepository } from './contribution-to-indicators.repository';

describe('ContributionToIndicatorsRepository', () => {
  const makeRepo = () => {
    const dataSource = {
      createEntityManager: jest.fn(() => ({})),
      query: jest.fn(),
    } as any;

    const handlersError = {
      returnErrorRepository: jest.fn(() => new Error('repo-error')),
    } as any;

    const resultsRepo = {
      getContributingResultsQuery: jest.fn(() => 'SELECT 1'),
      removeInactives: jest.fn((list: any[]) =>
        list.filter((x) => (x.contribution_id ? !!x.is_active : true)),
      ),
    } as any;

    const repo = new ContributionToIndicatorsRepository(
      dataSource,
      handlersError,
      resultsRepo,
    ) as any;

    return { repo, dataSource, handlersError, resultsRepo };
  };

  it('_flattenedResultsQuery debe envolver query base', () => {
    const { repo, resultsRepo } = makeRepo();
    const sql = repo._flattenedResultsQuery();
    expect(resultsRepo.getContributingResultsQuery).toHaveBeenCalledTimes(1);
    expect(sql).toContain('from (SELECT 1) inner_q');
  });

  it('_getTocResultSubquery debe generar SQL con outerRelationName', () => {
    const { repo } = makeRepo();
    const q = repo._getTocResultSubquery('eoi');
    expect(q).toContain('"toc_result_id", eoi.id');
    expect(q).toContain('json_object');
  });

  it('_query debe retornar data cuando dataSource.query resuelve', async () => {
    const { repo, dataSource } = makeRepo();
    dataSource.query.mockResolvedValue([{ a: 1 }]);

    await expect(repo._query('SQL', [1])).resolves.toEqual([{ a: 1 }]);
    expect(dataSource.query).toHaveBeenCalledWith('SQL', [1]);
  });

  it('_query debe lanzar error formateado cuando dataSource.query falla', async () => {
    const { repo, dataSource, handlersError } = makeRepo();
    dataSource.query.mockRejectedValue(new Error('x'));

    await expect(repo._query('SQL', [])).rejects.toBeInstanceOf(Error);
    expect(handlersError.returnErrorRepository).toHaveBeenCalledTimes(1);
  });

  it('_supportingResults debe remover inactivos usando resultsRepo.removeInactives', async () => {
    const { repo, dataSource, resultsRepo } = makeRepo();
    dataSource.query.mockResolvedValue([
      {
        results: [
          { contribution_id: 1, is_active: false },
          { contribution_id: null, is_active: false },
          { contribution_id: 2, is_active: true },
        ],
      },
    ]);

    const out = await repo._supportingResults('uuid');
    expect(resultsRepo.removeInactives).toHaveBeenCalledTimes(1);
    expect(out).toEqual([
      { contribution_id: null, is_active: false },
      { contribution_id: 2, is_active: true },
    ]);
  });

  it('_enrichIndicators debe setear indicator_supporting_results', async () => {
    const { repo } = makeRepo();
    const supportingSpy = jest
      .spyOn(repo, '_supportingResults')
      .mockResolvedValue([{ ok: true }] as any);

    const toc: any = [
      { indicators: [{ indicator_uuid: 'u1' }, { indicator_uuid: 'u2' }] },
    ];
    await repo._enrichIndicators(toc);

    expect(supportingSpy).toHaveBeenCalledTimes(2);
    expect(toc[0].indicators[0].indicator_supporting_results).toEqual([{ ok: true }]);
  });

  it('findAllEoisByInitiativeCode debe usar _query y _enrichIndicators', async () => {
    const { repo } = makeRepo();
    jest.spyOn(repo, '_query').mockResolvedValue([
      { eois: [{ indicators: [{ indicator_uuid: 'u1' }] }] },
    ]);
    const enrichSpy = jest
      .spyOn(repo, '_enrichIndicators')
      .mockResolvedValue(undefined as any);

    const res = await repo.findAllEoisByInitiativeCode('INIT');
    expect(res).toHaveLength(1);
    expect(enrichSpy).toHaveBeenCalledTimes(1);
  });

  it('findAllOutcomesByInitiativeCode debe mapear workpackage y enriquecer', async () => {
    const { repo } = makeRepo();
    jest.spyOn(repo, '_query').mockResolvedValue([
      { workpackage: { toc_results: [{ indicators: [{ indicator_uuid: 'u1' }] }] } },
    ]);
    const enrichSpy = jest
      .spyOn(repo, '_enrichIndicators')
      .mockResolvedValue(undefined as any);

    const res = await repo.findAllOutcomesByInitiativeCode('INIT');
    expect(res).toHaveLength(1);
    expect(enrichSpy).toHaveBeenCalledTimes(1);
  });
});

