// @akili-spec quality-assurance/qa-intake
import {
  HttpException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { QaCatalogService } from './qa-catalog.service';
import { QaIntakeRepository } from './qa-intake.repository';
import { QaIntakeService } from './qa-intake.service';
import { QaResultsRepository } from './qa-results.repository';

/**
 * A fixture runner with a real transaction boundary. There is no SQL engine in this repo, so the runner dispatches on the
 * statements the REAL `QaResultsRepository.classify` and `QaIntakeRepository` emit and applies their effect to in-memory rows:
 * `dataSource.query` writes the committed state directly; `dataSource.transaction(cb)` hands `cb` a `manager` whose writes go to
 * a staged copy that replaces the committed state only if `cb` resolves. A statement that skips `manager` is therefore visible.
 */
interface FixtureRow {
  id: number;
  result_code: number;
  is_active: number;
  status_id: number;
  source: string;
  result_type_id: number;
  phase_year: number;
  app_module_id: number;
  has_lead_program: number;
  in_qa: number;
}
interface AuditRow {
  result_id: number;
  action: string;
  phase_year: number;
  platform_id: number;
  platform_acronym: string;
}
interface Db {
  rows: FixtureRow[];
  audit: AuditRow[];
}
interface Call {
  via: 'manager' | 'dataSource';
  kind: 'classify' | 'lock' | 'update' | 'insert';
  sql: string;
  params: unknown[];
}

const clone = (db: Db): Db => JSON.parse(JSON.stringify(db));
const eligible = (id: number, over: Partial<FixtureRow> = {}): FixtureRow => ({
  id,
  result_code: 7000 + id,
  is_active: 1,
  status_id: 3,
  source: 'Result',
  result_type_id: 6,
  phase_year: 2026,
  app_module_id: 1,
  has_lead_program: 1,
  in_qa: 0,
  ...over,
});

function buildRunner(initial: Db) {
  let committed = clone(initial);
  const calls: Call[] = [];
  let lastManager: EntityManager | undefined;
  const hooks: {
    beforeUpdate?: (state: Db) => void;
    failOnInsert?: Error;
  } = {};

  const exec = (
    state: Db,
    via: Call['via'],
    sql: string,
    params: unknown[] = [],
  ): unknown => {
    if (/has_lead_program/.test(sql)) {
      calls.push({ via, kind: 'classify', sql, params });
      return state.rows
        .filter((r) => params.includes(r.id))
        .map(({ in_qa: _in_qa, id, ...rest }) => ({ result_id: id, ...rest }));
    }
    if (/FOR UPDATE\s*$/.test(sql)) {
      calls.push({ via, kind: 'lock', sql, params });
      return state.rows
        .filter((r) => params.includes(r.id))
        .sort((a, b) => a.id - b.id)
        .map((r) => ({ id: r.id, in_qa: r.in_qa }));
    }
    if (/^UPDATE `result`/.test(sql)) {
      calls.push({ via, kind: 'update', sql, params });
      hooks.beforeUpdate?.(state);
      let affectedRows = 0;
      for (const r of state.rows) {
        if (
          params.includes(r.id) &&
          r.is_active === 1 &&
          r.status_id === 3 &&
          r.in_qa === 0
        ) {
          r.in_qa = 1;
          affectedRows += 1;
        }
      }
      return { affectedRows };
    }
    if (/^INSERT INTO `result_qa_intake_log`/.test(sql)) {
      calls.push({ via, kind: 'insert', sql, params });
      if (hooks.failOnInsert) throw hooks.failOnInsert;
      for (let i = 0; i < params.length; i += 5) {
        const [result_id, action, phase_year, platform_id, platform_acronym] =
          params.slice(i, i + 5) as [number, string, number, number, string];
        state.audit.push({
          result_id,
          action,
          phase_year,
          platform_id,
          platform_acronym,
        });
      }
      return { affectedRows: params.length / 5 };
    }
    throw new Error(`unexpected statement: ${sql}`);
  };

  const dataSource = {
    query: async (sql: string, params?: unknown[]) =>
      exec(committed, 'dataSource', sql, params),
    transaction: async <T>(cb: (m: EntityManager) => Promise<T>) => {
      const staged = clone(committed);
      const manager = {
        query: async (sql: string, params?: unknown[]) =>
          exec(staged, 'manager', sql, params),
      } as unknown as EntityManager;
      lastManager = manager;
      const out = await cb(manager);
      committed = staged; // commit only when the callback resolved
      return out;
    },
  };
  return {
    dataSource: dataSource as unknown as DataSource,
    calls,
    hooks,
    get committed() {
      return committed;
    },
    get manager() {
      return lastManager;
    },
  };
}

const PLATFORM = { id: 7, name: 'QA Platform', acronym: 'QAP' };
const YEAR = 2026;

/** A eligible/0 · B eligible/1 · C Editing · D absent (QIN-R-3 "Mixed batch"). */
const MIXED: Db = {
  rows: [eligible(1), eligible(2, { in_qa: 1 }), eligible(3, { status_id: 1 })],
  audit: [],
};

function build(initial: Db = MIXED) {
  const runner = buildRunner(initial);
  const resultsRepo = new QaResultsRepository(runner.dataSource);
  const service = new QaIntakeService(
    new QaCatalogService(),
    resultsRepo,
    new QaIntakeRepository(),
    runner.dataSource,
  );
  return { service, runner, resultsRepo };
}

describe('QaIntakeService.intake (QIN-T-2)', () => {
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  beforeEach(() => {
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });
  afterEach(() => jest.restoreAllMocks());

  describe('Mixed batch (QIN-R-3, QIN-R-5, QIN-R-9) - falsifier (a)', () => {
    it('reports every id in request order and updates and audits only the one that changed', async () => {
      const { service, runner } = build();
      const out = await service.intake(
        { phase_year: YEAR, result_ids: [1, 2, 3, 999] },
        PLATFORM,
      );

      expect(out).toEqual({
        phase_year: YEAR,
        taken: [
          { result_id: 1, result_code: 7001, changed: true },
          { result_id: 2, result_code: 7002, changed: false },
        ],
        not_taken: [
          { result_id: 3, result_code: 7003, reason: 'not_submitted' },
          { result_id: 999, result_code: null, reason: 'not_found' },
        ],
      });

      const updates = runner.calls.filter((c) => c.kind === 'update');
      expect(updates).toHaveLength(1);
      expect(updates[0].params).toEqual([1]);

      expect(runner.committed.audit).toEqual([
        {
          result_id: 1,
          action: 'intake',
          phase_year: YEAR,
          platform_id: 7,
          platform_acronym: 'QAP',
        },
      ]);
      expect(runner.committed.rows).toEqual([
        eligible(1, { in_qa: 1 }),
        eligible(2, { in_qa: 1 }),
        eligible(3, { status_id: 1 }),
      ]);
    });

    it("classifies with the feed's real SQL: no eligibility predicate, so the failing reason is observable", async () => {
      const { service, runner } = build();
      await service.intake({ phase_year: YEAR, result_ids: [1] }, PLATFORM);
      const classify = runner.calls.find((c) => c.kind === 'classify');
      expect(classify.sql).toMatch(/^WHERE r\.id IN \(\?\)$/m);
      expect(classify.sql).not.toMatch(/r\.status_id = 3|r\.source = 'Result'/);
    });

    it('collapses duplicate ids keeping the first appearance (QIN-R-2)', async () => {
      const { service, runner } = build();
      const out = await service.intake(
        { phase_year: YEAR, result_ids: [3, 1, 3, 1, 2] },
        PLATFORM,
      );
      expect(out.taken.map((t) => t.result_id)).toEqual([1, 2]);
      expect(out.not_taken.map((t) => t.result_id)).toEqual([3]);
      expect(runner.calls.find((c) => c.kind === 'lock').params).toEqual([
        3, 1, 2,
      ]);
    });

    it('is idempotent: repeating the call changes nothing and writes no audit row (QIN-R-3, R-5)', async () => {
      const { service, runner } = build();
      await service.intake({ phase_year: YEAR, result_ids: [1, 2] }, PLATFORM);
      const after1 = JSON.stringify(runner.committed);
      const statements = runner.calls.length;
      const out = await service.intake(
        { phase_year: YEAR, result_ids: [1, 2] },
        PLATFORM,
      );
      expect(out.taken.map((t) => t.changed)).toEqual([false, false]);
      expect(JSON.stringify(runner.committed)).toBe(after1);
      // second call: lock + classify only - no UPDATE, no INSERT
      expect(runner.calls.slice(statements).map((c) => c.kind)).toEqual([
        'lock',
        'classify',
      ]);
    });

    it('a batch with nothing eligible runs no UPDATE and no INSERT', async () => {
      const { service, runner } = build();
      const out = await service.intake(
        { phase_year: YEAR, result_ids: [3, 999] },
        PLATFORM,
      );
      expect(out.taken).toEqual([]);
      expect(runner.calls.map((c) => c.kind)).toEqual(['lock', 'classify']);
    });
  });

  describe('year without a catalog (QIN-R-2)', () => {
    it('404 and nothing is opened, read or written', async () => {
      const { service, runner } = build();
      await expect(
        service.intake({ phase_year: 2023, result_ids: [1] }, PLATFORM),
      ).rejects.toThrow(
        new NotFoundException('No QA catalog available for phase_year 2023'),
      );
      expect(runner.calls).toEqual([]);
      expect(runner.manager).toBeUndefined();
    });
  });

  describe('atomic unit (QIN-R-5, QIN-R-8) - falsifier (b)', () => {
    it('an audit INSERT that throws rejects the call, rolls the UPDATE back and leaks no SQL', async () => {
      const { service, runner } = build();
      runner.hooks.failOnInsert = new Error(
        "Table 'prdb.result_qa_intake_log' doesn't exist: INSERT INTO `result_qa_intake_log` (result_id) VALUES (1)",
      );
      const call = service.intake(
        { phase_year: YEAR, result_ids: [1, 2, 3] },
        PLATFORM,
      );
      await expect(call).rejects.toBeInstanceOf(InternalServerErrorException);
      const error = (await call.catch((e) => e)) as HttpException;
      expect(error.getStatus()).toBe(500);
      const body = JSON.stringify([error.message, error.getResponse()]);
      expect(body).not.toMatch(
        /INSERT|UPDATE|SELECT|result_qa_intake_log|prdb|`/i,
      );

      // the UPDATE reached the (staged) connection ...
      expect(runner.calls.some((c) => c.kind === 'update')).toBe(true);
      // ... and none of it survived: no in_qa flip, no audit row
      expect(runner.committed).toEqual(MIXED);
    });

    it('every statement runs on the transaction manager, none on the DataSource', async () => {
      const { service, runner } = build();
      await service.intake(
        { phase_year: YEAR, result_ids: [1, 2, 3] },
        PLATFORM,
      );
      expect(runner.calls.map((c) => [c.kind, c.via])).toEqual([
        ['lock', 'manager'],
        ['classify', 'manager'],
        ['update', 'manager'],
        ['insert', 'manager'],
      ]);
    });
  });

  describe('CAS assertion (QIN-R-8) - falsifier (c)', () => {
    it('affectedRows below the changed count -> 500, rollback, and no audit row', async () => {
      const { service, runner } = build();
      // a concurrent writer takes id 1 In QA between classify and the UPDATE
      runner.hooks.beforeUpdate = (state) => {
        state.rows.find((r) => r.id === 1).in_qa = 1;
      };
      const call = service.intake(
        { phase_year: YEAR, result_ids: [1, 2, 3] },
        PLATFORM,
      );
      await expect(call).rejects.toBeInstanceOf(InternalServerErrorException);
      expect(runner.committed).toEqual(MIXED);
      expect(runner.calls.filter((c) => c.kind === 'insert')).toHaveLength(0);
      const line = errorSpy.mock.calls.map((c) => String(c[0])).join('\n');
      expect(line).toContain('QaIntakeCasMismatchError');
    });
  });

  describe('classify runs on the transaction (QIN-DD-2) - falsifier (d)', () => {
    it('is called with the transaction manager, not the default DataSource', async () => {
      const { service, runner, resultsRepo } = build();
      const classify = jest.spyOn(resultsRepo, 'classify');
      await service.intake({ phase_year: YEAR, result_ids: [1, 2] }, PLATFORM);
      expect(classify).toHaveBeenCalledTimes(1);
      const [ids, year, executor] = classify.mock.calls[0];
      expect(ids).toEqual([1, 2]);
      expect(year).toBe(YEAR);
      expect(runner.manager).toBeDefined();
      expect(executor).toBe(runner.manager);
    });
  });

  describe('failure boundary (design section 7 item 4)', () => {
    it('a driver failure on the lock -> generic 500 with a fixed message, class-only log', async () => {
      const { service, runner } = build();
      const leak =
        'Deadlock found when trying to get lock; SELECT r.id FROM `result` r WHERE r.id IN (31084)';
      runner.dataSource.transaction = async () => {
        throw new Error(leak);
      };
      const call = service.intake(
        { phase_year: YEAR, result_ids: [1] },
        PLATFORM,
      );
      await expect(call).rejects.toBeInstanceOf(InternalServerErrorException);
      const error = (await call.catch((e) => e)) as HttpException;
      expect(JSON.stringify([error.message, error.getResponse()])).not.toMatch(
        /SELECT|Deadlock|`result`|31084/i,
      );
      const lines = errorSpy.mock.calls.map((c) => String(c[0]));
      expect(lines).toEqual([
        'route=/api/qa/results/intake year=2026 write failed (Error)',
      ]);
    });

    it('an HttpException is rethrown unchanged', async () => {
      const { service, runner } = build();
      const original = new NotFoundException('shaped already');
      runner.dataSource.transaction = async () => {
        throw original;
      };
      await expect(
        service.intake({ phase_year: YEAR, result_ids: [1] }, PLATFORM),
      ).rejects.toBe(original);
    });
  });

  describe('log line (QIN NFR Observability) - falsifier (e)', () => {
    it('is one line: route, year, counts and duration - no id list, no key, no platform', async () => {
      const { service } = build();
      await service.intake(
        { phase_year: YEAR, result_ids: [1, 2, 3, 999] },
        PLATFORM,
      );
      const lines = logSpy.mock.calls.map((c) => String(c[0]));
      expect(lines).toHaveLength(1);
      expect(lines[0]).toMatch(
        /^route=\/api\/qa\/results\/intake year=2026 changed=1 unchanged=1 rejected=2 duration_ms=\d+$/,
      );
      expect(lines[0]).not.toMatch(/999|7001|QAP|key|\[/);
    });

    it('logs nothing on success when the call fails (the failure has its own line)', async () => {
      const { service, runner } = build();
      runner.hooks.failOnInsert = new Error('boom');
      await service
        .intake({ phase_year: YEAR, result_ids: [1] }, PLATFORM)
        .catch(() => undefined);
      expect(logSpy).not.toHaveBeenCalled();
    });
  });
});
