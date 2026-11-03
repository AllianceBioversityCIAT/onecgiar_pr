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
 * Same idea as the intake spec's runner (a fixture runner with a real staged-commit transaction boundary, dispatching on the
 * statements the REAL `QaResultsRepository.classify` and `QaIntakeRepository` emit), with one difference that matters for release:
 * the UPDATE handler INTERPRETS the statement it is given. It reads the SET assignments and the `col = n` predicates out of the SQL
 * text and applies exactly those to the in-memory rows. A repository that drops a predicate or widens the SET therefore changes
 * the committed state, not just a string the test looks at.
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
const row = (id: number, over: Partial<FixtureRow> = {}): FixtureRow => ({
  id,
  result_code: 7000 + id,
  is_active: 1,
  status_id: 3,
  source: 'Result',
  result_type_id: 6,
  phase_year: 2026,
  app_module_id: 1,
  has_lead_program: 1,
  in_qa: 1, // release starts from a result that intake took
  ...over,
});

/** The SET assignments of an UPDATE statement, e.g. `status_id = 2, in_qa = 0` -> `{ status_id: 2, in_qa: 0 }`. */
const parseSet = (sql: string): Record<string, number> => {
  const match = /^SET (.+)$/m.exec(sql);
  if (!match) throw new Error(`UPDATE without a SET line: ${sql}`);
  return Object.fromEntries(
    match[1].split(',').map((part) => {
      const [col, value] = part.split('=').map((p) => p.trim());
      return [col, Number(value)];
    }),
  );
};
/** The `col = n` predicates of the WHERE clause (the `id IN (...)` list is bound, not literal). */
const parsePredicates = (sql: string): Record<string, number> => {
  const out: Record<string, number> = {};
  for (const line of sql.split('\n')) {
    const m = /^\s*(?:WHERE|AND)?\s*([a-z_]+) = (\d+)\s*$/.exec(line);
    if (m && !line.startsWith('SET')) out[m[1]] = Number(m[2]);
  }
  return out;
};

function buildRunner(initial: Db) {
  let committed = clone(initial);
  const calls: Call[] = [];
  let lastManager: EntityManager | undefined;
  let updateCount = 0;
  const hooks: {
    beforeUpdate?: (state: Db, nth: number, sql: string) => void;
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
      const wantsPhase = /AS in_phase/.test(sql);
      let year = 0;
      let modules: unknown[] = [];
      let ids = params;
      if (wantsPhase) {
        const n = (
          /app_module_id IN \(([?, ]+)\)/.exec(sql)?.[1].match(/\?/g) ?? []
        ).length;
        year = Number(params[0]);
        modules = params.slice(1, 1 + n);
        ids = params.slice(1 + n);
      }
      return state.rows
        .filter((r) => ids.includes(r.id))
        .sort((a, b) => a.id - b.id)
        .map((r) =>
          wantsPhase
            ? {
                id: r.id,
                in_qa: r.in_qa,
                status_id: r.status_id,
                in_phase:
                  r.phase_year === year && modules.includes(r.app_module_id)
                    ? 1
                    : 0,
              }
            : { id: r.id, in_qa: r.in_qa },
        );
    }
    if (/^UPDATE `result`/.test(sql)) {
      calls.push({ via, kind: 'update', sql, params });
      updateCount += 1;
      hooks.beforeUpdate?.(state, updateCount, sql);
      const set = parseSet(sql);
      const where = parsePredicates(sql);
      let affectedRows = 0;
      for (const r of state.rows) {
        const rec = r as unknown as Record<string, number>;
        if (
          params.includes(r.id) &&
          Object.entries(where).every(([col, v]) => rec[col] === v)
        ) {
          Object.assign(rec, set);
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

/**
 * A In QA + Submitted (qaed) · B In QA + Submitted (not_qaed) · C Submitted, never taken (in_qa 0) · D In QA but already status 2 ·
 * E In QA + Submitted in 2025 · F inactive · H In QA, status 2 AND 2025 (two reasons at once) · I status 2, in_qa 0 (two reasons at once) ·
 * J In QA + Submitted but its type is not catalogued and it has no lead program (intake's reasons, not release's) · G (999) absent.
 */
const MIXED: Db = {
  rows: [
    row(1),
    row(2),
    row(3, { in_qa: 0 }),
    row(4, { status_id: 2 }),
    row(5, { phase_year: 2025 }),
    row(6, { is_active: 0 }),
    row(7, { status_id: 2, phase_year: 2025 }),
    row(8, { status_id: 2, in_qa: 0 }),
    row(9, { result_type_id: 99, has_lead_program: 0 }),
  ],
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

const item = (result_id: number, outcome: 'qaed' | 'not_qaed') => ({
  result_id,
  outcome,
});
const FULL_BATCH = [
  item(1, 'qaed'),
  item(2, 'not_qaed'),
  item(3, 'qaed'),
  item(4, 'qaed'),
  item(5, 'qaed'),
  item(6, 'qaed'),
  item(999, 'qaed'),
  item(7, 'not_qaed'),
  item(8, 'qaed'),
  item(9, 'not_qaed'),
];
const updatesOf = (runner: ReturnType<typeof build>['runner']) =>
  runner.calls.filter((c) => c.kind === 'update');

describe('QaIntakeService.release (QIN-T-3)', () => {
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  beforeEach(() => {
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });
  afterEach(() => jest.restoreAllMocks());

  describe('Mixed batch (QIN-R-4, QIN-R-9)', () => {
    it('reports every id in request order, with the first failing reason of not_found > other_phase > not_in_qa > not_submitted', async () => {
      const { service } = build();
      const out = await service.release(
        { phase_year: YEAR, items: FULL_BATCH },
        PLATFORM,
      );
      expect(out).toEqual({
        phase_year: YEAR,
        released: [
          { result_id: 1, result_code: 7001, outcome: 'qaed' },
          { result_id: 2, result_code: 7002, outcome: 'not_qaed' },
          // J: In QA + Submitted in the phase. Intake's reasons (type, lead program) are not release's: QIN-R-4 lists three conditions.
          { result_id: 9, result_code: 7009, outcome: 'not_qaed' },
        ],
        not_released: [
          { result_id: 3, result_code: 7003, reason: 'not_in_qa' },
          { result_id: 4, result_code: 7004, reason: 'not_submitted' },
          { result_id: 5, result_code: 7005, reason: 'other_phase' },
          { result_id: 6, result_code: 7006, reason: 'not_found' },
          { result_id: 999, result_code: null, reason: 'not_found' },
          // H is status 2 AND in 2025: other_phase comes before not_submitted.
          { result_id: 7, result_code: 7007, reason: 'other_phase' },
          // I is status 2 AND in_qa 0: not_in_qa comes before not_submitted.
          { result_id: 8, result_code: 7008, reason: 'not_in_qa' },
        ],
      });
    });

    it('writes exactly the released rows and nothing else', async () => {
      const { service, runner } = build();
      await service.release({ phase_year: YEAR, items: FULL_BATCH }, PLATFORM);
      expect(runner.committed.rows).toEqual([
        row(1, { status_id: 2, in_qa: 0 }),
        row(2, { in_qa: 0 }),
        row(3, { in_qa: 0 }),
        row(4, { status_id: 2 }),
        row(5, { phase_year: 2025 }),
        row(6, { is_active: 0 }),
        row(7, { status_id: 2, phase_year: 2025 }),
        row(8, { status_id: 2, in_qa: 0 }),
        row(9, { result_type_id: 99, has_lead_program: 0, in_qa: 0 }),
      ]);
    });
  });

  describe('outcomes write different columns (QIN-R-4, QIN-R-7, QIN-DD-9) - falsifier (a)', () => {
    it('qaed sets status_id 2 and in_qa 0; not_qaed sets only in_qa 0', async () => {
      const { service, runner } = build();
      await service.release(
        { phase_year: YEAR, items: [item(1, 'qaed'), item(2, 'not_qaed')] },
        PLATFORM,
      );
      const [qaed, notQaed] = updatesOf(runner);
      expect(updatesOf(runner)).toHaveLength(2);
      expect(parseSet(qaed.sql)).toEqual({ status_id: 2, in_qa: 0 });
      expect(qaed.params).toEqual([1]);
      expect(parseSet(notQaed.sql)).toEqual({ in_qa: 0 });
      expect(notQaed.sql).not.toMatch(/status_id\s*=\s*2/);
      expect(notQaed.params).toEqual([2]);
      // and the effect: A is QAed and released, B is released and still Submitted
      expect(runner.committed.rows.find((r) => r.id === 1)).toMatchObject({
        status_id: 2,
        in_qa: 0,
      });
      expect(runner.committed.rows.find((r) => r.id === 2)).toMatchObject({
        status_id: 3,
        in_qa: 0,
      });
    });

    it('both UPDATEs are compare-and-set on the state the lock read: in_qa = 1 AND status_id = 3', async () => {
      const { service, runner } = build();
      await service.release(
        { phase_year: YEAR, items: [item(1, 'qaed'), item(2, 'not_qaed')] },
        PLATFORM,
      );
      for (const u of updatesOf(runner)) {
        expect(parsePredicates(u.sql)).toEqual({
          is_active: 1,
          status_id: 3,
          in_qa: 1,
        });
      }
    });

    it('batches by outcome: one UPDATE per outcome present, never per id', async () => {
      const { service, runner } = build();
      await service.release(
        {
          phase_year: YEAR,
          items: [item(1, 'qaed'), item(9, 'qaed'), item(2, 'not_qaed')],
        },
        PLATFORM,
      );
      const updates = updatesOf(runner);
      expect(updates.map((u) => u.params)).toEqual([[1, 9], [2]]);
    });

    it('a batch with only qaed items runs no not_qaed UPDATE, and the reverse', async () => {
      const a = build();
      await a.service.release(
        { phase_year: YEAR, items: [item(1, 'qaed')] },
        PLATFORM,
      );
      expect(updatesOf(a.runner).map((u) => parseSet(u.sql))).toEqual([
        { status_id: 2, in_qa: 0 },
      ]);
      const b = build();
      await b.service.release(
        { phase_year: YEAR, items: [item(2, 'not_qaed')] },
        PLATFORM,
      );
      expect(updatesOf(b.runner).map((u) => parseSet(u.sql))).toEqual([
        { in_qa: 0 },
      ]);
    });
  });

  describe('never taken (QIN-R-4 scenario, QIN-DD-11) - falsifier (b)', () => {
    it('C, Submitted with in_qa 0, outcome qaed -> not_released not_in_qa, in no UPDATE, status unchanged', async () => {
      const { service, runner } = build();
      const out = await service.release(
        { phase_year: YEAR, items: [item(3, 'qaed')] },
        PLATFORM,
      );
      expect(out.released).toEqual([]);
      expect(out.not_released).toEqual([
        { result_id: 3, result_code: 7003, reason: 'not_in_qa' },
      ]);
      expect(updatesOf(runner)).toEqual([]);
      expect(runner.committed).toEqual(MIXED);
    });

    it('the same holds beside releasable items: C appears in no UPDATE parameter list', async () => {
      const { service, runner } = build();
      await service.release(
        {
          phase_year: YEAR,
          items: [item(1, 'qaed'), item(3, 'qaed'), item(2, 'not_qaed')],
        },
        PLATFORM,
      );
      expect(updatesOf(runner).flatMap((u) => u.params)).not.toContain(3);
      expect(runner.committed.rows.find((r) => r.id === 3)).toEqual(
        row(3, { in_qa: 0 }),
      );
    });
  });

  describe('In QA but no longer Submitted (QIN-R-4) - falsifier (c)', () => {
    it('D, In QA with status_id 2 -> not_submitted, in no UPDATE, nothing written', async () => {
      const { service, runner } = build();
      const out = await service.release(
        { phase_year: YEAR, items: [item(4, 'not_qaed')] },
        PLATFORM,
      );
      expect(out.released).toEqual([]);
      expect(out.not_released).toEqual([
        { result_id: 4, result_code: 7004, reason: 'not_submitted' },
      ]);
      expect(updatesOf(runner)).toEqual([]);
      expect(runner.committed).toEqual(MIXED);
    });

    it('a duplicated id (QIN-T-4 rejects it before this point) still fails closed: the count assertion trips and nothing commits', async () => {
      const { service, runner } = build();
      await expect(
        service.release(
          { phase_year: YEAR, items: [item(1, 'qaed'), item(1, 'qaed')] },
          PLATFORM,
        ),
      ).rejects.toBeInstanceOf(InternalServerErrorException);
      expect(runner.committed).toEqual(MIXED);
    });
  });

  describe('write boundary (QIN-R-7) - falsifier (d)', () => {
    it('the SET clause of every UPDATE names only status_id and in_qa, and never `status`', async () => {
      const { service, runner } = build();
      await service.release({ phase_year: YEAR, items: FULL_BATCH }, PLATFORM);
      const updates = updatesOf(runner);
      expect(updates).toHaveLength(2);
      for (const u of updates) {
        const setLine = /^SET (.+)$/m.exec(u.sql)[1];
        const columns = setLine.split(',').map((p) => p.split('=')[0].trim());
        expect(columns.every((c) => ['status_id', 'in_qa'].includes(c))).toBe(
          true,
        );
        expect(setLine).not.toMatch(/\bstatus\s*=/);
        expect(u.sql).toMatch(/^UPDATE `result`$/m);
        expect(u.sql).not.toMatch(/\bJOIN\b/i);
      }
      // a result is never written outside the requested year (E, H are 2025)
      expect(updates.flatMap((u) => u.params)).not.toContain(5);
      expect(updates.flatMap((u) => u.params)).not.toContain(7);
    });

    it('leaves `status` and every other column of the released rows as they were', async () => {
      const withStatus: Db = {
        rows: [
          { ...row(1), status: 1 } as FixtureRow,
          { ...row(2), status: 1 } as FixtureRow,
        ],
        audit: [],
      };
      const { service, runner } = build(withStatus);
      await service.release(
        { phase_year: YEAR, items: [item(1, 'qaed'), item(2, 'not_qaed')] },
        PLATFORM,
      );
      expect(runner.committed.rows).toEqual([
        { ...row(1, { status_id: 2, in_qa: 0 }), status: 1 },
        { ...row(2, { in_qa: 0 }), status: 1 },
      ]);
    });
  });

  describe('audit (QIN-R-5) - falsifier (e)', () => {
    it('one row per released item, action by outcome, request order, platform from the guard', async () => {
      const { service, runner } = build();
      await service.release({ phase_year: YEAR, items: FULL_BATCH }, PLATFORM);
      const base = {
        phase_year: YEAR,
        platform_id: 7,
        platform_acronym: 'QAP',
      };
      expect(runner.committed.audit).toEqual([
        { result_id: 1, action: 'release_qaed', ...base },
        { result_id: 2, action: 'release_not_qaed', ...base },
        { result_id: 9, action: 'release_not_qaed', ...base },
      ]);
      expect(runner.calls.filter((c) => c.kind === 'insert')).toHaveLength(1);
    });

    it('records nothing for a batch that released nothing', async () => {
      const { service, runner } = build();
      await service.release(
        { phase_year: YEAR, items: [item(3, 'qaed'), item(999, 'qaed')] },
        PLATFORM,
      );
      expect(runner.committed.audit).toEqual([]);
      expect(runner.calls.map((c) => c.kind)).toEqual(['lock', 'classify']);
    });
  });

  describe('year without a catalog (QIN-R-2)', () => {
    it('404 and nothing is opened, read or written', async () => {
      const { service, runner } = build();
      await expect(
        service.release(
          { phase_year: 2023, items: [item(1, 'qaed')] },
          PLATFORM,
        ),
      ).rejects.toThrow(
        new NotFoundException('No QA catalog available for phase_year 2023'),
      );
      expect(runner.calls).toEqual([]);
      expect(runner.manager).toBeUndefined();
    });
  });

  describe('atomic unit (QIN-R-5, QIN-R-8)', () => {
    it('an audit INSERT that throws rejects the call, rolls both UPDATEs back and leaks no SQL', async () => {
      const { service, runner } = build();
      runner.hooks.failOnInsert = new Error(
        "Table 'prdb.result_qa_intake_log' doesn't exist: INSERT INTO `result_qa_intake_log` (result_id) VALUES (1)",
      );
      const call = service.release(
        { phase_year: YEAR, items: [item(1, 'qaed'), item(2, 'not_qaed')] },
        PLATFORM,
      );
      await expect(call).rejects.toBeInstanceOf(InternalServerErrorException);
      const error = (await call.catch((e) => e)) as HttpException;
      expect(error.getStatus()).toBe(500);
      expect(JSON.stringify([error.message, error.getResponse()])).not.toMatch(
        /INSERT|UPDATE|SELECT|result_qa_intake_log|prdb|`/i,
      );
      expect(updatesOf(runner)).toHaveLength(2);
      expect(runner.committed).toEqual(MIXED);
    });

    it('a qaed UPDATE that matches fewer rows than planned -> 500, nothing committed, no audit INSERT', async () => {
      const { service, runner } = build();
      // a concurrent writer takes id 1 out of QA between the lock read and the UPDATE
      runner.hooks.beforeUpdate = (state, nth) => {
        if (nth === 1) state.rows.find((r) => r.id === 1).in_qa = 0;
      };
      const call = service.release(
        { phase_year: YEAR, items: [item(1, 'qaed'), item(2, 'not_qaed')] },
        PLATFORM,
      );
      await expect(call).rejects.toBeInstanceOf(InternalServerErrorException);
      expect(runner.committed).toEqual(MIXED);
      expect(runner.calls.filter((c) => c.kind === 'insert')).toHaveLength(0);
      const line = errorSpy.mock.calls.map((c) => String(c[0])).join('\n');
      expect(line).toContain('QaIntakeCasMismatchError');
    });

    it('a not_qaed UPDATE that matches fewer rows than planned -> 500 and the qaed UPDATE that already ran is rolled back', async () => {
      const { service, runner } = build();
      runner.hooks.beforeUpdate = (state, nth) => {
        if (nth === 2) state.rows.find((r) => r.id === 2).status_id = 2;
      };
      const call = service.release(
        { phase_year: YEAR, items: [item(1, 'qaed'), item(2, 'not_qaed')] },
        PLATFORM,
      );
      await expect(call).rejects.toBeInstanceOf(InternalServerErrorException);
      expect(updatesOf(runner)).toHaveLength(2);
      expect(runner.committed).toEqual(MIXED);
      expect(runner.calls.filter((c) => c.kind === 'insert')).toHaveLength(0);
    });

    it('every statement runs on the transaction manager, none on the DataSource', async () => {
      const { service, runner } = build();
      await service.release(
        { phase_year: YEAR, items: [item(1, 'qaed'), item(2, 'not_qaed')] },
        PLATFORM,
      );
      expect(runner.calls.map((c) => [c.kind, c.via])).toEqual([
        ['lock', 'manager'],
        ['classify', 'manager'],
        ['update', 'manager'],
        ['update', 'manager'],
        ['insert', 'manager'],
      ]);
    });

    it('classify runs on the transaction manager, not the default DataSource (QIN-DD-2)', async () => {
      const { service, runner, resultsRepo } = build();
      const classify = jest.spyOn(resultsRepo, 'classify');
      await service.release(
        { phase_year: YEAR, items: [item(1, 'qaed'), item(2, 'not_qaed')] },
        PLATFORM,
      );
      expect(classify).toHaveBeenCalledTimes(1);
      const [ids, year, executor] = classify.mock.calls[0];
      expect(ids).toEqual([1, 2]);
      expect(year).toBe(YEAR);
      expect(executor).toBe(runner.manager);
    });
  });

  describe('failure boundary (design section 7 item 4)', () => {
    it('a driver failure -> generic 500 with a fixed message and a class-only log naming the release route', async () => {
      const { service, runner } = build();
      runner.dataSource.transaction = async () => {
        throw new Error(
          'Deadlock found when trying to get lock; SELECT r.id FROM `result` r WHERE r.id IN (31084)',
        );
      };
      const call = service.release(
        { phase_year: YEAR, items: [item(1, 'qaed')] },
        PLATFORM,
      );
      await expect(call).rejects.toBeInstanceOf(InternalServerErrorException);
      const error = (await call.catch((e) => e)) as HttpException;
      expect(JSON.stringify([error.message, error.getResponse()])).not.toMatch(
        /SELECT|Deadlock|`result`|31084/i,
      );
      expect(errorSpy.mock.calls.map((c) => String(c[0]))).toEqual([
        'route=/api/qa/results/release year=2026 write failed (Error)',
      ]);
    });

    it('an HttpException is rethrown unchanged', async () => {
      const { service, runner } = build();
      const original = new NotFoundException('shaped already');
      runner.dataSource.transaction = async () => {
        throw original;
      };
      await expect(
        service.release(
          { phase_year: YEAR, items: [item(1, 'qaed')] },
          PLATFORM,
        ),
      ).rejects.toBe(original);
    });
  });

  describe('log line (QIN NFR Observability)', () => {
    it('is one line: route, year, counts and duration - no id, no key, no platform', async () => {
      const { service } = build();
      await service.release({ phase_year: YEAR, items: FULL_BATCH }, PLATFORM);
      const lines = logSpy.mock.calls.map((c) => String(c[0]));
      expect(lines).toHaveLength(1);
      expect(lines[0]).toMatch(
        /^route=\/api\/qa\/results\/release year=2026 released_qaed=1 released_not_qaed=2 rejected=7 duration_ms=\d+$/,
      );
      expect(lines[0]).not.toMatch(/999|7001|QAP|key|\[/);
    });

    it('logs nothing on success when the call fails (the failure has its own line)', async () => {
      const { service, runner } = build();
      runner.hooks.failOnInsert = new Error('boom');
      await service
        .release({ phase_year: YEAR, items: [item(1, 'qaed')] }, PLATFORM)
        .catch(() => undefined);
      expect(logSpy).not.toHaveBeenCalled();
    });
  });
});

// `parseSet` / `parsePredicates` are read from the statements the repository really emits (see the header comment).
