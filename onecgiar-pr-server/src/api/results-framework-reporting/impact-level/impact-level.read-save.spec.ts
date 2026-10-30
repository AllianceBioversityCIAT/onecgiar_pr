import { HttpStatus } from '@nestjs/common';
import { ImpactLevelService } from './impact-level.service';
import { Result } from '../../results/entities/result.entity';
import { ResultImpactLevel } from './entities/result-impact-level.entity';
import { ResultImpactPreviousResult } from './entities/result-impact-previous-result.entity';

/**
 * IRS-T-5 — E3 (read) and E4 (save) of the "Impact level info" section.
 * Expected values come from requirements IRS-R-4 / IRS-R-5 scenarios and design §4.1 / §5.
 * The DB is replaced by a small stateful fake so writes (and the absence of writes) are observable.
 */

const RESULT_ID = 10;
const USER = { id: 77 } as any;

const words = (n: number, sep = ' ') =>
  Array.from({ length: n }, (_, i) => `w${i}`).join(sep);

interface FakeState {
  result: { id: number; result_type_id: number; is_active: boolean } | null;
  level: Record<string, any> | null;
  links: Array<Record<string, any>>;
  /** ids that exist and are active in `result` (besides RESULT_ID). */
  activeResultIds: number[];
  studyTypeIds: number[];
  linkRows: Array<Record<string, any>>;
  writes: Array<{ op: string; entity: string; payload: any; criteria?: any }>;
}

function build(initial: Partial<FakeState> = {}) {
  const state: FakeState = {
    result: { id: RESULT_ID, result_type_id: 9, is_active: true },
    level: null,
    links: [],
    activeResultIds: [],
    studyTypeIds: [1, 2],
    linkRows: [],
    writes: [],
    ...initial,
  };

  const matches = (row: any, criteria: any) =>
    Object.entries(criteria).every(([k, v]) => Number(row[k]) === Number(v));

  const manager: any = {
    findOne: jest.fn(async (entity: any, opts: any) => {
      if (entity === Result) {
        return state.result && Number(opts.where.id) === state.result.id
          ? state.result
          : null;
      }
      if (entity === ResultImpactLevel) {
        return state.level &&
          Number(state.level.result_id) === Number(opts.where.result_id)
          ? state.level
          : null;
      }
      return null;
    }),
    find: jest.fn(async (entity: any, opts: any) => {
      if (entity === Result) {
        const ids: number[] = opts.where.id.value;
        return ids
          .filter((id) => state.activeResultIds.includes(Number(id)))
          .map((id) => ({ id }));
      }
      if (entity === ResultImpactPreviousResult) {
        return state.links.filter(
          (l) => Number(l.result_id) === Number(opts.where.result_id),
        );
      }
      return [];
    }),
    insert: jest.fn(async (entity: any, payload: any) => {
      state.writes.push({ op: 'insert', entity: entity.name, payload });
      if (entity === ResultImpactLevel) {
        state.level = { id: 1, is_active: true, ...payload };
      } else if (entity === ResultImpactPreviousResult) {
        state.links.push({ id: state.links.length + 100, ...payload });
      }
    }),
    update: jest.fn(async (entity: any, criteria: any, payload: any) => {
      state.writes.push({
        op: 'update',
        entity: entity.name,
        payload,
        criteria,
      });
      if (entity === ResultImpactLevel && state.level) {
        Object.assign(state.level, payload);
      } else if (entity === ResultImpactPreviousResult) {
        state.links
          .filter((l) => matches(l, criteria))
          .forEach((l) => Object.assign(l, payload));
      }
    }),
    createQueryBuilder: jest.fn(() => {
      const qb: any = {};
      for (const m of [
        'innerJoin',
        'leftJoin',
        'select',
        'addSelect',
        'where',
        'andWhere',
        'orderBy',
      ]) {
        qb[m] = jest.fn(() => qb);
      }
      qb.getRawMany = jest.fn(async () => state.linkRows);
      return qb;
    }),
  };

  const dataSource: any = {
    manager,
    transaction: jest.fn(async (cb: any) => cb(manager)),
  };
  const studyTypeRepo: any = {
    findOne: jest.fn(async ({ where }: any) =>
      state.studyTypeIds.includes(Number(where.id))
        ? { id: where.id, is_active: true }
        : null,
    ),
  };
  const handlers: any = {
    returnErrorRes: jest.fn((c: any) => ({
      response: c.error?.response ?? { error: true },
      message: c.error?.message ?? 'INTERNAL_SERVER_ERROR',
      status: c.error?.status ?? 500,
    })),
  };

  const service = new ImpactLevelService(studyTypeRepo, dataSource, handlers);
  return { service, state, manager, dataSource, studyTypeRepo, handlers };
}

describe('ImpactLevelService.getImpactLevelInfo (IRS-R-4 / E3)', () => {
  it('4.1 never saved: every field null and an empty list, status 200', async () => {
    const { service } = build();

    const res = await service.getImpactLevelInfo(RESULT_ID);

    expect(res.status).toBe(HttpStatus.OK);
    expect(res.response).toEqual({
      impact_study_type_id: null,
      cgiar_contribution: null,
      previously_reported: null,
      previous_results: [],
    });
  });

  it('returns the stored values and the linked previous results with their descriptive fields', async () => {
    const { service } = build({
      level: {
        result_id: RESULT_ID,
        impact_study_type_id: 2,
        cgiar_contribution: 'We contributed',
        previously_reported: true,
        is_active: true,
      },
      linkRows: [
        {
          result_id: '55',
          result_code: 1234,
          title: 'Prior result',
          result_type_name: 'Policy change',
          phase_name: 'Reporting 2025',
          portfolio_acronym: 'P25',
          status_name: 'Submitted',
        },
      ],
    });

    const res = await service.getImpactLevelInfo(RESULT_ID);

    expect(res.response).toEqual({
      impact_study_type_id: 2,
      cgiar_contribution: 'We contributed',
      previously_reported: true,
      previous_results: [
        {
          result_id: 55,
          result_code: 1234,
          title: 'Prior result',
          result_type_name: 'Policy change',
          phase_name: 'Reporting 2025',
          portfolio_acronym: 'P25',
          status_name: 'Submitted',
        },
      ],
    });
  });

  it('keeps null for a stored boolean false (not coerced to null) and a null contribution', async () => {
    const { service } = build({
      level: {
        result_id: RESULT_ID,
        impact_study_type_id: null,
        cgiar_contribution: null,
        previously_reported: false,
        is_active: true,
      },
    });
    const res = await service.getImpactLevelInfo(RESULT_ID);
    expect(res.response.previously_reported).toBe(false);
    expect(res.response.cgiar_contribution).toBeNull();
  });

  it('4.2 non-impact result: HTTP 400 "Not an impact result" and nothing written', async () => {
    const { service, state } = build({
      result: { id: RESULT_ID, result_type_id: 7, is_active: true },
    });

    const res = await service.getImpactLevelInfo(RESULT_ID);

    expect(res.status).toBe(HttpStatus.BAD_REQUEST);
    expect(res.message).toBe('Not an impact result');
    expect(state.writes).toHaveLength(0);
  });

  it('answers 404 when the result does not exist or is inactive', async () => {
    const missing = build({ result: null });
    expect((await missing.service.getImpactLevelInfo(RESULT_ID)).status).toBe(
      HttpStatus.NOT_FOUND,
    );
    const inactive = build({
      result: { id: RESULT_ID, result_type_id: 9, is_active: false },
    });
    expect((await inactive.service.getImpactLevelInfo(RESULT_ID)).status).toBe(
      HttpStatus.NOT_FOUND,
    );
  });

  it('answers 400 for a non-numeric result id', async () => {
    const { service } = build();
    expect((await service.getImpactLevelInfo('abc')).status).toBe(
      HttpStatus.BAD_REQUEST,
    );
  });
});

describe('ImpactLevelService.saveImpactLevelInfo (IRS-R-5 / E4)', () => {
  const expectRejected = (
    res: any,
    ctx: ReturnType<typeof build>,
    messagePart: string,
  ) => {
    expect(res.status).toBe(HttpStatus.BAD_REQUEST);
    expect(res.message).toContain(messagePart);
    expect(ctx.state.writes).toHaveLength(0);
    // validation never opens (let alone writes inside) the transaction
    expect(ctx.dataSource.transaction).not.toHaveBeenCalled();
  };

  describe('4.2 non-impact result', () => {
    it('answers 400 and writes nothing', async () => {
      const ctx = build({
        result: { id: RESULT_ID, result_type_id: 7, is_active: true },
      });
      const res = await ctx.service.saveImpactLevelInfo(
        RESULT_ID,
        { cgiar_contribution: 'x' },
        USER,
      );
      expectRejected(res, ctx, 'Not an impact result');
    });

    it('answers 404 for a missing result and writes nothing', async () => {
      const ctx = build({ result: null });
      const res = await ctx.service.saveImpactLevelInfo(RESULT_ID, {}, USER);
      expect(res.status).toBe(HttpStatus.NOT_FOUND);
      expect(ctx.state.writes).toHaveLength(0);
    });
  });

  describe('5.1 contribution word cap', () => {
    it('rejects 101 words naming the 100-word limit and writes nothing', async () => {
      const ctx = build();
      const res = await ctx.service.saveImpactLevelInfo(
        RESULT_ID,
        { cgiar_contribution: words(101) },
        USER,
      );
      expectRejected(res, ctx, 'at most 100 words');
    });

    it('accepts exactly 100 words (AND IT MUST accept 100)', async () => {
      const ctx = build();
      const res = await ctx.service.saveImpactLevelInfo(
        RESULT_ID,
        { cgiar_contribution: words(100) },
        USER,
      );
      expect(res.status).toBe(HttpStatus.OK);
      expect(ctx.state.level?.cgiar_contribution).toBe(words(100));
    });

    it('counts words with the shared definition: 100 words split by newlines/NBSP pass, 101 with NBSP fail', async () => {
      const ok = build();
      const okRes = await ok.service.saveImpactLevelInfo(
        RESULT_ID,
        { cgiar_contribution: `  ${words(100, '\n')}\n ` },
        USER,
      );
      expect(okRes.status).toBe(HttpStatus.OK);

      const bad = build();
      const badRes = await bad.service.saveImpactLevelInfo(
        RESULT_ID,
        { cgiar_contribution: words(101, ' ') },
        USER,
      );
      expectRejected(badRes, bad, 'at most 100 words');
    });

    it('rejects more than 5000 characters even when under 100 words', async () => {
      const ctx = build();
      const res = await ctx.service.saveImpactLevelInfo(
        RESULT_ID,
        { cgiar_contribution: 'a'.repeat(5001) },
        USER,
      );
      expectRejected(res, ctx, 'at most 5000 characters');
    });

    it('accepts exactly 5000 characters', async () => {
      const ctx = build();
      const res = await ctx.service.saveImpactLevelInfo(
        RESULT_ID,
        { cgiar_contribution: 'a'.repeat(5000) },
        USER,
      );
      expect(res.status).toBe(HttpStatus.OK);
    });

    it('rejects a non-string contribution', async () => {
      const ctx = build();
      const res = await ctx.service.saveImpactLevelInfo(
        RESULT_ID,
        { cgiar_contribution: 123 as any },
        USER,
      );
      expectRejected(res, ctx, 'cgiar_contribution must be a string');
    });
  });

  describe('5.4 study type', () => {
    it('rejects an id outside the catalog and writes nothing', async () => {
      const ctx = build();
      const res = await ctx.service.saveImpactLevelInfo(
        RESULT_ID,
        { impact_study_type_id: 99 },
        USER,
      );
      expectRejected(res, ctx, 'Invalid impact study type');
    });

    it('rejects a non-integer study type id', async () => {
      const ctx = build();
      const res = await ctx.service.saveImpactLevelInfo(
        RESULT_ID,
        { impact_study_type_id: 'x' as any },
        USER,
      );
      expectRejected(res, ctx, 'Invalid impact study type');
    });

    it('queries the catalog for an active type and stores a valid one', async () => {
      const ctx = build();
      const res = await ctx.service.saveImpactLevelInfo(
        RESULT_ID,
        { impact_study_type_id: 2 },
        USER,
      );
      expect(ctx.studyTypeRepo.findOne).toHaveBeenCalledWith({
        where: { id: 2, is_active: true },
      });
      expect(res.status).toBe(HttpStatus.OK);
      expect(ctx.state.level?.impact_study_type_id).toBe(2);
    });

    it('allows clearing the study type with null (draft save)', async () => {
      const ctx = build({
        level: {
          id: 1,
          result_id: RESULT_ID,
          impact_study_type_id: 1,
          is_active: true,
        },
      });
      const res = await ctx.service.saveImpactLevelInfo(
        RESULT_ID,
        { impact_study_type_id: null },
        USER,
      );
      expect(res.status).toBe(HttpStatus.OK);
      expect(ctx.state.level?.impact_study_type_id).toBeNull();
    });
  });

  describe('upsert and partial draft semantics', () => {
    it('first save inserts the row with created_by and only sent fields set', async () => {
      const ctx = build();
      await ctx.service.saveImpactLevelInfo(
        RESULT_ID,
        { cgiar_contribution: 'hello' },
        USER,
      );
      expect(ctx.dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(ctx.state.writes).toEqual([
        {
          op: 'insert',
          entity: 'ResultImpactLevel',
          payload: {
            result_id: RESULT_ID,
            impact_study_type_id: null,
            cgiar_contribution: 'hello',
            previously_reported: null,
            is_active: true,
            created_by: 77,
            last_updated_by: 77,
          },
        },
      ]);
    });

    it('an existing row is updated with ONLY the sent fields (unsent fields untouched)', async () => {
      const ctx = build({
        level: {
          id: 1,
          result_id: RESULT_ID,
          impact_study_type_id: 1,
          cgiar_contribution: 'old',
          previously_reported: true,
          is_active: true,
        },
      });
      await ctx.service.saveImpactLevelInfo(
        RESULT_ID,
        { cgiar_contribution: 'new' },
        USER,
      );
      expect(ctx.state.writes).toEqual([
        {
          op: 'update',
          entity: 'ResultImpactLevel',
          criteria: { result_id: RESULT_ID },
          payload: {
            cgiar_contribution: 'new',
            is_active: true,
            last_updated_by: 77,
          },
        },
      ]);
      expect(ctx.state.level?.impact_study_type_id).toBe(1);
      expect(ctx.state.level?.previously_reported).toBe(true);
    });

    it('does not touch links when previous_result_ids and previously_reported are not sent', async () => {
      const ctx = build({
        level: { id: 1, result_id: RESULT_ID, is_active: true },
        links: [
          {
            id: 1,
            result_id: RESULT_ID,
            previous_result_id: 7,
            is_active: true,
          },
        ],
      });
      await ctx.service.saveImpactLevelInfo(
        RESULT_ID,
        { cgiar_contribution: 'only text' },
        USER,
      );
      expect(
        ctx.state.writes.filter(
          (w) => w.entity === 'ResultImpactPreviousResult',
        ),
      ).toHaveLength(0);
    });

    it('rejects a non-boolean previously_reported', async () => {
      const ctx = build();
      const res = await ctx.service.saveImpactLevelInfo(
        RESULT_ID,
        { previously_reported: 'yes' as any },
        USER,
      );
      expectRejected(res, ctx, 'previously_reported must be a boolean');
    });

    it('returns the same section shape as E3 after saving', async () => {
      const ctx = build();
      const res = await ctx.service.saveImpactLevelInfo(
        RESULT_ID,
        { impact_study_type_id: 1, previously_reported: true },
        USER,
      );
      expect(res.status).toBe(HttpStatus.OK);
      expect(res.response).toEqual({
        impact_study_type_id: 1,
        cgiar_contribution: null,
        previously_reported: true,
        previous_results: [],
      });
    });
  });

  describe('5.2 previously reported = Yes (set semantics)', () => {
    const link = (id: number, previous: number, is_active = true) => ({
      id,
      result_id: RESULT_ID,
      previous_result_id: previous,
      is_active,
    });
    const linkWrites = (ctx: ReturnType<typeof build>) =>
      ctx.state.writes.filter((w) => w.entity === 'ResultImpactPreviousResult');

    it('sending [7,7,9] stores one row per distinct id (duplicates collapsed)', async () => {
      const ctx = build({ activeResultIds: [7, 9] });
      const res = await ctx.service.saveImpactLevelInfo(
        RESULT_ID,
        { previously_reported: true, previous_result_ids: [7, 7, 9] },
        USER,
      );
      expect(res.status).toBe(HttpStatus.OK);
      const inserts = linkWrites(ctx).filter((w) => w.op === 'insert');
      expect(inserts.map((w) => w.payload.previous_result_id).sort()).toEqual([
        7, 9,
      ]);
      expect(ctx.state.links).toHaveLength(2);
    });

    it('adds new ids, keeps present ones untouched, deactivates the ones missing from the list', async () => {
      const ctx = build({
        activeResultIds: [7, 9],
        links: [link(1, 7), link(2, 8)],
      });
      await ctx.service.saveImpactLevelInfo(
        RESULT_ID,
        { previously_reported: true, previous_result_ids: [7, 9] },
        USER,
      );
      const writes = linkWrites(ctx);
      expect(
        writes
          .filter((w) => w.op === 'insert')
          .map((w) => w.payload.previous_result_id),
      ).toEqual([9]);
      expect(ctx.state.links.find((l) => l.id === 2)?.is_active).toBe(false);
      expect(ctx.state.links.find((l) => l.id === 1)?.is_active).toBe(true);
      expect(writes.filter((w) => w.criteria?.id === 1)).toHaveLength(0);
    });

    it('removing 9 from the list deactivates its link (it does not stay active)', async () => {
      const ctx = build({
        activeResultIds: [7],
        links: [link(1, 7), link(2, 9)],
      });
      await ctx.service.saveImpactLevelInfo(
        RESULT_ID,
        { previously_reported: true, previous_result_ids: [7] },
        USER,
      );
      expect(
        ctx.state.links.find((l) => l.previous_result_id === 9)?.is_active,
      ).toBe(false);
    });

    it('re-activates a previously deactivated link instead of inserting a duplicate row', async () => {
      const ctx = build({
        activeResultIds: [9],
        links: [link(2, 9, false)],
      });
      await ctx.service.saveImpactLevelInfo(
        RESULT_ID,
        { previously_reported: true, previous_result_ids: [9] },
        USER,
      );
      expect(linkWrites(ctx).filter((w) => w.op === 'insert')).toHaveLength(0);
      expect(ctx.state.links[0].is_active).toBe(true);
    });

    it('an empty list deactivates every active link', async () => {
      const ctx = build({ links: [link(1, 7), link(2, 8)] });
      await ctx.service.saveImpactLevelInfo(
        RESULT_ID,
        { previously_reported: true, previous_result_ids: [] },
        USER,
      );
      expect(ctx.state.links.every((l) => l.is_active === false)).toBe(true);
    });

    it('rejects the impact result id itself (self link) and writes nothing', async () => {
      const ctx = build({ activeResultIds: [RESULT_ID, 7] });
      const res = await ctx.service.saveImpactLevelInfo(
        RESULT_ID,
        { previously_reported: true, previous_result_ids: [7, RESULT_ID] },
        USER,
      );
      expectRejected(res, ctx, 'cannot be linked to itself');
    });

    it('rejects ids that do not exist or are inactive, naming them, and writes nothing', async () => {
      const ctx = build({ activeResultIds: [7] });
      const res = await ctx.service.saveImpactLevelInfo(
        RESULT_ID,
        { previously_reported: true, previous_result_ids: [7, 404] },
        USER,
      );
      expectRejected(res, ctx, 'do not exist or are inactive');
      expect(res.message).toContain('404');
    });

    it('rejects non-integer ids and a non-array list', async () => {
      const a = build();
      expectRejected(
        await a.service.saveImpactLevelInfo(
          RESULT_ID,
          { previous_result_ids: [1.5] as any },
          USER,
        ),
        a,
        'previous_result_ids must be an array of result ids',
      );
      const b = build();
      expectRejected(
        await b.service.saveImpactLevelInfo(
          RESULT_ID,
          { previous_result_ids: 'x' as any },
          USER,
        ),
        b,
        'previous_result_ids must be an array of result ids',
      );
    });

    it('links to any phase/portfolio/program/center: existence lookup filters only id + is_active', async () => {
      const ctx = build({ activeResultIds: [7] });
      await ctx.service.saveImpactLevelInfo(
        RESULT_ID,
        { previously_reported: true, previous_result_ids: [7] },
        USER,
      );
      const call = ctx.manager.find.mock.calls.find(
        (c: any[]) => c[0] === Result,
      );
      expect(Object.keys(call[1].where).sort()).toEqual(['id', 'is_active']);
      expect(call[1].where.is_active).toBe(true);
    });
  });

  describe('5.3 previously reported = No', () => {
    it('deactivates all links, ignores any sent ids and does not validate them', async () => {
      const ctx = build({
        activeResultIds: [],
        links: [
          {
            id: 1,
            result_id: RESULT_ID,
            previous_result_id: 7,
            is_active: true,
          },
          {
            id: 2,
            result_id: RESULT_ID,
            previous_result_id: 8,
            is_active: true,
          },
        ],
      });
      const res = await ctx.service.saveImpactLevelInfo(
        RESULT_ID,
        { previously_reported: false, previous_result_ids: [999] },
        USER,
      );
      expect(res.status).toBe(HttpStatus.OK);
      expect(ctx.state.links.every((l) => l.is_active === false)).toBe(true);
      expect(ctx.state.level?.previously_reported).toBe(false);
      expect(
        ctx.manager.find.mock.calls.some((c: any[]) => c[0] === Result),
      ).toBe(false);
    });
  });

  it('delegates unexpected errors to HandlersError and surfaces their status', async () => {
    const ctx = build();
    ctx.dataSource.transaction.mockRejectedValueOnce(new Error('db down'));
    const res = await ctx.service.saveImpactLevelInfo(
      RESULT_ID,
      { cgiar_contribution: 'x' },
      USER,
    );
    expect(ctx.handlers.returnErrorRes).toHaveBeenCalled();
    expect(res.status).toBe(500);
  });
});
