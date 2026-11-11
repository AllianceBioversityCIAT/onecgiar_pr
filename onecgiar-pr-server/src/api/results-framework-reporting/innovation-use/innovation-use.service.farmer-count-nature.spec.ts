import { FindOperator } from 'typeorm';
import { InnovationUseService } from './innovation-use.service';
import {
  FARMERS_ACTOR_TYPE_ID,
  toCountUnit,
  toUseNature,
} from '../../results/result-actors/farmer-follow-up.constant';

/**
 * IFC-T-2 — IFC-R-7: only the four codes are ever stored; anything else is saved as NULL
 * without failing the section save (design IFC-DD-3).
 *
 * The service has a very large constructor, so the unit is built off the prototype
 * (same shape as `innovation-use.service.2030-projection.spec.ts`).
 */
describe('InnovationUseService — Farmers count unit / use nature (IFC-R-7)', () => {
  const service: any = Object.create(InnovationUseService.prototype);
  const build = (el: any) => service.buildActorData(el, 7, 100, 1);

  it('pins the Farmers actor type id verified by IFC-T-1', () => {
    expect(FARMERS_ACTOR_TYPE_ID).toBe(1);
  });

  describe('buildActorData', () => {
    it.each(['households', 'individuals'])(
      'stores count_unit %s as sent',
      (code) => {
        expect(build({ count_unit: code }).count_unit).toBe(code);
      },
    );

    it.each(['information_received', 'innovation_applied'])(
      'stores use_nature %s as sent',
      (code) => {
        expect(build({ use_nature: code }).use_nature).toBe(code);
      },
    );

    it('keeps both answers on the same row', () => {
      const data = build({
        actor_type_id: 1,
        count_unit: 'households',
        use_nature: 'innovation_applied',
      });
      expect(data.count_unit).toBe('households');
      expect(data.use_nature).toBe('innovation_applied');
    });

    it.each([
      undefined,
      null,
      '',
      'people',
      'Households',
      'households ',
      5,
      {},
    ])('saves an unusable count_unit (%p) as NULL', (value) => {
      expect(build({ count_unit: value }).count_unit).toBeNull();
    });

    it.each([undefined, null, '', 'reach', 'INNOVATION_APPLIED', 0, []])(
      'saves an unusable use_nature (%p) as NULL',
      (value) => {
        expect(build({ use_nature: value }).use_nature).toBeNull();
      },
    );

    it('saves NULL for both when the element is missing', () => {
      const data = build(undefined);
      expect(data.count_unit).toBeNull();
      expect(data.use_nature).toBeNull();
    });

    it('does not change the other actor fields', () => {
      const data = build({ actor_type_id: 2, women: 3, how_many: 9 });
      expect(data).toMatchObject({
        actor_type_id: 2,
        women: 3,
        how_many: 9,
        result_id: 100,
        section_id: 1,
        created_by: 7,
      });
    });
  });

  describe('whitelist helpers', () => {
    it('toCountUnit accepts only the two codes', () => {
      expect(toCountUnit('households')).toBe('households');
      expect(toCountUnit('individuals')).toBe('individuals');
      expect(toCountUnit('people')).toBeNull();
      expect(toCountUnit(undefined)).toBeNull();
    });

    it('toUseNature accepts only the two codes', () => {
      expect(toUseNature('information_received')).toBe('information_received');
      expect(toUseNature('innovation_applied')).toBe('innovation_applied');
      expect(toUseNature('households')).toBeNull();
      expect(toUseNature(null)).toBeNull();
    });
  });

  /**
   * @akili-spec bilateral/innovation-use-actor-follow-up (BIF-T-4, BIF-R-5, BIF-R-11, P-6).
   * Read-only proof of the shared writer: documents the existing match (result, section, type,
   * count_unit ?? IsNull, use_nature ?? IsNull) over an in-memory actor table, so a change to the
   * writer would turn it red. No writer code is touched by this spec.
   */
  describe('saveAnticipatedInnoUser — Farmers rows reaching the writer (BIF-R-5, BIF-R-11)', () => {
    const matches = (row: any, where: any) =>
      Object.entries(where).every(([key, expected]) => {
        if (expected instanceof FindOperator) {
          // IsNull() is the only operator the writer uses here.
          return row[key] === null || row[key] === undefined;
        }
        return row[key] === expected;
      });

    const arrange = () => {
      const rows: any[] = [];
      const repo = {
        findOne: jest.fn(
          async ({ where }: any) => rows.find((r) => matches(r, where)) ?? null,
        ),
        save: jest.fn(async (payload: any) => {
          const saved = { ...payload, result_actors_id: rows.length + 1 };
          rows.push(saved);
          return saved;
        }),
        update: jest.fn(async (id: number, payload: any) => {
          const row = rows.find((r) => r.result_actors_id === id);
          Object.assign(row, payload);
        }),
      };
      const writer: any = Object.create(InnovationUseService.prototype);
      writer._resultActorRepository = repo;
      return { writer, repo, rows };
    };
    const farmers = (extra: any) => ({
      actor_type_id: FARMERS_ACTOR_TYPE_ID,
      sex_and_age_disaggregation: true,
      how_many: 10,
      ...extra,
    });
    const save = (writer: any, actors: any[]) =>
      writer.saveAnticipatedInnoUser(100, 7, { actors }, 1, false);

    it('two Farmers rows with different pairs become two inserts (actor)', async () => {
      const { writer, repo, rows } = arrange();

      await save(writer, [
        farmers({ count_unit: 'households', use_nature: 'innovation_applied' }),
        farmers({
          count_unit: 'individuals',
          use_nature: 'information_received',
        }),
      ]);

      expect(repo.save).toHaveBeenCalledTimes(2);
      expect(repo.update).not.toHaveBeenCalled();
      expect(rows.map((r) => [r.count_unit, r.use_nature])).toEqual([
        ['households', 'innovation_applied'],
        ['individuals', 'information_received'],
      ]);
    });

    it('the same pair twice is one insert plus one update, last wins (actor)', async () => {
      const { writer, repo, rows } = arrange();

      await save(writer, [
        farmers({
          count_unit: 'individuals',
          use_nature: 'innovation_applied',
          how_many: 10,
        }),
        farmers({
          count_unit: 'individuals',
          use_nature: 'innovation_applied',
          how_many: 25,
        }),
      ]);

      expect(repo.save).toHaveBeenCalledTimes(1);
      expect(repo.update).toHaveBeenCalledTimes(1);
      expect(rows).toHaveLength(1);
      expect(rows[0].how_many).toBe(25);
    });

    it('a households row as the handler forwards it is stored as a single total (actor)', async () => {
      const { writer, repo } = arrange();

      await save(writer, [
        farmers({
          count_unit: 'households',
          use_nature: 'innovation_applied',
          how_many: 40,
          men: null,
          men_youth: null,
          women: null,
          women_youth: null,
          has_men: null,
          has_men_youth: null,
          has_women: null,
          has_women_youth: null,
        }),
      ]);

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          sex_and_age_disaggregation: true,
          how_many: 40,
          count_unit: 'households',
          use_nature: 'innovation_applied',
          men: null,
          men_youth: null,
          women: null,
          women_youth: null,
          has_men: null,
          has_men_youth: null,
          has_women: null,
          has_women_youth: null,
        }),
      );
    });
  });
});
