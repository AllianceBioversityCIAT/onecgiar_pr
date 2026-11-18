import { FindOperator } from 'typeorm';
import { InnovationUseService } from './innovation-use.service';
import { ResultsService } from '../../results/results.service';
import { FARMERS_ACTOR_TYPE_ID } from '../../results/result-actors/farmer-follow-up.constant';

/**
 * @akili-spec changes/innovation-use-nature-all-actors (INA-T-3, INA-R-6, INA-R-1, INA-R-5, INA-DD-3)
 *
 * The shared writer `saveAnticipatedInnoUser` decides whether a row WITHOUT `result_actors_id` is
 * an update or a new row by building a `where` for `findOne`. INA-DD-3: the nature joins that
 * `where` for every actor type, but only when the incoming row carries the `use_nature`
 * property (`'use_nature' in row`); Farmers keep their always-on (`count_unit`, `use_nature`)
 * key; a caller that does not send the property keeps the type-only match, so it updates instead
 * of duplicating.
 *
 * Kaizen KZ-changes--innovation-use-farmer-count-nature-1: a shared writer change is tested PER
 * CALLER. One describe per production caller (design P-6):
 *   1. v2 Centre save              `innovation-use.service.ts:359,:367`  (property on every row, P-7)
 *   2. bilateral, via saveInnovationUse   (P-3 / P-23: lands on a result with no active actors)
 *   3. `innovation_dev/innovation_dev.service.ts:229`  (section NULL, no property)
 *   4. review update `results/results.service.ts:5434` (section CURRENT, no property)
 * Callers 1, 2 and 4 are driven through the real caller code; caller 3 is a 700-line create flow
 * with a dozen collaborators, so the writer is called with the exact arguments `:229` passes.
 *
 * Every test asserts the real `where` the writer hands to `findOne` AND the effect over an
 * in-memory `result_actors` table (the same shape as the Farmers exemplar,
 * `innovation-use.service.farmer-count-nature.spec.ts`).
 *
 * The service has a very large constructor, so units are built off the prototype.
 */

const RESULT_ID = 100;
const USER = { id: 7 } as any;

const FARMERS = FARMERS_ACTOR_TYPE_ID; // 1
const RESEARCHERS = 2;
const POLICY = 4;
const OTHER = 5;

const RECEIVED = 'information_received';
const APPLIED = 'innovation_applied';

/** Only `IsNull()` is ever built by the writer; any other operator is a surprise worth failing on. */
const matches = (row: any, where: any) =>
  Object.entries(where).every(([key, expected]) => {
    if (expected instanceof FindOperator) {
      if (expected.type !== 'isNull') {
        throw new Error(`Unexpected FindOperator in where: ${expected.type}`);
      }
      return row[key] === null || row[key] === undefined;
    }
    return row[key] === expected;
  });

/** An `IsNull()` operator, asserted on its type so a literal `null` / `undefined` cannot pass. */
const expectIsNull = (value: unknown) => {
  expect(value).toBeInstanceOf(FindOperator);
  expect((value as FindOperator<unknown>).type).toBe('isNull');
};

const stored = (over: Record<string, unknown>) => ({
  result_actors_id: 900,
  result_id: RESULT_ID,
  is_active: true,
  section_id: 1,
  actor_type_id: RESEARCHERS,
  other_actor_type: null,
  count_unit: null,
  use_nature: null,
  how_many: 1,
  ...over,
});

/** In-memory `result_actors`: `findOne` honours the real `where`; writes mutate the table. */
function makeActorTable(initialRows: any[] = []) {
  const rows: any[] = [...initialRows];
  let nextId = 1;
  const repo = {
    findOne: jest.fn(
      async ({ where }: any) => rows.find((r) => matches(r, where)) ?? null,
    ),
    save: jest.fn(async (payload: any) => {
      // The columns are nullable with no default value: a payload that leaves them out stores NULL
      // (INA-T-4, the insert path of the presence rule).
      const row = {
        count_unit: null,
        use_nature: null,
        ...payload,
        result_actors_id: nextId++,
      };
      rows.push(row);
      return row;
    }),
    // `update(id, payload)` (row write) and `update(criteria, payload)` (bulk deactivate).
    update: jest.fn(async (criteria: any, payload: any) => {
      const targets =
        typeof criteria === 'number'
          ? rows.filter((r) => r.result_actors_id === criteria)
          : rows.filter((r) => matches(r, criteria));
      targets.forEach((row) => Object.assign(row, payload));
    }),
  };
  return { rows, repo };
}

/** The `where` of every `findOne` the writer ran, in order. */
const wheres = (repo: { findOne: jest.Mock }) =>
  repo.findOne.mock.calls.map(([arg]) => arg.where);

/**
 * Writes to a single row by id. The bulk `update(criteria, ...)` calls (the 2030 block of a
 * bilateral save deactivates its section when it is "to be determined") are not row updates.
 */
const rowUpdates = (repo: { update: jest.Mock }) =>
  repo.update.mock.calls.filter(([criteria]) => typeof criteria === 'number');

/** Active rows only, as the form reload would show them. */
const active = (rows: any[]) => rows.filter((r) => r.is_active);

/** The writer alone: used by caller 3, which cannot be driven through its own flow. */
function makeWriter(initialRows: any[] = []) {
  const { rows, repo } = makeActorTable(initialRows);
  const writer: any = Object.create(InnovationUseService.prototype);
  writer._resultActorRepository = repo;
  writer._resultByIntitutionsTypeRepository = {
    update: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
  };
  writer._resultIpMeasureRepository = {
    update: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
  };
  return { writer, rows, repo };
}

/** The real `saveInnovationUse` with the REAL writer; everything around it stubbed. */
function makeSaveInnovationUse(initialRows: any[] = []) {
  const { writer: service, rows, repo } = makeWriter(initialRows);
  service.logger = { error: jest.fn(), warn: jest.fn(), log: jest.fn() };
  service._resultsInnovationsUseRepository = {
    // `saveInnovationUse` hands the writer `InnUseRes.results_id`, i.e. the header row's own id.
    findOne: jest.fn().mockResolvedValue({
      result_innovation_use_id: 1,
      results_id: RESULT_ID,
    }),
    InnovUseExists: jest.fn().mockResolvedValue(null),
    save: jest.fn().mockImplementation((row: any) => Promise.resolve(row)),
  };
  service._clarisaInnovationUseLevelRepository = {
    findOne: jest.fn().mockResolvedValue({ id: 3, level: '3' }),
  };
  service._resultRepository = { update: jest.fn() };
  // Rethrows on purpose: the service swallows everything into `returnErrorRes`, so a silent
  // collaborator gap would make these tests pass on an empty table.
  service._handlersError = {
    returnErrorRes: jest.fn().mockImplementation(({ error }) => {
      throw error;
    }),
  };
  service._resultScalingStudyUrlsRepository = {
    update: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
  };
  service._linkedResultService = {
    createForInnovationUse: jest.fn().mockResolvedValue(undefined),
  };
  service.syncBudgetForResults = jest.fn().mockResolvedValue(undefined);
  service.saveInitiativeInvestment = jest.fn().mockResolvedValue(undefined);
  service.saveBillateralInvestment = jest.fn().mockResolvedValue(undefined);
  service.savePartnerInvestment = jest.fn().mockResolvedValue(undefined);
  service.getInnovationUse = jest
    .fn()
    .mockResolvedValue({ response: {}, message: 'ok', status: 200 });
  return { service, rows, repo };
}

describe('InnovationUseService.saveAnticipatedInnoUser — nature in the row identity (INA-R-6, INA-DD-3)', () => {
  // ---------------------------------------------------------------------------------------------
  // Caller 1 — v2 Centre save (`saveInnovationUse` -> CURRENT and FUTURE). Sends the property on
  // every row, new ones included (P-7).
  // ---------------------------------------------------------------------------------------------
  describe('caller 1: v2 Centre save — rows WITH the use_nature property (P-7)', () => {
    const save = (service: any, actors: any[], future: any[] = []) =>
      service.saveInnovationUse(
        {
          has_innovation_link: false,
          actors,
          organization: [],
          measures: [],
          innovation_use_2030: {
            actors: future,
            organization: [],
            measures: [],
          },
        },
        RESULT_ID,
        USER,
      );
    const researchers = (over: Record<string, unknown>) => ({
      actor_type_id: RESEARCHERS,
      sex_and_age_disaggregation: true,
      how_many: 10,
      ...over,
    });

    it('INA-AC-5 (a): two new Researchers rows, received + applied, are two inserts', async () => {
      const { service, rows, repo } = makeSaveInnovationUse();

      await save(service, [
        researchers({ use_nature: RECEIVED, how_many: 25 }),
        researchers({ use_nature: APPLIED, how_many: 12 }),
      ]);

      expect(repo.save).toHaveBeenCalledTimes(2);
      expect(repo.update).not.toHaveBeenCalled();
      expect(
        active(rows).map((r) => [r.actor_type_id, r.use_nature, r.how_many]),
      ).toEqual([
        [RESEARCHERS, RECEIVED, 25],
        [RESEARCHERS, APPLIED, 12],
      ]);
      // The real `where`: the nature joins the match, nothing else changes.
      expect(wheres(repo)).toEqual([
        {
          result_id: RESULT_ID,
          is_active: true,
          section_id: 1,
          actor_type_id: RESEARCHERS,
          use_nature: RECEIVED,
        },
        {
          result_id: RESULT_ID,
          is_active: true,
          section_id: 1,
          actor_type_id: RESEARCHERS,
          use_nature: APPLIED,
        },
      ]);
    });

    it('the same nature twice is one insert plus one update, the later row wins (INA-R-5 storage)', async () => {
      const { service, rows, repo } = makeSaveInnovationUse();

      await save(service, [
        researchers({ use_nature: APPLIED, how_many: 10 }),
        researchers({ use_nature: APPLIED, how_many: 25 }),
      ]);

      expect(repo.save).toHaveBeenCalledTimes(1);
      expect(repo.update).toHaveBeenCalledTimes(1);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ use_nature: APPLIED, how_many: 25 });
    });

    it.each([POLICY, 3, 6])(
      'any non-Farmers type is told apart by nature (actor type %p)',
      async (actorTypeId) => {
        const { service, rows, repo } = makeSaveInnovationUse();

        await save(service, [
          researchers({ actor_type_id: actorTypeId, use_nature: RECEIVED }),
          researchers({ actor_type_id: actorTypeId, use_nature: APPLIED }),
        ]);

        expect(repo.save).toHaveBeenCalledTimes(2);
        expect(rows.map((r) => r.use_nature)).toEqual([RECEIVED, APPLIED]);
        expect(wheres(repo)[1]).toEqual({
          result_id: RESULT_ID,
          is_active: true,
          section_id: 1,
          actor_type_id: actorTypeId,
          use_nature: APPLIED,
        });
      },
    );

    it.each([
      ['null', null],
      ['an empty string', ''],
      ['an unusable code', 'applied'],
    ])(
      'an empty nature (%s) matches IsNull(): a stored answered row is not overwritten',
      async (_label, empty) => {
        const { service, rows, repo } = makeSaveInnovationUse([
          stored({ use_nature: APPLIED }),
        ]);

        await save(service, [researchers({ use_nature: empty })]);

        expect(repo.save).toHaveBeenCalledTimes(1);
        expect(rowUpdates(repo)).toHaveLength(0);
        expect(rows.map((r) => r.use_nature)).toEqual([APPLIED, null]);
        const where = wheres(repo)[0];
        expectIsNull(where.use_nature);
        expect(Object.keys(where).sort()).toEqual([
          'actor_type_id',
          'is_active',
          'result_id',
          'section_id',
          'use_nature',
        ]);
      },
    );

    it('an empty nature updates the stored row that is also empty', async () => {
      const { service, rows, repo } = makeSaveInnovationUse([
        stored({ use_nature: null, how_many: 3 }),
      ]);

      await save(service, [researchers({ use_nature: null, how_many: 8 })]);

      expect(repo.save).not.toHaveBeenCalled();
      expect(rowUpdates(repo)).toEqual([[900, expect.anything()]]);
      expect(rows).toHaveLength(1);
      expect(rows[0].how_many).toBe(8);
      expectIsNull(wheres(repo)[0].use_nature);
    });

    it('the 2030 block follows the same rule, in its own section', async () => {
      const { service, rows, repo } = makeSaveInnovationUse();

      await save(
        service,
        [],
        [
          researchers({ use_nature: RECEIVED }),
          researchers({ use_nature: APPLIED }),
        ],
      );

      expect(repo.save).toHaveBeenCalledTimes(2);
      expect(rows.map((r) => [r.section_id, r.use_nature])).toEqual([
        [2, RECEIVED],
        [2, APPLIED],
      ]);
      expect(wheres(repo)[1]).toEqual({
        result_id: RESULT_ID,
        is_active: true,
        section_id: 2,
        actor_type_id: RESEARCHERS,
        use_nature: APPLIED,
      });
    });

    it('a row that carries its id is matched by id alone, whatever its nature', async () => {
      const { service, rows, repo } = makeSaveInnovationUse([
        stored({ result_actors_id: 41, use_nature: RECEIVED, how_many: 5 }),
      ]);

      await save(service, [
        researchers({
          result_actors_id: 41,
          use_nature: APPLIED,
          how_many: 6,
        }),
      ]);

      expect(wheres(repo)).toEqual([{ result_actors_id: 41 }]);
      expect(repo.save).not.toHaveBeenCalled();
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ use_nature: APPLIED, how_many: 6 });
    });

    // @akili-spec changes/innovation-use-nature-all-actors (INA-T-4, INA-DD-9 amendment)
    it.each([[RESEARCHERS], [FARMERS]])(
      'INA-T-4: a row sent WITH the keys as null clears the stored answers (actor type %p)',
      async (actorTypeId) => {
        const { service, rows } = makeSaveInnovationUse([
          stored({
            actor_type_id: actorTypeId,
            count_unit: 'households',
            use_nature: APPLIED,
          }),
        ]);

        await save(service, [
          researchers({
            result_actors_id: 900,
            actor_type_id: actorTypeId,
            count_unit: null,
            use_nature: null,
          }),
        ]);

        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({ count_unit: null, use_nature: null });
      },
    );

    describe('Other (type 5): the description stays in the key next to the nature', () => {
      const other = (over: Record<string, unknown>) =>
        researchers({ actor_type_id: OTHER, ...over });

      it('INA-AC-5 (d): different other_actor_type, same nature, are two rows', async () => {
        const { service, rows, repo } = makeSaveInnovationUse();

        await save(service, [
          other({ other_actor_type: 'Traders', use_nature: RECEIVED }),
          other({ other_actor_type: 'Millers', use_nature: RECEIVED }),
        ]);

        expect(repo.save).toHaveBeenCalledTimes(2);
        expect(repo.update).not.toHaveBeenCalled();
        expect(rows.map((r) => r.other_actor_type)).toEqual([
          'Traders',
          'Millers',
        ]);
        // Regression guard (green before INA-T-3 too): the description is in the key.
        expect(wheres(repo)[1]).toMatchObject({
          actor_type_id: OTHER,
          other_actor_type: 'Millers',
        });
      });

      it('the `where` carries the description AND the nature, nothing else is added', async () => {
        const { service, repo } = makeSaveInnovationUse();

        await save(service, [
          other({ other_actor_type: 'Millers', use_nature: RECEIVED }),
        ]);

        expect(wheres(repo)[0]).toEqual({
          result_id: RESULT_ID,
          is_active: true,
          section_id: 1,
          actor_type_id: OTHER,
          other_actor_type: 'Millers',
          use_nature: RECEIVED,
        });
      });

      it('same description, different nature, are two rows', async () => {
        const { service, rows, repo } = makeSaveInnovationUse();

        await save(service, [
          other({ other_actor_type: 'Traders', use_nature: RECEIVED }),
          other({ other_actor_type: 'Traders', use_nature: APPLIED }),
        ]);

        expect(repo.save).toHaveBeenCalledTimes(2);
        expect(rows.map((r) => r.use_nature)).toEqual([RECEIVED, APPLIED]);
      });

      it('same description and same nature are one row, the later wins', async () => {
        const { service, rows, repo } = makeSaveInnovationUse();

        await save(service, [
          other({
            other_actor_type: 'Traders',
            use_nature: RECEIVED,
            how_many: 1,
          }),
          other({
            other_actor_type: 'Traders',
            use_nature: RECEIVED,
            how_many: 2,
          }),
        ]);

        expect(repo.save).toHaveBeenCalledTimes(1);
        expect(repo.update).toHaveBeenCalledTimes(1);
        expect(rows).toHaveLength(1);
        expect(rows[0].how_many).toBe(2);
      });

      it('an Other row without a description keeps matching IsNull() on it', async () => {
        const { service, repo } = makeSaveInnovationUse();

        await save(service, [other({ use_nature: APPLIED })]);

        const where = wheres(repo)[0];
        expectIsNull(where.other_actor_type);
        expect(where.use_nature).toBe(APPLIED);
      });
    });

    describe("INA-AC-5 (c): Farmers keep today's key, byte for byte", () => {
      const farmers = (over: Record<string, unknown>) =>
        researchers({ actor_type_id: FARMERS, ...over });

      it('with the property: count_unit + use_nature, IsNull() when empty', async () => {
        const { service, repo } = makeSaveInnovationUse();

        await save(service, [
          farmers({ count_unit: 'households', use_nature: APPLIED }),
          farmers({ count_unit: null, use_nature: null }),
        ]);

        expect(wheres(repo)[0]).toEqual({
          result_id: RESULT_ID,
          is_active: true,
          section_id: 1,
          actor_type_id: FARMERS,
          count_unit: 'households',
          use_nature: APPLIED,
        });
        const empty = wheres(repo)[1];
        expectIsNull(empty.count_unit);
        expectIsNull(empty.use_nature);
        expect(Object.keys(empty).sort()).toEqual([
          'actor_type_id',
          'count_unit',
          'is_active',
          'result_id',
          'section_id',
          'use_nature',
        ]);
      });

      it('two Farmers rows with different pairs stay two inserts', async () => {
        const { service, rows, repo } = makeSaveInnovationUse();

        await save(service, [
          farmers({ count_unit: 'households', use_nature: APPLIED }),
          farmers({ count_unit: 'individuals', use_nature: RECEIVED }),
        ]);

        expect(repo.save).toHaveBeenCalledTimes(2);
        expect(rows.map((r) => [r.count_unit, r.use_nature])).toEqual([
          ['households', APPLIED],
          ['individuals', RECEIVED],
        ]);
      });
    });

    it('count_unit never joins the key of a non-Farmers row; the nature does', async () => {
      const { service, repo } = makeSaveInnovationUse();

      await save(service, [
        researchers({ count_unit: 'households', use_nature: RECEIVED }),
      ]);

      expect(wheres(repo)[0]).not.toHaveProperty('count_unit');
      expect(wheres(repo)[0].use_nature).toBe(RECEIVED);
    });
  });

  // ---------------------------------------------------------------------------------------------
  // Caller 2 — bilateral. `afterCreate` builds the DTO and calls `saveInnovationUse` (P-3); the
  // result has no active actor rows when it does (P-23). INA-R-1: Daniel's payloads (result 10120).
  // ---------------------------------------------------------------------------------------------
  describe('caller 2: bilateral, via saveInnovationUse (P-3, P-23)', () => {
    /** The DTO `InnovationUseHandler.resolveAndValidate` builds, current-use block only. */
    const bilateralSave = (service: any, actors: any[]) =>
      service.saveInnovationUse(
        {
          has_innovation_link: false,
          innovation_use_level_id: null,
          linked_results: [],
          readiness_level_explanation: null,
          has_scaling_studies: false,
          scaling_studies_urls: [],
          innov_use_2030_to_be_determined: true,
          innov_use_to_be_determined: false,
          actors,
          organization: [],
          measures: [],
        },
        RESULT_ID,
        USER,
      );
    const actor = (over: Record<string, unknown>) => ({
      sex_and_age_disaggregation: false,
      how_many: 10,
      ...over,
    });

    describe('rows that carry use_nature', () => {
      it('INA-R-1: Researchers received + applied are two active rows, never one overwritten', async () => {
        const { service, rows } = makeSaveInnovationUse();

        await bilateralSave(service, [
          actor({
            actor_type_id: RESEARCHERS,
            how_many: 25,
            use_nature: RECEIVED,
          }),
          actor({
            actor_type_id: RESEARCHERS,
            how_many: 12,
            use_nature: APPLIED,
          }),
        ]);

        expect(
          active(rows).map((r) => [r.actor_type_id, r.use_nature, r.how_many]),
        ).toEqual([
          [RESEARCHERS, RECEIVED, 25],
          [RESEARCHERS, APPLIED, 12],
        ]);
      });

      it("INA-R-1: Daniel's six-actor payload is six active rows, each with its nature", async () => {
        const { service, rows, repo } = makeSaveInnovationUse();

        await bilateralSave(service, [
          actor({
            actor_type_id: FARMERS,
            count_unit: 'individuals',
            use_nature: RECEIVED,
          }),
          actor({
            actor_type_id: FARMERS,
            count_unit: 'individuals',
            use_nature: APPLIED,
          }),
          actor({
            actor_type_id: FARMERS,
            count_unit: 'households',
            use_nature: APPLIED,
          }),
          actor({ actor_type_id: RESEARCHERS, use_nature: RECEIVED }),
          actor({ actor_type_id: RESEARCHERS, use_nature: APPLIED }),
          actor({
            actor_type_id: OTHER,
            other_actor_type: 'Traders',
            use_nature: APPLIED,
          }),
        ]);

        expect(rowUpdates(repo)).toHaveLength(0);
        expect(active(rows)).toHaveLength(6);
        expect(
          rows.map((r) => [r.actor_type_id, r.count_unit, r.use_nature]),
        ).toEqual([
          [FARMERS, 'individuals', RECEIVED],
          [FARMERS, 'individuals', APPLIED],
          [FARMERS, 'households', APPLIED],
          [RESEARCHERS, null, RECEIVED],
          [RESEARCHERS, null, APPLIED],
          [OTHER, null, APPLIED],
        ]);
      });
    });

    describe('rows that do NOT carry use_nature (a payload without the field)', () => {
      it('keep the type-only match: the `where` has no nature, two same-type rows merge', async () => {
        const { service, rows, repo } = makeSaveInnovationUse();

        await bilateralSave(service, [
          actor({ actor_type_id: RESEARCHERS, how_many: 4 }),
          actor({ actor_type_id: RESEARCHERS, how_many: 9 }),
        ]);

        expect(wheres(repo)).toEqual([
          {
            result_id: RESULT_ID,
            is_active: true,
            section_id: 1,
            actor_type_id: RESEARCHERS,
          },
          {
            result_id: RESULT_ID,
            is_active: true,
            section_id: 1,
            actor_type_id: RESEARCHERS,
          },
        ]);
        expect(repo.save).toHaveBeenCalledTimes(1);
        expect(rowUpdates(repo)).toHaveLength(1);
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({ how_many: 9, use_nature: null });
      });

      it('Farmers without the field still match on (count_unit, use_nature) = IsNull()', async () => {
        const { service, repo } = makeSaveInnovationUse();

        await bilateralSave(service, [actor({ actor_type_id: FARMERS })]);

        const where = wheres(repo)[0];
        expectIsNull(where.count_unit);
        expectIsNull(where.use_nature);
      });
    });
  });

  // ---------------------------------------------------------------------------------------------
  // Caller 3 — `innovation_dev/innovation_dev.service.ts:229`: section NULL, rows from the W3
  // form; they never send the property. The call below is that line's argument list.
  // ---------------------------------------------------------------------------------------------
  describe('caller 3: innovation_dev.service.ts:229 — section NULL, rows WITHOUT the property', () => {
    /** `saveAnticipatedInnoUser(resultId, user.id, innovation_use, null, innovation_user_to_be_determined)` */
    const innovationDevSave = (writer: any, actors: any[]) =>
      writer.saveAnticipatedInnoUser(
        RESULT_ID,
        USER.id,
        { actors, organization: [], measures: [] },
        null,
        false,
      );

    it('INA-AC-5 (b): a Researchers row without the property updates the stored row, never inserts', async () => {
      const { writer, rows, repo } = makeWriter([
        stored({ section_id: null, use_nature: APPLIED, how_many: 3 }),
      ]);

      await innovationDevSave(writer, [
        { actor_type_id: RESEARCHERS, how_many: 8 },
      ]);

      expect(repo.save).not.toHaveBeenCalled();
      expect(repo.update).toHaveBeenCalledWith(900, expect.anything());
      expect(active(rows)).toHaveLength(1);
      expect(rows[0].how_many).toBe(8);
      // Section NULL leaves the section out of the `where`; the nature is not in it either.
      expect(wheres(repo)).toEqual([
        { result_id: RESULT_ID, is_active: true, actor_type_id: RESEARCHERS },
      ]);
    });

    it('an Other row without the property keeps (type, other_actor_type) and nothing more', async () => {
      const { writer, rows, repo } = makeWriter([
        stored({
          section_id: null,
          actor_type_id: OTHER,
          other_actor_type: 'Traders',
          use_nature: RECEIVED,
        }),
      ]);

      await innovationDevSave(writer, [
        { actor_type_id: OTHER, other_actor_type: 'Traders', how_many: 5 },
      ]);

      expect(wheres(repo)).toEqual([
        {
          result_id: RESULT_ID,
          is_active: true,
          actor_type_id: OTHER,
          other_actor_type: 'Traders',
        },
      ]);
      expect(repo.save).not.toHaveBeenCalled();
      expect(rows).toHaveLength(1);
    });

    it('a count_unit sent without use_nature still leaves a non-Farmers key type-only', async () => {
      const { writer, repo } = makeWriter([
        stored({ section_id: null, use_nature: APPLIED }),
      ]);

      await innovationDevSave(writer, [
        { actor_type_id: RESEARCHERS, count_unit: 'households' },
      ]);

      expect(wheres(repo)[0]).not.toHaveProperty('count_unit');
      expect(wheres(repo)[0]).not.toHaveProperty('use_nature');
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('INA-AC-5 (c): a Farmers row keeps its always-on key, with or without the property', async () => {
      const { writer, repo } = makeWriter();

      await innovationDevSave(writer, [{ actor_type_id: FARMERS }]);

      const where = wheres(repo)[0];
      expect(where.actor_type_id).toBe(FARMERS);
      expectIsNull(where.count_unit);
      expectIsNull(where.use_nature);
      expect(where).not.toHaveProperty('section_id');
    });
  });

  // ---------------------------------------------------------------------------------------------
  // Caller 4 — review update, `results.service.ts:5434` (`_updateInnovationUsePartial`): section
  // CURRENT, rows from the review drawer; they carry ids, and a row added there has no property
  // (INA-DD-12). Driven through the real private method.
  // ---------------------------------------------------------------------------------------------
  describe('caller 4: review update results.service.ts:5434 — section CURRENT, rows WITHOUT the property', () => {
    function makeReview(initialRows: any[]) {
      const { writer, rows, repo } = makeWriter(initialRows);
      const results: any = Object.create(ResultsService.prototype);
      results._innovationUseService = writer;
      results._logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
      const review = (actors: any[], over: Record<string, unknown> = {}) =>
        results._updateInnovationUsePartial(
          RESULT_ID,
          {
            resultTypeResponse: {
              actors,
              organizations: [],
              measures: [],
              innov_use_to_be_determined: false,
              ...over,
            },
          },
          USER,
        );
      return { review, rows, repo };
    }

    it('INA-R-6 / INA-AC-5 (b): a Researchers row with no id and no use_nature updates the stored one', async () => {
      const { review, rows, repo } = makeReview([
        stored({ use_nature: APPLIED, how_many: 3 }),
      ]);

      await review([{ actor_type_id: RESEARCHERS, how_many: 8 }]);

      expect(repo.save).not.toHaveBeenCalled();
      expect(repo.update).toHaveBeenCalledWith(900, expect.anything());
      expect(active(rows)).toHaveLength(1);
      expect(rows[0].how_many).toBe(8);
      expect(wheres(repo)).toEqual([
        {
          result_id: RESULT_ID,
          is_active: true,
          section_id: 1,
          actor_type_id: RESEARCHERS,
        },
      ]);
    });

    it('the same holds when the response comes wrapped in an array', async () => {
      const { writer, rows, repo } = makeWriter([
        stored({ use_nature: RECEIVED }),
      ]);
      const results: any = Object.create(ResultsService.prototype);
      results._innovationUseService = writer;
      results._logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };

      await results._updateInnovationUsePartial(
        RESULT_ID,
        {
          resultTypeResponse: [
            {
              actors: [{ actor_type_id: RESEARCHERS, how_many: 2 }],
              organizations: [],
              measures: [],
            },
          ],
        },
        USER,
      );

      expect(repo.save).not.toHaveBeenCalled();
      expect(active(rows)).toHaveLength(1);
    });

    it('a row that carries its id is matched by id alone', async () => {
      const { review, rows, repo } = makeReview([
        stored({ result_actors_id: 41, use_nature: APPLIED }),
      ]);

      await review([
        { result_actors_id: 41, actor_type_id: RESEARCHERS, how_many: 6 },
      ]);

      expect(wheres(repo)).toEqual([{ result_actors_id: 41 }]);
      expect(repo.save).not.toHaveBeenCalled();
      expect(rows[0].how_many).toBe(6);
    });

    // @akili-spec changes/innovation-use-nature-all-actors (INA-T-4, INA-R-6 NFR, INA-DD-9 amendment)
    it('INA-T-4: the review update keeps the stored nature it did not send', async () => {
      const { review, rows } = makeReview([
        stored({ use_nature: APPLIED, how_many: 3 }),
      ]);

      await review([{ actor_type_id: RESEARCHERS, how_many: 8 }]);

      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ use_nature: APPLIED, how_many: 8 });
    });

    it('INA-T-4: a Farmers row matched by id keeps its stored unit and nature when the keys are absent', async () => {
      const { review, rows, repo } = makeReview([
        stored({
          actor_type_id: FARMERS,
          count_unit: 'households',
          use_nature: APPLIED,
        }),
      ]);

      await review([
        { result_actors_id: 900, actor_type_id: FARMERS, how_many: 8 },
      ]);

      expect(rowUpdates(repo)).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        count_unit: 'households',
        use_nature: APPLIED,
        how_many: 8,
      });
    });

    it('INA-T-4: a new row without the keys is inserted with both empty', async () => {
      const { review, rows, repo } = makeReview([]);

      await review([{ actor_type_id: RESEARCHERS, how_many: 8 }]);

      expect(repo.save).toHaveBeenCalledTimes(1);
      expect(rows[0].use_nature).toBeNull();
      expect(rows[0].count_unit).toBeNull();
    });

    it('INA-AC-5 (c): a Farmers row with no id keeps its always-on key', async () => {
      const { review, repo } = makeReview([]);

      await review([{ actor_type_id: FARMERS, how_many: 6 }]);

      const where = wheres(repo)[0];
      expect(where.actor_type_id).toBe(FARMERS);
      expectIsNull(where.count_unit);
      expectIsNull(where.use_nature);
    });
  });
});
