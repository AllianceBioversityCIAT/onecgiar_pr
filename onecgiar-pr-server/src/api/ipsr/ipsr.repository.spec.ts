import { DataSource } from 'typeorm';
import { IpsrRepository } from './ipsr.repository';

describe('IpsrRepository (unit)', () => {
  let repo: IpsrRepository;
  let dsQuery: jest.Mock;
  let repoQuery: jest.Mock;

  const mockDataSource = {
    createEntityManager: jest.fn(() => ({}) as any),
    query: jest.fn(),
  } as unknown as DataSource;

  const mockHandlersError = {
    returnErrorRepository: jest.fn((e) => e),
  } as any;

  beforeEach(() => {
    // fresh mocks
    (mockDataSource.createEntityManager as any).mockClear?.();
    (mockDataSource.query as any).mockClear?.();
    repo = new IpsrRepository(mockDataSource, mockHandlersError);
    dsQuery = mockDataSource.query as any as jest.Mock;
    repoQuery = jest.fn();
    // Override BaseRepository.query method
    (repo as any).query = repoQuery;
  });

  it('constructs repository', () => {
    expect(repo).toBeDefined();
    expect((mockDataSource.createEntityManager as any).mock.calls.length).toBe(
      1,
    );
  });

  it('fisicalDelete issues delete query', async () => {
    repoQuery.mockResolvedValueOnce({ ok: true });
    const res = await repo.fisicalDelete(123);
    expect(repoQuery).toHaveBeenCalledTimes(1);
    const [sql, params] = repoQuery.mock.calls[0];
    expect(sql.toLowerCase()).toContain('delete rbip');
    expect(params).toEqual([123]);
    expect(res).toEqual({ ok: true });
  });

  it('logicalDelete issues update query', async () => {
    repoQuery.mockResolvedValueOnce({ ok: true });
    const res = await repo.logicalDelete(456);
    const [sql, params] = repoQuery.mock.calls[0];
    expect(sql.toLowerCase()).toContain('update result_by_innovation_package');
    expect(params).toEqual([456]);
    expect(res).toEqual({ ok: true });
  });

  it('getResultsInnovation returns array and uses IN (?) parameter', async () => {
    const rows = [{ id: 1 }];
    dsQuery.mockResolvedValueOnce(rows);
    const res = await repo.getResultsInnovation([1, 2, 3]);
    expect(dsQuery).toHaveBeenCalledTimes(1);
    const [sql, params] = dsQuery.mock.calls[0];
    expect(sql).toContain('IN (?)');
    expect(params).toEqual([[1, 2, 3]]);
    expect(res).toEqual(rows);
  });

  it('getResultsInnovation propagates handler error on failure', async () => {
    dsQuery.mockRejectedValueOnce(new Error('boom'));
    await expect(repo.getResultsInnovation([5])).rejects.toBeDefined();
  });

  it('getResultInnovationDetail returns first row', async () => {
    const row = { result_id: 9 };
    dsQuery.mockResolvedValueOnce([row]);
    const res = await repo.getResultInnovationDetail(9);
    expect(dsQuery).toHaveBeenCalled();
    expect(res).toEqual(row);
  });

  it('getResultInnovationById maps regions, countries and subnational', async () => {
    // 1) main innovation row (no lead_contact_person_id to avoid extra query)
    dsQuery.mockResolvedValueOnce([
      { result_id: 10, lead_contact_person_id: null },
    ]);
    // 2) regions
    dsQuery.mockResolvedValueOnce([
      { result_region_id: 1, result_id: 10, id: 100, name: 'R1' },
    ]);
    // 3) countries
    dsQuery.mockResolvedValueOnce([
      {
        result_country_id: 20,
        result_id: 10,
        id: 200,
        name: 'C1',
        iso_alpha_2: 'AA',
      },
    ]);
    // 4) sub national for country id 20
    dsQuery.mockResolvedValueOnce([
      { id: 300, result_countries_id: 20, name: 'SN1' },
    ]);

    const res = await repo.getResultInnovationById(10);
    expect(Array.isArray(res)).toBe(true);
    expect(res.length).toBe(1);
    const item: any = res[0];
    expect(Array.isArray(item.hasRegions)).toBe(true);
    expect(item.hasRegions[0].result_region_id).toBe(1);
    expect(Array.isArray(item.hasCountries)).toBe(true);
    expect(item.hasCountries[0].result_countries_sub_national[0].name).toBe(
      'SN1',
    );
  });

  it('getIpsrList builds query with two placeholders and returns list', async () => {
    const rows = [{ id: 1 }];
    dsQuery.mockResolvedValueOnce(rows);
    const excelDto = {
      inits: [{ id: 1 }],
      phases: [{ id: 2 }],
      searchText: 'abc',
    } as any;
    const res = await repo.getIpsrList(excelDto);
    const [sql, params] = dsQuery.mock.calls[0];
    expect(sql).toContain('ORDER BY');
    expect(params).toEqual(['?', '?']);
    expect(res).toEqual(rows);
  });
});
