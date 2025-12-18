import { BadRequestException } from '@nestjs/common';
import { InnovationDevelopmentBilateralHandler } from './innovation-development.handler';
import { ResultTypeEnum } from '../../../shared/constants/result-type.enum';

describe('InnovationDevelopmentBilateralHandler', () => {
  const baseDto: any = {
    result_type_id: ResultTypeEnum.INNOVATION_DEVELOPMENT,
    title: 'Innovation title',
    innovation_development: {
      innovation_typology: { name: 'Technological innovation' },
      innovation_developers: 'Person A',
      innovation_readiness_level: { level: 3 },
    },
  };

  const baseContext: any = {
    bilateralDto: baseDto,
    resultId: 5,
    userId: 2,
  };

  let handler: InnovationDevelopmentBilateralHandler;
  let repoStub: any;
  let readinessLevelRepoStub: any;

  beforeEach(() => {
    repoStub = {
      findOne: jest.fn().mockResolvedValue(undefined),
      save: jest.fn(),
      create: jest.fn((payload) => payload),
    };
    readinessLevelRepoStub = {
      findOne: jest.fn().mockResolvedValue({ id: 14, level: 3 }),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({ id: 14, name: 'Test Level' }),
      }),
    };
    handler = new InnovationDevelopmentBilateralHandler(
      repoStub,
      readinessLevelRepoStub,
    );
  });

  it('throws when innovation_development payload is missing', async () => {
    await expect(
      handler.afterCreate({
        ...baseContext,
        bilateralDto: {
          result_type_id: ResultTypeEnum.INNOVATION_DEVELOPMENT,
        } as any,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when typology code or name is not provided', async () => {
    await expect(
      handler.afterCreate({
        ...baseContext,
        bilateralDto: {
          ...baseDto,
          innovation_development: {
            innovation_developers: 'X',
            innovation_readiness_level: { level: 3 },
          },
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when innovation_readiness_level is missing', async () => {
    await expect(
      handler.afterCreate({
        ...baseContext,
        bilateralDto: {
          ...baseDto,
          innovation_development: {
            innovation_typology: { code: 12 },
            innovation_developers: 'X',
          },
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when innovation_developers is missing', async () => {
    await expect(
      handler.afterCreate({
        ...baseContext,
        bilateralDto: {
          ...baseDto,
          innovation_development: {
            innovation_typology: { code: 12 },
            innovation_readiness_level: { level: 3 },
          },
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when readiness level by level number is invalid', async () => {
    readinessLevelRepoStub.findOne.mockResolvedValue(null);

    await expect(
      handler.afterCreate({
        ...baseContext,
        bilateralDto: {
          ...baseDto,
          innovation_development: {
            innovation_typology: { code: 12 },
            innovation_developers: 'X',
            innovation_readiness_level: { level: 999 },
          },
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when readiness level by name is invalid', async () => {
    readinessLevelRepoStub.createQueryBuilder = jest.fn().mockReturnValue({
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    });

    await expect(
      handler.afterCreate({
        ...baseContext,
        bilateralDto: {
          ...baseDto,
          innovation_development: {
            innovation_typology: { code: 12 },
            innovation_developers: 'X',
            innovation_readiness_level: { name: 'Invalid Level' },
          },
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates repository entry using typology name mapping and readiness level by level number', async () => {
    await handler.afterCreate(baseContext);

    expect(readinessLevelRepoStub.findOne).toHaveBeenCalledWith({
      where: { level: 3 },
    });
    expect(repoStub.create).toHaveBeenCalledWith(
      expect.objectContaining({
        result_object: { id: baseContext.resultId },
        innovation_nature_id: 12,
        innovation_readiness_level_id: 14,
      }),
    );
    expect(repoStub.save).toHaveBeenCalled();
  });

  it('creates repository entry using readiness level by name', async () => {
    await handler.afterCreate({
      ...baseContext,
      bilateralDto: {
        ...baseDto,
        innovation_development: {
          innovation_typology: { code: 12 },
          innovation_developers: 'Person A',
          innovation_readiness_level: { name: 'Proven under field conditions' },
        },
      },
    });

    expect(readinessLevelRepoStub.createQueryBuilder).toHaveBeenCalledWith(
      'irl',
    );
    expect(repoStub.create).toHaveBeenCalledWith(
      expect.objectContaining({
        result_object: { id: baseContext.resultId },
        innovation_readiness_level_id: 14,
      }),
    );
    expect(repoStub.save).toHaveBeenCalled();
  });

  it('updates existing record when found', async () => {
    repoStub.findOne.mockResolvedValue({
      result_innovation_dev_id: 123,
    });

    await handler.afterCreate(baseContext);

    expect(repoStub.findOne).toHaveBeenCalledWith({
      where: { result_object: { id: baseContext.resultId } },
    });
    expect(repoStub.save).toHaveBeenCalledWith(
      expect.objectContaining({
        result_innovation_dev_id: 123,
        innovation_nature_id: 12,
        innovation_readiness_level_id: 14,
        last_updated_by: baseContext.userId,
      }),
    );
  });
});
