// @akili-spec quality-assurance/qa-results-feed
import 'reflect-metadata';
import {
  BadRequestException,
  HttpException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { QaCatalogService } from './qa-catalog.service';
import {
  EligibilityFilter,
  EligibleBreakdown,
  EligiblePageRequest,
  EligibleResultRow,
  QaResultsRepository,
} from './qa-results.repository';
import { QaResultsService } from './qa-results.service';

interface FakeRow extends EligibleResultRow {
  type: string;
}

const row = (
  id: number,
  program: number,
  type: string,
  at: string,
): FakeRow => ({
  result_id: id,
  result_code: 9000 + id,
  program: { clarisa_id: program, code: `INIT-${program}` },
  result_type_key: type,
  submitted_at: at,
  type,
});

/**
 * In-memory stand-in for the repository seam: it honours the filter the service passes, so `total`
 * only comes out right if the service hands the SAME filter to `count` as to `findPage`.
 * SQL semantics are not proven here (QRF-T-8).
 */
class FakeRepository {
  constructor(private readonly rows: FakeRow[]) {}
  readonly findPage = jest.fn(
    async (req: EligiblePageRequest): Promise<EligibleResultRow[]> =>
      this.filtered(req)
        .slice((req.page - 1) * req.pageSize, req.page * req.pageSize)
        .map(({ type: _type, ...item }) => item),
  );
  readonly count = jest.fn(
    async (filter: EligibilityFilter): Promise<number> =>
      this.filtered(filter).length,
  );
  readonly breakdown = jest.fn(
    async (filter: EligibilityFilter): Promise<EligibleBreakdown> => {
      const rows = this.filtered(filter);
      const byProgram = new Map<number, { code: string; count: number }>();
      const byType = new Map<string, number>();
      for (const r of rows) {
        const p = byProgram.get(r.program.clarisa_id) ?? {
          code: r.program.code,
          count: 0,
        };
        p.count += 1;
        byProgram.set(r.program.clarisa_id, p);
        byType.set(r.type, (byType.get(r.type) ?? 0) + 1);
      }
      return {
        by_program: [...byProgram].map(([clarisa_id, v]) => ({
          clarisa_id,
          ...v,
        })),
        by_result_type: [...byType].map(([key, count]) => ({ key, count })),
      };
    },
  );
  private filtered(filter: EligibilityFilter): FakeRow[] {
    return this.rows.filter(
      (r) =>
        (!filter.programIds?.length ||
          filter.programIds.includes(r.program.clarisa_id)) &&
        (!filter.resultTypeKeys?.length ||
          filter.resultTypeKeys.includes(r.type)),
    );
  }
}

const FIXTURE: FakeRow[] = [
  row(1, 5, 'policy_change', '2026-03-01T10:00:00.000Z'),
  row(2, 5, 'policy_change', '2026-03-02T10:00:00.000Z'),
  row(3, 5, 'knowledge_product', '2026-03-03T10:00:00.000Z'),
  row(4, 7, 'policy_change', '2026-03-04T10:00:00.000Z'),
  row(5, 7, 'knowledge_product', '2026-03-05T10:00:00.000Z'),
];

const build = (rows: FakeRow[] = FIXTURE) => {
  const repo = new FakeRepository(rows);
  const service = new QaResultsService(
    new QaCatalogService(),
    repo as unknown as QaResultsRepository,
  );
  return { repo, service };
};

const query = (over: Record<string, unknown> = {}) => ({
  phase_year: 2026,
  program_ids: [] as number[],
  result_type_keys: [] as string[],
  page: 1,
  page_size: 100,
  ...over,
});

describe('QaResultsService.list', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });
  afterEach(() => jest.restoreAllMocks());

  it('returns the body keys phase, page, page_size, total, breakdown, items (QRF-R-5)', async () => {
    const { service } = build();
    const res = await service.list(query());
    expect(Object.keys(res).sort()).toEqual(
      ['breakdown', 'items', 'page', 'page_size', 'phase', 'total'].sort(),
    );
    expect(res.phase).toBe(2026);
    expect(res.page).toBe(1);
    expect(res.page_size).toBe(100);
    expect(res.total).toBe(5);
    expect(res.items).toHaveLength(5);
    expect(res.items[0]).toEqual({
      result_id: 1,
      result_code: 9001,
      program: { clarisa_id: 5, code: 'INIT-5' },
      result_type_key: 'policy_change',
      submitted_at: '2026-03-01T10:00:00.000Z',
    });
  });

  it('filter program_ids=5: total counts the FILTERED set (3, not 5) - scenario Filter by program and type', async () => {
    const { service, repo } = build();
    const res = await service.list(query({ program_ids: [5] }));
    expect(res.total).toBe(3);
    expect(res.items.map((i) => i.result_id)).toEqual([1, 2, 3]);
    expect(repo.count).toHaveBeenCalledWith(
      expect.objectContaining({ phaseYear: 2026, programIds: [5] }),
    );
  });

  it('program 5 AND policy_change: only program 5 policy changes; total 2; breakdown over the filtered set', async () => {
    const { service } = build();
    const res = await service.list(
      query({ program_ids: [5], result_type_keys: ['policy_change'] }),
    );
    expect(res.items.map((i) => i.result_id)).toEqual([1, 2]);
    expect(res.total).toBe(2);
    expect(res.breakdown).toEqual({
      by_program: [{ clarisa_id: 5, code: 'INIT-5', count: 2 }],
      by_result_type: [{ key: 'policy_change', count: 2 }],
    });
  });

  it('an unknown program id matches nothing: 200 with an empty page and total 0', async () => {
    const { service } = build();
    const res = await service.list(query({ program_ids: [999] }));
    expect(res.items).toEqual([]);
    expect(res.total).toBe(0);
  });

  it('a page past the end returns empty items and the REAL total', async () => {
    const { service } = build();
    const res = await service.list(query({ page: 4, page_size: 2 }));
    expect(res.items).toEqual([]);
    expect(res.total).toBe(5);
    expect(res.page).toBe(4);
    expect(res.page_size).toBe(2);
  });

  it('pages through the repository with the requested page and size', async () => {
    const { service, repo } = build();
    const res = await service.list(query({ page: 2, page_size: 2 }));
    expect(res.items.map((i) => i.result_id)).toEqual([3, 4]);
    expect(repo.findPage).toHaveBeenCalledWith(
      expect.objectContaining({ phaseYear: 2026, page: 2, pageSize: 2 }),
    );
  });

  describe('year and key validation', () => {
    it('a year with no catalog -> 404 and nothing is read', async () => {
      const { service, repo } = build();
      await expect(service.list(query({ phase_year: 2023 }))).rejects.toThrow(
        new NotFoundException('No QA catalog available for phase_year 2023'),
      );
      expect(repo.findPage).not.toHaveBeenCalled();
      expect(repo.count).not.toHaveBeenCalled();
    });

    it('an unknown result_type_keys value -> 400 naming it, nothing is read', async () => {
      const { service, repo } = build();
      const call = service.list(
        query({ result_type_keys: ['policy_change', 'not_a_type'] }),
      );
      await expect(call).rejects.toBeInstanceOf(BadRequestException);
      await expect(call).rejects.toThrow(/not_a_type/);
      await expect(call).rejects.not.toThrow(/policy_change/);
      expect(repo.findPage).not.toHaveBeenCalled();
    });

    it('a catalogued key is accepted', async () => {
      const { service } = build();
      await expect(
        service.list(query({ result_type_keys: ['knowledge_product'] })),
      ).resolves.toEqual(expect.objectContaining({ total: 2 }));
    });
  });

  describe('repository failure (QRF NFR Security; design.md section 7)', () => {
    // What mysql2 / TypeORM put in a QueryFailedError message: SQL, table and column names, ids.
    const SQL_LEAK =
      "You have an error in your SQL syntax; check the manual near '1e+21' at line 7: SELECT r.id, r.result_code FROM `result` r WHERE r.id = 31084";
    const buildFailing = (failWith: unknown, failingMethod = 'findPage') => {
      const { repo, service } = build();
      (repo as unknown as Record<string, jest.Mock>)[
        failingMethod
      ].mockRejectedValue(failWith);
      return { repo, service };
    };

    it.each(['findPage', 'count', 'breakdown'])(
      'a failing repository.%s -> generic 500 whose message carries no SQL, table, column or id',
      async (failingMethod) => {
        const { service } = buildFailing(new Error(SQL_LEAK), failingMethod);
        const call = service.list(query({ program_ids: [5] }));
        await expect(call).rejects.toBeInstanceOf(InternalServerErrorException);
        const error = (await call.catch((e) => e)) as HttpException;
        expect(error.getStatus()).toBe(500);
        const body = JSON.stringify([error.message, error.getResponse()]);
        expect(body).not.toMatch(
          /SELECT|FROM|WHERE|syntax|1e\+21|result_code|`result`|31084/i,
        );
      },
    );

    it('an HttpException from the repository is rethrown unchanged', async () => {
      const original = new BadRequestException('already shaped');
      const { service } = buildFailing(original);
      await expect(service.list(query())).rejects.toBe(original);
    });

    it('logs route, year and the error class only: no SQL, no driver message, no filter values', async () => {
      const logError = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation();
      const { service } = buildFailing(new Error(SQL_LEAK));
      await service
        .list(query({ program_ids: [5], result_type_keys: ['policy_change'] }))
        .catch(() => undefined);
      const lines = logError.mock.calls.map((c) => c.map(String).join(' '));
      expect(lines).toHaveLength(1);
      expect(lines[0]).toContain('/api/qa/results');
      expect(lines[0]).toMatch(/year=2026/);
      expect(lines[0]).not.toMatch(
        /SELECT|FROM|syntax|1e\+21|policy_change|program_ids|31084/i,
      );
    });
  });

  describe('log line (QRF NFR)', () => {
    it('logs route, year, items, total and duration - never ids, filters or SQL', async () => {
      const log = Logger.prototype.log as jest.Mock;
      log.mockClear();
      const { service } = build();
      await service.list(
        query({ program_ids: [5], result_type_keys: ['policy_change'] }),
      );
      const lines = log.mock.calls.map((c) => String(c[0]));
      expect(lines).toHaveLength(1);
      expect(lines[0]).toContain('/api/qa/results');
      expect(lines[0]).toMatch(/year=2026/);
      expect(lines[0]).toMatch(/items=2/);
      expect(lines[0]).toMatch(/eligible=2/);
      expect(lines[0]).toMatch(/duration_ms=\d+/);
      expect(lines[0]).not.toMatch(/policy_change|program|SELECT|9001/i);
    });
  });
});
