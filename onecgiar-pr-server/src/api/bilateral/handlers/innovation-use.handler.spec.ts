import { BadRequestException } from '@nestjs/common';
import { InnovationUseBilateralHandler } from './innovation-use.handler';
import { ResultTypeEnum } from '../../../shared/constants/result-type.enum';

describe('InnovationUseBilateralHandler', () => {
  const baseDto: any = {
    result_type_id: ResultTypeEnum.INNOVATION_USE,
    title: 'Innovation Use title',
    innovation_use: {
      current_innovation_use_numbers: {
        innov_use_to_be_determined: false,
        actors: [
          {
            actor_type_id: 1,
            actor_type_name: 'Farmers',
            sex_and_age_disaggregation: true,
            how_many: 1000,
          },
        ],
      },
      innovation_use_level: { level: 2 },
    },
  };

  const baseContext: any = {
    bilateralDto: baseDto,
    resultId: 5,
    userId: 2,
  };

  // Mirrors the `actor_type` catalogue seeded by migration 1679588387039.
  const ACTOR_TYPES = [
    { actor_type_id: 1, name: 'Farmers/ (agro)pastoralist/ herders/ fishers' },
    { actor_type_id: 2, name: 'Researchers' },
    { actor_type_id: 3, name: 'Extension agents' },
    { actor_type_id: 4, name: 'Policy actors (public or private)' },
    { actor_type_id: 5, name: 'Other' },
  ];

  let handler: InnovationUseBilateralHandler;
  let innovationUseServiceStub: any;
  let useLevelRepoStub: any;
  let actorTypeRepoStub: any;

  beforeEach(() => {
    innovationUseServiceStub = {
      saveInnovationUse: jest.fn().mockResolvedValue({
        response: {},
        message: 'Success',
        status: 201,
      }),
    };
    useLevelRepoStub = {
      findOne: jest.fn().mockResolvedValue({ id: 10, level: 2 }),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        getOne: jest
          .fn()
          .mockResolvedValue({ id: 10, level: 9, name: 'Test Level' }),
      }),
    };
    actorTypeRepoStub = {
      findOne: jest.fn(({ where }: any) =>
        Promise.resolve(
          ACTOR_TYPES.find(
            (type) => type.actor_type_id === Number(where?.actor_type_id),
          ) ?? null,
        ),
      ),
      find: jest.fn().mockResolvedValue(ACTOR_TYPES),
    };
    handler = new InnovationUseBilateralHandler(
      innovationUseServiceStub,
      useLevelRepoStub,
      actorTypeRepoStub,
    );
  });

  const actorsSentToService = () => {
    const [dto] = innovationUseServiceStub.saveInnovationUse.mock.calls.at(-1);
    return dto.actors;
  };

  it('throws when innovation_use payload is missing', async () => {
    await expect(
      handler.afterCreate({
        ...baseContext,
        bilateralDto: {
          result_type_id: ResultTypeEnum.INNOVATION_USE,
        } as any,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when current_innovation_use_numbers is missing', async () => {
    await expect(
      handler.afterCreate({
        ...baseContext,
        bilateralDto: {
          ...baseDto,
          innovation_use: {},
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when innov_use_to_be_determined is undefined', async () => {
    await expect(
      handler.afterCreate({
        ...baseContext,
        bilateralDto: {
          ...baseDto,
          innovation_use: {
            current_innovation_use_numbers: {},
          },
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when innov_use_to_be_determined is false and actors is missing', async () => {
    await expect(
      handler.afterCreate({
        ...baseContext,
        bilateralDto: {
          ...baseDto,
          innovation_use: {
            current_innovation_use_numbers: {
              innov_use_to_be_determined: false,
            },
          },
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when use level by level number is invalid', async () => {
    useLevelRepoStub.findOne.mockResolvedValue(null);

    await expect(
      handler.afterCreate({
        ...baseContext,
        bilateralDto: {
          ...baseDto,
          innovation_use: {
            current_innovation_use_numbers: {
              innov_use_to_be_determined: false,
              actors: [{ actor_type_id: 1 }],
            },
            innovation_use_level: { level: 999 },
          },
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when use level by name is invalid', async () => {
    useLevelRepoStub.createQueryBuilder = jest.fn().mockReturnValue({
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    });

    await expect(
      handler.afterCreate({
        ...baseContext,
        bilateralDto: {
          ...baseDto,
          innovation_use: {
            current_innovation_use_numbers: {
              innov_use_to_be_determined: false,
              actors: [{ actor_type_id: 1 }],
            },
            innovation_use_level: { name: 'Invalid Level' },
          },
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates repository entry with use level by level number', async () => {
    await handler.afterCreate(baseContext);

    expect(useLevelRepoStub.findOne).toHaveBeenCalledWith({
      where: { level: 2 },
    });
    expect(innovationUseServiceStub.saveInnovationUse).toHaveBeenCalledWith(
      expect.objectContaining({
        innov_use_to_be_determined: false,
        // the LEVEL (2), never the catalogue row id (10) — see P2-3359
        innovation_use_level_id: 2,
        actors: expect.any(Array),
      }),
      baseContext.resultId,
      expect.objectContaining({ id: baseContext.userId }),
    );
  });

  it('creates repository entry with use level by name', async () => {
    await handler.afterCreate({
      ...baseContext,
      bilateralDto: {
        ...baseDto,
        innovation_use: {
          current_innovation_use_numbers: {
            innov_use_to_be_determined: false,
            actors: [{ actor_type_id: 1 }],
          },
          innovation_use_level: { name: 'Proven under field conditions' },
        },
      },
    });

    expect(useLevelRepoStub.createQueryBuilder).toHaveBeenCalledWith('iul');
    expect(innovationUseServiceStub.saveInnovationUse).toHaveBeenCalledWith(
      expect.objectContaining({
        innovation_use_level_id: 9,
      }),
      baseContext.resultId,
      expect.objectContaining({ id: baseContext.userId }),
    );
  });

  it('creates repository entry without use level when not provided', async () => {
    await handler.afterCreate({
      ...baseContext,
      bilateralDto: {
        ...baseDto,
        innovation_use: {
          current_innovation_use_numbers: {
            innov_use_to_be_determined: true,
          },
        },
      },
    });

    expect(innovationUseServiceStub.saveInnovationUse).toHaveBeenCalledWith(
      expect.objectContaining({
        innov_use_to_be_determined: true,
        innovation_use_level_id: null,
      }),
      baseContext.resultId,
      expect.objectContaining({ id: baseContext.userId }),
    );
  });

  it('updates existing record when found', async () => {
    await handler.afterCreate(baseContext);

    expect(innovationUseServiceStub.saveInnovationUse).toHaveBeenCalledWith(
      expect.objectContaining({
        innov_use_to_be_determined: false,
        innovation_use_level_id: 2,
        actors: expect.any(Array),
      }),
      baseContext.resultId,
      expect.objectContaining({ id: baseContext.userId }),
    );
  });

  // An actor identified only by `actor_type_name` used to reach InnovationUseService with
  // no `actor_type_id` — `buildActorData` reads that field alone, so the row was dropped
  // and the caller still got a 200 with "All results processed successfully". Verified
  // against TEST on 2026-08-26: four actors sent, three stored, no warning.
  describe('actor type resolution', () => {
    const withActors = (actors: any[]) => ({
      ...baseContext,
      bilateralDto: {
        ...baseDto,
        innovation_use: {
          current_innovation_use_numbers: {
            innov_use_to_be_determined: false,
            actors,
          },
        },
      },
    });

    it('resolves actor_type_name to its catalogue id', async () => {
      await handler.afterCreate(
        withActors([
          {
            actor_type_name: 'Researchers',
            sex_and_age_disaggregation: true,
            how_many: 5,
          },
        ]),
      );

      expect(actorsSentToService()).toEqual([
        expect.objectContaining({ actor_type_id: 2 }),
      ]);
    });

    it('matches the catalogue name regardless of case and spacing around slashes', async () => {
      await handler.afterCreate(
        withActors([
          {
            actor_type_name: 'farmers/(agro)pastoralist/herders/fishers',
            sex_and_age_disaggregation: true,
            how_many: 5,
          },
        ]),
      );

      expect(actorsSentToService()).toEqual([
        expect.objectContaining({ actor_type_id: 1 }),
      ]);
    });

    it('prefers actor_type_id when both are provided', async () => {
      await handler.afterCreate(
        withActors([{ actor_type_id: 3, actor_type_name: 'Researchers' }]),
      );

      expect(actorsSentToService()).toEqual([
        expect.objectContaining({ actor_type_id: 3 }),
      ]);
    });

    it('rejects an unknown actor_type_name instead of dropping the actor', async () => {
      await expect(
        handler.afterCreate(withActors([{ actor_type_name: 'Astronauts' }])),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(innovationUseServiceStub.saveInnovationUse).not.toHaveBeenCalled();
    });

    it('rejects an unknown actor_type_id', async () => {
      await expect(
        handler.afterCreate(withActors([{ actor_type_id: 999 }])),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects an actor with neither id nor name', async () => {
      await expect(
        handler.afterCreate(withActors([{ women: 10, women_youth: 2 }])),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  // Youth is a subset of each sex, and non-youth is derived as the difference. The
  // reporting tool states the rule but the API never enforced it: `women: 10,
  // women_youth: 999` was stored as-is (result 8914 in TEST, 2026-08-26) and the read
  // path then clamped non-youth to 0 rather than surfacing the contradiction.
  describe('youth within sex totals', () => {
    const withActor = (actor: any) => ({
      ...baseContext,
      bilateralDto: {
        ...baseDto,
        innovation_use: {
          current_innovation_use_numbers: {
            innov_use_to_be_determined: false,
            actors: [{ actor_type_id: 1, ...actor }],
          },
        },
      },
    });

    it('accepts youth figures within their sex total', async () => {
      await handler.afterCreate(
        withActor({
          sex_and_age_disaggregation: false,
          women: 400,
          women_youth: 100,
          men: 450,
          men_youth: 50,
        }),
      );

      expect(actorsSentToService()).toEqual([
        expect.objectContaining({ women_youth: 100, men_youth: 50 }),
      ]);
    });

    it('rejects women_youth greater than women', async () => {
      await expect(
        handler.afterCreate(
          withActor({
            sex_and_age_disaggregation: false,
            women: 10,
            women_youth: 999,
          }),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects men_youth greater than men', async () => {
      await expect(
        handler.afterCreate(
          withActor({
            sex_and_age_disaggregation: false,
            men: 5,
            men_youth: 6,
          }),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('compares numeric strings, which the DTO also accepts', async () => {
      await expect(
        handler.afterCreate(
          withActor({
            sex_and_age_disaggregation: false,
            women: '10',
            women_youth: '11',
          }),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('leaves a youth figure without its sex total alone, since the reporting flow backfills it', async () => {
      await handler.afterCreate(
        withActor({ sex_and_age_disaggregation: false, women_youth: 7 }),
      );

      expect(actorsSentToService()).toEqual([
        expect.objectContaining({ women_youth: 7 }),
      ]);
    });

    it('skips the check when the disaggregation does not apply', async () => {
      // `sex_and_age_disaggregation: true` is the "does not apply" flag — only how_many
      // is reported, so leftover sex fields are not the rule's business.
      await handler.afterCreate(
        withActor({
          sex_and_age_disaggregation: true,
          how_many: 1000,
          women: 1,
          women_youth: 999,
        }),
      );

      expect(innovationUseServiceStub.saveInnovationUse).toHaveBeenCalled();
    });
  });

  // P2-3359. `clarisa_innovation_use_levels` seeds levels 0-9 without explicit ids,
  // so the auto-increment id is always level + 1. Handing the id to
  // InnovationUseService — which resolves the value as `where: { level }` — shifted
  // every result one level up, and for level 9 resolved to nothing at all, where the
  // service's `null.id` threw and the AI draft-promotion path swallowed it.
  describe('use level is passed as a level, not a catalogue id (P2-3359)', () => {
    it.each([
      [0, 1],
      [5, 6],
      [9, 10],
    ])(
      'sends level %i even though its catalogue id is %i',
      async (level, id) => {
        useLevelRepoStub.findOne.mockResolvedValue({ id, level });

        await handler.afterCreate({
          ...baseContext,
          bilateralDto: {
            ...baseDto,
            innovation_use: {
              ...baseDto.innovation_use,
              innovation_use_level: { level },
            },
          },
        });

        const [dto] =
          innovationUseServiceStub.saveInnovationUse.mock.calls.at(-1);
        expect(dto.innovation_use_level_id).toBe(level);
        expect(dto.innovation_use_level_id).not.toBe(id);
      },
    );
  });
});
