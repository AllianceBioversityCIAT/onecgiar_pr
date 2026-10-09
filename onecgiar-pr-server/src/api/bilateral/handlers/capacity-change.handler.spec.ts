import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CapacityChangeBilateralHandler } from './capacity-change.handler';
import { ResultTypeEnum } from '../../../shared/constants/result-type.enum';

describe('CapacityChangeBilateralHandler', () => {
  const baseDto: any = {
    result_type_id: ResultTypeEnum.CAPACITY_SHARING_FOR_DEVELOPMENT,
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
          result_type_id: ResultTypeEnum.CAPACITY_SHARING_FOR_DEVELOPMENT,
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
        result_object: { id: baseContext.resultId },
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

// @akili-spec bilateral/resubmit-rejected-result — RSB-T-3 / RSB-DD-1 (see the policy-change spec).
describe('CapacityChangeBilateralHandler.resolveAndValidate (RSB-T-3)', () => {
  const dto = (capacity?: any): any => ({
    result_type_id: ResultTypeEnum.CAPACITY_SHARING_FOR_DEVELOPMENT,
    capacity_sharing: capacity,
  });
  const valid = () => ({
    number_people_trained: { women: 10, men: 5 },
    length_training: 'Short-term',
    delivery_method: 'In person',
  });

  let handler: CapacityChangeBilateralHandler;
  let capDevRepo: any;

  beforeEach(() => {
    capDevRepo = {
      capDevExists: jest.fn().mockResolvedValue(undefined),
      save: jest.fn(),
      create: jest.fn((payload) => payload),
    };
    handler = new CapacityChangeBilateralHandler(
      capDevRepo,
      { findOne: jest.fn().mockResolvedValue({ capdev_term_id: 3 }) } as any,
      {
        findOne: jest.fn().mockResolvedValue({ capdev_delivery_method_id: 2 }),
      } as any,
    );
  });

  const expectNoWrites = () => {
    expect(capDevRepo.save).not.toHaveBeenCalled();
    expect(capDevRepo.create).not.toHaveBeenCalled();
  };

  it.each([
    [
      undefined,
      'capacity_sharing object is required for capacity sharing results.',
    ],
    [
      { ...valid(), number_people_trained: undefined },
      'number_people_trained is required inside capacity_sharing.',
    ],
    [
      { ...valid(), length_training: 'forever' },
      'Unsupported length_training value "forever".',
    ],
    [
      { ...valid(), delivery_method: 'Unknown' },
      'Unsupported delivery_method value "Unknown".',
    ],
  ])(
    'rejects case %# with the create message and writes nothing',
    async (cs, message) => {
      await expect(
        handler.resolveAndValidate({ bilateralDto: dto(cs) }),
      ).rejects.toThrow(message);
      expectNoWrites();
    },
  );

  it('a valid payload resolves the ids without a write or a row lookup', async () => {
    await expect(
      handler.resolveAndValidate({ bilateralDto: dto(valid()) }),
    ).resolves.toEqual({
      capacityData: expect.objectContaining({
        male_using: 5,
        female_using: 10,
        capdev_term_id: 3,
        capdev_delivery_method_id: 2,
      }),
    });
    expectNoWrites();
    expect(capDevRepo.capDevExists).not.toHaveBeenCalled();
  });

  it('another result type resolves to null', async () => {
    await expect(
      handler.resolveAndValidate({
        bilateralDto: { result_type_id: ResultTypeEnum.POLICY_CHANGE } as any,
      }),
    ).resolves.toBeNull();
  });

  it('afterCreate raises the same message the preflight raises (DD-1 parity)', async () => {
    const invalid = dto({ ...valid(), delivery_method: 'Unknown' });
    await expect(
      handler.resolveAndValidate({ bilateralDto: invalid }),
    ).rejects.toThrow('Unsupported delivery_method value "Unknown".');
    await expect(
      handler.afterCreate({ bilateralDto: invalid, resultId: 1, userId: 9 }),
    ).rejects.toThrow('Unsupported delivery_method value "Unknown".');
    expectNoWrites();
  });
});
