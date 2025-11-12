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
      innovation_readiness_level: 14,
    },
  };

  const baseContext: any = {
    bilateralDto: baseDto,
    resultId: 5,
    userId: 2,
  };

  let handler: InnovationDevelopmentBilateralHandler;
  let repoStub: any;

  beforeEach(() => {
    repoStub = {
      findOne: jest.fn().mockResolvedValue(undefined),
      save: jest.fn(),
      create: jest.fn((payload) => payload),
    };
    handler = new InnovationDevelopmentBilateralHandler(repoStub);
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
            innovation_readiness_level: 5,
          },
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates repository entry using typology name mapping', async () => {
    await handler.afterCreate(baseContext);

    expect(repoStub.create).toHaveBeenCalledWith(
      expect.objectContaining({
        results_id: baseContext.resultId,
        innovation_nature_id: 12,
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

    expect(repoStub.save).toHaveBeenCalledWith(
      expect.objectContaining({
        result_innovation_dev_id: 123,
        innovation_nature_id: 12,
        last_updated_by: baseContext.userId,
      }),
    );
  });
});
