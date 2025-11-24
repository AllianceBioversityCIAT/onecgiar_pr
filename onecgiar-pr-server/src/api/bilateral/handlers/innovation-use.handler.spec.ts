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
  let repoStub: any;
  let useLevelRepoStub: any;

  beforeEach(() => {
    repoStub = {
      findOne: jest.fn().mockResolvedValue(undefined),
      save: jest.fn(),
      create: jest.fn((payload) => payload),
    };
    useLevelRepoStub = {
      findOne: jest.fn().mockResolvedValue({ id: 10, level: 2 }),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({ id: 10, name: 'Test Level' }),
      }),
    };
    handler = new InnovationUseBilateralHandler(repoStub, useLevelRepoStub);
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
    expect(repoStub.create).toHaveBeenCalledWith(
      expect.objectContaining({
        results_id: baseContext.resultId,
        innov_use_to_be_determined: false,
        innovation_use_level_id: 10,
      }),
    );
    expect(repoStub.save).toHaveBeenCalled();
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
    expect(repoStub.create).toHaveBeenCalledWith(
      expect.objectContaining({
        results_id: baseContext.resultId,
        innovation_use_level_id: 10,
      }),
    );
    expect(repoStub.save).toHaveBeenCalled();
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

    expect(repoStub.create).toHaveBeenCalledWith(
      expect.objectContaining({
        results_id: baseContext.resultId,
        innov_use_to_be_determined: true,
        innovation_use_level_id: null,
      }),
    );
    expect(repoStub.save).toHaveBeenCalled();
  });

  it('updates existing record when found', async () => {
    repoStub.findOne.mockResolvedValue({
      result_innovation_use_id: 123,
    });

    await handler.afterCreate(baseContext);

    expect(repoStub.findOne).toHaveBeenCalledWith({
      where: { results_id: baseContext.resultId },
    });
    expect(repoStub.save).toHaveBeenCalledWith(
      expect.objectContaining({
        result_innovation_use_id: 123,
        innov_use_to_be_determined: false,
        innovation_use_level_id: 10,
        last_updated_by: baseContext.userId,
      }),
    );
  });
});
