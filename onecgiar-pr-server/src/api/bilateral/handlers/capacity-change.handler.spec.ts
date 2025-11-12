import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CapacityChangeBilateralHandler } from './capacity-change.handler';
import { ResultTypeEnum } from '../../../shared/constants/result-type.enum';

describe('CapacityChangeBilateralHandler', () => {
  const baseDto: any = {
    result_type_id: ResultTypeEnum.CAPACITY_CHANGE,
    capacity_sharing: {
      number_people_trained: {
        women: 10,
        men: 5,
      },
      length_training: 'Short-term',
      delivery_method: 'In person',
    },
  };
  const baseContext: any = {
    bilateralDto: baseDto,
    resultId: 1,
    userId: 99,
  };

  let handler: CapacityChangeBilateralHandler;
  let capDevRepo: any;
  let termRepo: any;
  let deliveryRepo: any;

  beforeEach(() => {
    capDevRepo = {
      capDevExists: jest.fn().mockResolvedValue(undefined),
      save: jest.fn(),
      create: jest.fn((payload) => payload),
    };
    termRepo = {
      findOne: jest.fn().mockResolvedValue({ capdev_term_id: 3 }),
    };
    deliveryRepo = {
      findOne: jest.fn().mockResolvedValue({ capdev_delivery_method_id: 2 }),
    };

    handler = new CapacityChangeBilateralHandler(
      capDevRepo,
      termRepo,
      deliveryRepo,
    );
  });

  it('throws when capacity_sharing is missing', async () => {
    await expect(
      handler.afterCreate({
        ...baseContext,
        bilateralDto: {
          result_type_id: ResultTypeEnum.CAPACITY_CHANGE,
        } as any,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when delivery method cannot be resolved', async () => {
    await expect(
      handler.afterCreate({
        ...baseContext,
        bilateralDto: {
          ...baseDto,
          capacity_sharing: {
            ...baseDto.capacity_sharing,
            delivery_method: 'Unknown',
          },
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('persists a new capacity development record', async () => {
    await handler.afterCreate(baseContext);

    expect(capDevRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        result_id: baseContext.resultId,
        male_using: 5,
        female_using: 10,
      }),
    );
    expect(capDevRepo.save).toHaveBeenCalled();
  });

  it('updates existing records when present', async () => {
    capDevRepo.capDevExists.mockResolvedValue({
      result_capacity_development_id: 99,
    });
    await handler.afterCreate(baseContext);

    expect(capDevRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        result_capacity_development_id: 99,
        last_updated_by: baseContext.userId,
      }),
    );
  });

  it('throws NotFoundException when term lookup fails', async () => {
    termRepo.findOne.mockResolvedValue(undefined);

    await expect(handler.afterCreate(baseContext)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
