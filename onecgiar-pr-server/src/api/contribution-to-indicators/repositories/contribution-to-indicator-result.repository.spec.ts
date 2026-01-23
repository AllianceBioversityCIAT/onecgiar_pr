import { ContributionToIndicatorResultsRepository } from './contribution-to-indicator-result.repository';

describe('ContributionToIndicatorResultsRepository', () => {
  const makeRepo = () => {
    const dataSource = {
      createEntityManager: jest.fn(() => ({})),
      query: jest.fn(),
    } as any;

    const handlersError = {
      returnErrorRepository: jest.fn(() => new Error('repo-error')),
    } as any;

    const repo = new ContributionToIndicatorResultsRepository(
      dataSource,
      handlersError,
    ) as any;

    return { repo, dataSource, handlersError };
  };

  it('removeInactives debe filtrar por is_active cuando contribution_id existe', () => {
    const { repo } = makeRepo();
    expect(
      repo.removeInactives([
        { contribution_id: 1, is_active: false },
        { contribution_id: 2, is_active: true },
        { contribution_id: null, is_active: false },
      ]),
    ).toEqual([
      { contribution_id: 2, is_active: true },
      { contribution_id: null, is_active: false },
    ]);
  });

  it('getContributingResultsQuery debe retornar SQL', () => {
    const { repo } = makeRepo();
    const sql = repo.getContributingResultsQuery();
    expect(sql).toContain('select');
    expect(sql).toContain('union');
  });

  it('findResultContributionsByTocId debe consultar y aplicar removeInactives', async () => {
    const { repo, dataSource } = makeRepo();
    dataSource.query.mockResolvedValue([
      { contribution_id: 1, is_active: false },
      { contribution_id: 2, is_active: true },
      { contribution_id: null, is_active: false },
    ]);

    const res = await repo.findResultContributionsByTocId('toc');
    expect(res).toEqual([
      { contribution_id: 2, is_active: true },
      { contribution_id: null, is_active: false },
    ]);
  });

  it('findBasicContributionIndicatorDataByTocId debe retornar primer row o lanzar error formateado', async () => {
    const { repo, dataSource, handlersError } = makeRepo();
    dataSource.query.mockResolvedValueOnce([{ a: 1 }]);
    await expect(repo.findBasicContributionIndicatorDataByTocId('x')).resolves.toEqual({
      a: 1,
    });

    dataSource.query.mockResolvedValueOnce([]);
    await expect(repo.findBasicContributionIndicatorDataByTocId('x')).rejects.toBeInstanceOf(
      Error,
    );
    expect(handlersError.returnErrorRepository).toHaveBeenCalled();
  });
});

