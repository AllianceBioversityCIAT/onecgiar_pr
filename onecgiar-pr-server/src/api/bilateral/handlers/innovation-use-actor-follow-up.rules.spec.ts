// @akili-spec bilateral/innovation-use-actor-follow-up (BIF-T-1)
// @akili-spec changes/innovation-use-nature-all-actors (INA-T-1)
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

  describe('steps 3-4: count_unit not applicable (BIF-R-7, INA-R-3, INA-R-4)', () => {
    it('drops count_unit on type 3, keeps use_nature and warns once', () => {
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
      expect(out.actors[0].use_nature).toBe('innovation_applied');
      expect(out.actors[0].women).toBe(5);
      expect(out.warnings.map((w) => [w.code, w.index])).toEqual([
        ['actor_count_unit_not_applicable', 2],
      ]);
      expect(out.warnings[0].field).toBe('innovation_use.actors');
      expect(typeof out.warnings[0].message).toBe('string');
    });

    it('nulls count_unit "households" on type 4, keeps use_nature, warns count_unit only (INA-R-4)', () => {
      const out = run(
        row(
          {
            count_unit: 'households',
            use_nature: 'innovation_applied',
            how_many: 10,
          },
          0,
          4,
        ),
      );
      expect(out.actors[0].count_unit).toBeNull();
      expect(out.actors[0].use_nature).toBe('innovation_applied');
      expect(out.actors[0].how_many).toBe(10);
      expect(out.warnings.map((w) => w.code)).toEqual([
        'actor_count_unit_not_applicable',
      ]);
    });

    it('does not apply the households single-total rule to a non-Farmers row', () => {
      const out = run(
        row({ count_unit: 'households', women: 200, women_youth: 250 }, 0, 2),
      );
      expect(out.actors[0].count_unit).toBeNull();
      expect(out.actors[0].women).toBe(200);
      expect(out.actors[0].women_youth).toBe(250);
    });

    it('gives no count_unit_missing warning for a non-Farmers row that sends nothing', () => {
      expect(
        run(row({ use_nature: 'information_received' }, 0, 4)).warnings,
      ).toEqual([]);
    });
  });

  describe('use_nature on every actor type (INA-R-1, INA-R-2, INA-R-3)', () => {
    it.each([2, 3, 4, 5])(
      'type %p keeps its use_nature and emits no warning',
      (typeId) => {
        const out = run(
          row({ use_nature: 'information_received', how_many: 4 }, 0, typeId),
        );
        expect(out.actors[0].use_nature).toBe('information_received');
        expect(out.warnings).toEqual([]);
      },
    );

    it.each([2, 3, 4, 5])(
      'type %p without use_nature warns actor_use_nature_missing and does not 400',
      (typeId) => {
        const out = run(row({ how_many: 40 }, 0, typeId));
        expect(out.actors[0].use_nature).toBeUndefined();
        expect(out.warnings).toEqual([
          {
            field: 'innovation_use.actors',
            index: 0,
            code: 'actor_use_nature_missing',
            message: expect.any(String),
          },
        ]);
      },
    );

    it.each([null, ''])(
      'type 3 treats use_nature %p as empty and warns missing',
      (empty) => {
        const out = run(row({ use_nature: empty }, 4, 3));
        expect(out.warnings.map((w) => [w.code, w.index])).toEqual([
          ['actor_use_nature_missing', 4],
        ]);
      },
    );

    it('never emits actor_use_nature_not_applicable, whatever the type', () => {
      const out = applyInnovationUseActorFollowUpRules(
        [1, 2, 3, 4, 5, null, undefined].map((actorTypeId, index) => ({
          actor: { use_nature: 'innovation_applied' },
          index,
          actorTypeId,
        })),
      );
      expect(
        out.warnings.filter(
          (w) => w.code === 'actor_use_nature_not_applicable',
        ),
      ).toEqual([]);
    });

    it('does not warn missing on a row whose type could not be resolved', () => {
      // `row()` defaults an undefined type to Farmers, so build the input directly.
      for (const actorTypeId of [null, undefined, '']) {
        expect(
          applyInnovationUseActorFollowUpRules([
            { actor: {}, index: 0, actorTypeId },
          ]).warnings,
        ).toEqual([]);
      }
    });

    it('still rejects an invalid use_nature on every type', () => {
      expect(messageOf(() => run(row({ use_nature: 'applied' }, 0, 4)))).toBe(
        'actors[0].use_nature must be one of: information_received, innovation_applied; received "applied".',
      );
    });

    it("keeps both of Daniel's result-10120 Researchers rows (INA-R-1)", () => {
      const out = run(
        row(
          {
            how_many: 25,
            women: 10,
            men: 15,
            use_nature: 'information_received',
          },
          0,
          2,
        ),
        row(
          {
            how_many: 12,
            women: 5,
            men: 7,
            use_nature: 'innovation_applied',
          },
          1,
          2,
        ),
      );
      expect(out.actors.map((a) => a.use_nature)).toEqual([
        'information_received',
        'innovation_applied',
      ]);
      expect(out.actors.map((a) => [a.how_many, a.women, a.men])).toEqual([
        [25, 10, 15],
        [12, 5, 7],
      ]);
      expect(out.warnings).toEqual([]);
    });

    it("keeps all six rows of Daniel's 16 Nov payload; households keeps only how_many (INA-R-1, BIF-R-3)", () => {
      const out = run(
        row(
          {
            count_unit: 'individuals',
            how_many: 30,
            women: 10,
            men: 20,
            use_nature: 'information_received',
          },
          0,
          1,
        ),
        row(
          {
            count_unit: 'individuals',
            how_many: 12,
            women: 5,
            men: 7,
            use_nature: 'innovation_applied',
          },
          1,
          1,
        ),
        row(
          {
            count_unit: 'households',
            how_many: 50,
            women: 30,
            men: 20,
            use_nature: 'innovation_applied',
          },
          2,
          1,
        ),
        row({ how_many: 25, use_nature: 'information_received' }, 3, 2),
        row({ how_many: 12, use_nature: 'innovation_applied' }, 4, 2),
        row(
          {
            other_actor_type: 'Journalists',
            how_many: 8,
            use_nature: 'information_received',
          },
          5,
          5,
        ),
      );
      expect(out.actors.map((a) => a.use_nature)).toEqual([
        'information_received',
        'innovation_applied',
        'innovation_applied',
        'information_received',
        'innovation_applied',
        'information_received',
      ]);
      const households = out.actors[2];
      expect(households.how_many).toBe(50);
      expect(households.women).toBeNull();
      expect(households.men).toBeNull();
      expect(households.sex_and_age_disaggregation).toBe(true);
      expect(out.warnings).toEqual([]);
    });
  });

  describe('steps 5-6: missing (BIF-R-6, INA-R-2)', () => {
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

  describe('step 9: duplicate identity on every type (BIF-R-11, INA-R-5)', () => {
    // @akili-spec changes/innovation-use-nature-all-actors (INA-T-2, INA-AC-4)
    const MESSAGE =
      'Another actor of the same type with the same count_unit and use_nature was sent; the rows are stored as one and the later one wins.';
    const dups = (out: ReturnType<typeof run>) =>
      out.warnings.filter((w) => w.code === 'actor_duplicate_merged');
    const pair = {
      count_unit: 'individuals',
      use_nature: 'innovation_applied',
    };

    it('warns on the later index only, with the new message', () => {
      const out = run(row({ ...pair }, 0), row({ ...pair }, 1));
      expect(dups(out).map((w) => w.index)).toEqual([1]);
      expect(dups(out)[0].message).toBe(MESSAGE);
    });

    it('treats empty = empty', () => {
      const out = run(row({}, 0), row({ count_unit: null }, 1));
      expect(dups(out)).toHaveLength(1);
    });

    it('does not warn when use_nature differs (Farmers)', () => {
      const out = run(
        row({ ...pair, use_nature: 'information_received' }, 0),
        row({ ...pair }, 1),
      );
      expect(dups(out)).toEqual([]);
    });

    it.each([
      ['Researchers (3)', 3, undefined, undefined],
      ['Other (5), same other_actor_type', 5, 'Bees', 'Bees'],
    ])(
      '%s: same nature warns once, different nature does not',
      (_label, typeId, otherA, otherB) => {
        const a = {
          use_nature: 'innovation_applied',
          other_actor_type: otherA,
        };
        const b = {
          use_nature: 'innovation_applied',
          other_actor_type: otherB,
        };
        const same = run(row(a, 0, typeId), row(b, 1, typeId));
        expect(dups(same)).toHaveLength(1);
        expect(dups(same)[0].message).toBe(MESSAGE);

        const different = run(
          row(a, 0, typeId),
          row({ ...b, use_nature: 'information_received' }, 1, typeId),
        );
        expect(dups(different)).toEqual([]);
      },
    );

    it('does not warn for two Other rows with a different other_actor_type', () => {
      const nature = { use_nature: 'innovation_applied' };
      const out = run(
        row({ ...nature, other_actor_type: 'Bees' }, 0, 5),
        row({ ...nature, other_actor_type: 'Birds' }, 1, 5),
      );
      expect(dups(out)).toEqual([]);
    });

    it('does not warn across different types with the same nature', () => {
      const nature = { use_nature: 'innovation_applied' };
      const out = run(row({ ...nature }, 0, 3), row({ ...nature }, 1, 4));
      expect(dups(out)).toEqual([]);
    });

    it('warns for two non-Farmers rows that both omit use_nature', () => {
      const out = run(row({}, 0, 3), row({}, 1, 3));
      expect(dups(out).map((w) => w.index)).toEqual([1]);
    });

    it('ignores rows that carry result_actors_id', () => {
      const out = run(
        row({ ...pair, result_actors_id: 9 }, 0),
        row({ ...pair }, 1),
        row({ result_actors_id: 7 }, 2, 3),
        row({ result_actors_id: 8 }, 3, 3),
      );
      expect(dups(out)).toEqual([]);
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

  describe('applicability switch (BIF-R-9, INA-DD-1)', () => {
    afterEach(() => jest.restoreAllMocks());

    it('asksUseNature can only gate the missing warning; it never drops a value', () => {
      jest.spyOn(constants, 'asksUseNature').mockReturnValue(false);
      const out = run(
        row({ use_nature: 'innovation_applied' }, 0, 3),
        row({}, 1, 3),
      );
      expect(out.actors[0].use_nature).toBe('innovation_applied');
      expect(out.warnings).toEqual([]);
    });
  });
});

describe('predicates', () => {
  it('asksCountUnit stays Farmers-only (INA-R-4)', () => {
    expect(constants.asksCountUnit(1)).toBe(true);
    expect(constants.asksCountUnit('1')).toBe(true);
    expect(constants.asksCountUnit(3)).toBe(false);
    expect(constants.asksCountUnit(undefined)).toBe(false);
  });

  it('asksUseNature is true for every resolved type and false for an unresolved one (INA-DD-1)', () => {
    expect(constants.asksUseNature(1)).toBe(true);
    expect(constants.asksUseNature('2')).toBe(true);
    expect(constants.asksUseNature(3)).toBe(true);
    expect(constants.asksUseNature(4)).toBe(true);
    expect(constants.asksUseNature(5)).toBe(true);
    expect(constants.asksUseNature(undefined)).toBe(false);
    expect(constants.asksUseNature(null)).toBe(false);
    expect(constants.asksUseNature('')).toBe(false);
  });
});
