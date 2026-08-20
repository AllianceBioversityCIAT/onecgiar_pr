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

  let handler: InnovationUseBilateralHandler;
  let innovationUseServiceStub: any;
  let useLevelRepoStub: any;

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
    handler = new InnovationUseBilateralHandler(
      innovationUseServiceStub,
      useLevelRepoStub,
    );
  });

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
