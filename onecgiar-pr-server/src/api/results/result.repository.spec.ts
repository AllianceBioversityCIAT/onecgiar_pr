import { HttpStatus } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ResultRepository } from './result.repository';

describe('ResultRepository (unit)', () => {
  let repo: ResultRepository;
  let queryMock: jest.Mock;

  const mockDataSource = {
    createEntityManager: jest.fn(() => ({}) as any),
  } as unknown as DataSource;

  const mockHandlersError = {
    returnErrorRepository: jest.fn((e) => e),
  } as any;

  beforeEach(() => {
    repo = new ResultRepository(mockDataSource, mockHandlersError);
    queryMock = jest.fn();

    (repo as any).query = queryMock;
  });

  it('builds IN clauses for array filters and paginates', async () => {
    const items = [{ id: 1, title: 'A' }];
    queryMock
      .mockResolvedValueOnce(items)
      .mockResolvedValueOnce([{ total: 1 }]);

    const res = await repo.AllResultsByRoleUserAndInitiativeFiltered(
      7,
      {
        initiativeCode: ['I1', 'I2'],
        versionId: [1, 2],
        submitterId: [10],
        resultTypeId: [3],
        portfolioId: [5],
        statusId: [1, 2],
      },
      [10, 11],
      { limit: 10, offset: 0 },
    );

    expect(res.results).toEqual(items);
    expect(res.total).toBe(1);

    const [sql, params] = queryMock.mock.calls[0];
    expect(sql).toContain('ci.official_code IN (?,?)');
    expect(sql).toContain('r.version_id IN (?,?)');
    expect(sql).toContain('ci.id IN (?)');
    expect(sql).toContain('rt.id IN (?)');
    expect(sql).toContain('ci.portfolio_id IN (?)');
    expect(sql).toContain('r.status_id IN (?,?)');
    expect(sql).toContain('LIMIT 10');
    expect(sql).toContain('OFFSET 0');

    expect(params).toEqual([7, 'I1', 'I2', 1, 2, 10, 3, 5, 1, 2]);

    const [countSql, countParams] = queryMock.mock.calls[1];
    expect(countSql).toContain('SELECT COUNT(1) as total FROM (');
    expect(countParams).toEqual(params);
  });

  it('supports single filter values without pagination', async () => {
    const items = [{ id: 2 }];
    queryMock.mockResolvedValueOnce(items);

    const res = await repo.AllResultsByRoleUserAndInitiativeFiltered(9, {
      initiativeCode: 'ABC',
      versionId: 1,
      submitterId: 22,
      resultTypeId: 4,
      portfolioId: 6,
      statusId: 1,
    });

    expect(res.results).toEqual(items);
    expect(res.total).toBe(1);

    const [sql, params] = queryMock.mock.calls[0];
    expect(sql).toContain('ci.official_code IN (?)');
    expect(params).toEqual([9, 'ABC', 1, 22, 4, 6, 1]);
  });

  it('throws INTERNAL_SERVER_ERROR on query failure', async () => {
    queryMock.mockRejectedValueOnce(new Error('db error'));

    await expect(
      repo.AllResultsByRoleUserAndInitiativeFiltered(1, {
        initiativeCode: ['X'],
      }),
    ).rejects.toMatchObject({ status: HttpStatus.INTERNAL_SERVER_ERROR });
  });
});
