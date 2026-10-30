import { HttpStatus } from '@nestjs/common';
import { ImpactLevelSearchService } from './impact-level-search.service';

/** IRS-T-6 — E5/E6 input gates (design §4.1: the service checks are the gate, no global pipe). */
const build = (activePhase: { id: number } | null = { id: 7 }) => {
  const searchRepo = {
    search: jest
      .fn()
      .mockResolvedValue({ items: [{ result_id: 1 }], total: 45 }),
  };
  const countsRepo = {
    countByArea: jest.fn().mockResolvedValue({ areas: [], total: 0 }),
  };
  const versioning = {
    $_findActivePhase: jest.fn().mockResolvedValue(activePhase),
  };
  const handlers = {
    returnErrorRes: jest.fn((c) => ({
      response: {},
      message: c.error.message,
      status: c.error.status ?? 500,
    })),
  };
  const service = new ImpactLevelSearchService(
    searchRepo as any,
    countsRepo as any,
    versioning as any,
    handlers as any,
  );
  return { service, searchRepo, countsRepo, versioning };
};

describe('ImpactLevelSearchService.searchPreviousResults (IRS-R-10 / E5)', () => {
  it('returns items with meta and defaults page 1 / limit 20', async () => {
    const { service, searchRepo } = build();
    const res = await service.searchPreviousResults({ q: 'maize' } as any);
    expect(res.status).toBe(HttpStatus.OK);
    expect(res.response).toEqual({
      items: [{ result_id: 1 }],
      meta: { total: 45, page: 1, limit: 20, totalPages: 3 },
    });
    expect(searchRepo.search).toHaveBeenCalledWith(
      expect.objectContaining({
        q: 'maize',
        page: 1,
        limit: 20,
        activeVersionId: 7,
      }),
    );
  });

  it('accepts limit 50 and rejects limit 51 with 400 (no query is run)', async () => {
    const ok = build();
    await expect(
      ok.service.searchPreviousResults({ limit: '50' } as any),
    ).resolves.toMatchObject({ status: HttpStatus.OK });

    const bad = build();
    const res = await bad.service.searchPreviousResults({ limit: '51' } as any);
    expect(res.status).toBe(HttpStatus.BAD_REQUEST);
    expect(res.message).toBe('limit must be an integer between 1 and 50');
    expect(bad.searchRepo.search).not.toHaveBeenCalled();
  });

  it.each([
    [{ limit: '0' }, 'limit must be an integer between 1 and 50'],
    [{ limit: 'abc' }, 'limit must be an integer between 1 and 50'],
    [{ page: '0' }, 'page must be an integer greater than or equal to 1'],
    [{ page: '1.5' }, 'page must be an integer greater than or equal to 1'],
    [{ typeIds: '1,x' }, 'typeIds must be a comma-separated list of integers'],
    [{ versionId: 'x' }, 'versionId must be an integer'],
    [{ portfolioId: '-1' }, 'portfolioId must be an integer'],
    [{ excludeResultId: 'z' }, 'excludeResultId must be an integer'],
  ])('rejects %j with 400', async (query, message) => {
    const { service, searchRepo } = build();
    const res = await service.searchPreviousResults(query as any);
    expect(res.status).toBe(HttpStatus.BAD_REQUEST);
    expect(res.message).toBe(message);
    expect(searchRepo.search).not.toHaveBeenCalled();
  });

  it('parses filters to numbers and passes the active reporting phase id (null when none open)', async () => {
    const { service, searchRepo, versioning } = build(null);
    await service.searchPreviousResults({
      versionId: '3',
      portfolioId: '4',
      typeIds: '1, 7',
      excludeResultId: '55',
      page: '2',
      limit: '10',
    } as any);
    expect(versioning.$_findActivePhase).toHaveBeenCalledWith(1);
    expect(searchRepo.search).toHaveBeenCalledWith({
      q: undefined,
      versionId: 3,
      portfolioId: 4,
      typeIds: [1, 7],
      excludeResultId: 55,
      page: 2,
      limit: 10,
      activeVersionId: null,
    });
  });

  it('reports totalPages 1 for an empty result', async () => {
    const { service, searchRepo } = build();
    searchRepo.search.mockResolvedValue({ items: [], total: 0 });
    const res = await service.searchPreviousResults({} as any);
    expect((res.response as any).meta).toEqual({
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
  });
});

describe('ImpactLevelSearchService.getCounts (IRS-R-11 / E6)', () => {
  it('delegates with numeric ids and returns the aggregate', async () => {
    const { service, countsRepo } = build();
    countsRepo.countByArea.mockResolvedValue({
      areas: [{ impact_area_id: 1, count: 0 }],
      total: 0,
    });
    const res = await service.getCounts({
      initiativeId: '11',
      versionId: '3',
    } as any);
    expect(res.status).toBe(HttpStatus.OK);
    expect(countsRepo.countByArea).toHaveBeenCalledWith(11, 3);
    expect(res.response).toEqual({
      areas: [{ impact_area_id: 1, count: 0 }],
      total: 0,
    });
  });

  it.each([
    [{ versionId: '3' }],
    [{ initiativeId: '11' }],
    [{}],
    [{ initiativeId: 'x', versionId: '3' }],
  ])('rejects %j with 400 and runs no query', async (query) => {
    const { service, countsRepo } = build();
    const res = await service.getCounts(query as any);
    expect(res.status).toBe(HttpStatus.BAD_REQUEST);
    expect(res.message).toBe(
      'initiativeId and versionId are required integers',
    );
    expect(countsRepo.countByArea).not.toHaveBeenCalled();
  });
});
