// @akili-spec bilateral/innovation-use-actor-follow-up (BIF-T-1)
import { BadRequestException } from '@nestjs/common';
import * as constants from '../../results/result-actors/farmer-follow-up.constant';
import { applyInnovationUseActorFollowUpRules } from './innovation-use-actor-follow-up.rules';

const row = (actor: any, index = 0, actorTypeId: any = 1) => ({
  actor,
  index,
  actorTypeId,
});

const run = (...rows: ReturnType<typeof row>[]) =>
  applyInnovationUseActorFollowUpRules(rows);

const messageOf = (fn: () => unknown): string => {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(BadRequestException);
    return (e as BadRequestException).message;
  }
  throw new Error('expected a BadRequestException');
};

describe('applyInnovationUseActorFollowUpRules', () => {
  describe('step 2: invalid code on any type (BIF-R-2, BIF-DD-7)', () => {
    it('rejects a wrong-case count_unit on Farmers with the exact message', () => {
      expect(messageOf(() => run(row({ count_unit: 'Households' })))).toBe(
        'actors[0].count_unit must be one of: households, individuals; received "Households".',
      );
    });

    it('rejects an invalid use_nature on a non-Farmers type', () => {
      expect(messageOf(() => run(row({ use_nature: 'bogus' }, 0, 3)))).toBe(
        'actors[0].use_nature must be one of: information_received, innovation_applied; received "bogus".',
      );
    });

    it('fires on the first failing actor in index order', () => {
      const msg = messageOf(() =>
        run(
          row({ count_unit: 'individuals' }, 0),
          row({ count_unit: 'x' }, 1),
          row({ use_nature: 'y' }, 2),
        ),
      );
      expect(msg).toContain('actors[1].count_unit');
    });
  });

  describe('steps 3-4: not applicable (BIF-R-7)', () => {
    it('drops both on type 3 and warns twice', () => {
      const out = run(
        row(
          {
            count_unit: 'individuals',
            use_nature: 'innovation_applied',
            women: 5,
          },
          2,
          3,
        ),
      );
      expect(out.actors[0].count_unit).toBeNull();
      expect(out.actors[0].use_nature).toBeNull();
      expect(out.actors[0].women).toBe(5);
      expect(out.warnings.map((w) => [w.code, w.index])).toEqual([
        ['actor_count_unit_not_applicable', 2],
        ['actor_use_nature_not_applicable', 2],
      ]);
      expect(out.warnings[0].field).toBe('innovation_use.actors');
      expect(typeof out.warnings[0].message).toBe('string');
    });

    it('does not apply the households single-total rule to a non-Farmers row', () => {
      const out = run(
        row({ count_unit: 'households', women: 200, women_youth: 250 }, 0, 2),
      );
      expect(out.actors[0].count_unit).toBeNull();
      expect(out.actors[0].women).toBe(200);
      expect(out.actors[0].women_youth).toBe(250);
    });

    it('gives no *_missing warnings for a non-Farmers row that sends nothing', () => {
      expect(run(row({}, 0, 4)).warnings).toEqual([]);
    });
  });

  describe('steps 5-6: missing (BIF-R-6)', () => {
    it('warns twice on a Farmers row with no fields', () => {
      const out = run(row({}));
      expect(out.warnings.map((w) => w.code)).toEqual([
        'actor_count_unit_missing',
        'actor_use_nature_missing',
      ]);
    });

    it.each([null, ''])('treats %p as empty', (empty) => {
      const out = run(row({ count_unit: empty, use_nature: empty }));
      expect(out.warnings).toHaveLength(2);
    });

    it('does not warn when both are present', () => {
      const out = run(
        row({ count_unit: 'individuals', use_nature: 'information_received' }),
      );
      expect(out.warnings).toEqual([]);
    });
  });

  describe('step 7: households without a total (BIF-R-4)', () => {
    it.each([undefined, null, ''])('400 when how_many is %p', (how_many) => {
      expect(
        messageOf(() =>
          run(row({ count_unit: 'households', how_many, women: 200 })),
        ),
      ).toBe('actors[0].how_many is required when count_unit is households.');
    });

    it('400 names the failing index', () => {
      expect(
        messageOf(() =>
          run(
            row({ count_unit: 'individuals' }, 0),
            row({ count_unit: 'households', how_many: null }, 1),
          ),
        ),
      ).toContain('actors[1].how_many');
    });

    it('does not compute a total from the breakdown', () => {
      expect(() =>
        run(row({ count_unit: 'households', women: 200, men: 300 })),
      ).toThrow(BadRequestException);
    });
  });

  describe('step 8: households keeps a single total (BIF-R-3)', () => {
    it('keeps how_many, clears the breakdown and flags, sets disaggregation true, no warning', () => {
      const out = run(
        row({
          count_unit: 'households',
          use_nature: 'innovation_applied',
          how_many: 50,
          women: 30,
          women_youth: 40,
          men: 1,
          men_youth: 1,
          has_women: true,
          has_women_youth: true,
          has_men: true,
          has_men_youth: true,
          sex_and_age_disaggregation: false,
        }),
      );
      const a = out.actors[0];
      expect(a.how_many).toBe(50);
      expect(a.women).toBeNull();
      expect(a.women_youth).toBeNull();
      expect(a.men).toBeNull();
      expect(a.men_youth).toBeNull();
      expect(a.has_women).toBeNull();
      expect(a.has_women_youth).toBeNull();
      expect(a.has_men).toBeNull();
      expect(a.has_men_youth).toBeNull();
      expect(a.sex_and_age_disaggregation).toBe(true);
      expect(out.warnings).toEqual([]);
    });

    it('leaves an individuals row untouched', () => {
      const out = run(
        row({
          count_unit: 'individuals',
          use_nature: 'innovation_applied',
          women: 3,
          sex_and_age_disaggregation: false,
        }),
      );
      expect(out.actors[0].women).toBe(3);
      expect(out.actors[0].sex_and_age_disaggregation).toBe(false);
    });
  });

  describe('step 9: duplicate pair (BIF-R-11)', () => {
    const pair = {
      count_unit: 'individuals',
      use_nature: 'innovation_applied',
    };

    it('warns on the later index only', () => {
      const out = run(row({ ...pair }, 0), row({ ...pair }, 1));
      const dup = out.warnings.filter(
        (w) => w.code === 'actor_duplicate_merged',
      );
      expect(dup.map((w) => w.index)).toEqual([1]);
    });

    it('treats empty = empty', () => {
      const out = run(row({}, 0), row({ count_unit: null }, 1));
      expect(
        out.warnings.filter((w) => w.code === 'actor_duplicate_merged'),
      ).toHaveLength(1);
    });

    it('does not warn when use_nature differs', () => {
      const out = run(
        row({ ...pair, use_nature: 'information_received' }, 0),
        row({ ...pair }, 1),
      );
      expect(
        out.warnings.filter((w) => w.code === 'actor_duplicate_merged'),
      ).toEqual([]);
    });

    it('ignores rows that carry result_actors_id and non-Farmers rows', () => {
      const out = run(
        row({ ...pair, result_actors_id: 9 }, 0),
        row({ ...pair }, 1),
        row({}, 2, 3),
        row({}, 3, 3),
      );
      expect(
        out.warnings.filter((w) => w.code === 'actor_duplicate_merged'),
      ).toEqual([]);
    });
  });

  describe('is_active === false rows', () => {
    it('are passed through untouched', () => {
      const actor = { is_active: false, count_unit: 'bogus' };
      const out = run(row(actor));
      expect(out.actors[0]).toEqual(actor);
      expect(out.warnings).toEqual([]);
    });
  });

  it('does not mutate its input', () => {
    const actor = { count_unit: 'households', how_many: 5, women: 2 };
    run(row(actor));
    expect(actor).toEqual({ count_unit: 'households', how_many: 5, women: 2 });
  });

  describe('applicability switch (BIF-R-9)', () => {
    afterEach(() => jest.restoreAllMocks());

    it('flipping asksUseNature changes only the use_nature outcomes', () => {
      const input = () =>
        run(
          row(
            { count_unit: 'individuals', use_nature: 'innovation_applied' },
            0,
            3,
          ),
          row({}, 1, 3),
        );
      const before = input();
      jest.spyOn(constants, 'asksUseNature').mockReturnValue(true);
      const after = input();
      expect(before.warnings.map((w) => w.code)).toEqual([
        'actor_count_unit_not_applicable',
        'actor_use_nature_not_applicable',
      ]);
      expect(after.warnings.map((w) => [w.code, w.index])).toEqual([
        ['actor_count_unit_not_applicable', 0],
        ['actor_use_nature_missing', 1],
      ]);
      expect(after.actors[0].use_nature).toBe('innovation_applied');
      expect(after.actors[0].count_unit).toBeNull();
    });
  });
});

describe('predicates', () => {
  it('are Farmers-only today', () => {
    expect(constants.asksCountUnit(1)).toBe(true);
    expect(constants.asksCountUnit('1')).toBe(true);
    expect(constants.asksUseNature(1)).toBe(true);
    expect(constants.asksCountUnit(3)).toBe(false);
    expect(constants.asksUseNature(undefined)).toBe(false);
  });
});
