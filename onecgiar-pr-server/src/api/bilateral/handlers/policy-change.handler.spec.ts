import { BadRequestException } from '@nestjs/common';
import { PolicyChangeBilateralHandler } from './policy-change.handler';
import { ResultTypeEnum } from '../../../shared/constants/result-type.enum';

describe('PolicyChangeBilateralHandler', () => {
  const baseDto: any = {
    result_type_id: ResultTypeEnum.POLICY_CHANGE,
    title: 'Policy Change title',
    policy_change: {
      policy_type: { id: 2 },
      policy_stage: { id: 1 },
      implementing_organization: [
        {
          institutions_id: 123,
        },
      ],
    },
  };

  const baseContext: any = {
    bilateralDto: baseDto,
    resultId: 5,
    userId: 2,
  };

  let handler: PolicyChangeBilateralHandler;
  let repoStub: any;
  let policyTypeRepoStub: any;
  let policyStageRepoStub: any;

  beforeEach(() => {
    repoStub = {
      findOne: jest.fn().mockResolvedValue(undefined),
      save: jest.fn(),
      create: jest.fn((payload) => payload),
    };
    policyTypeRepoStub = {
      findOne: jest.fn().mockResolvedValue({ id: 2, name: 'Test Type' }),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({ id: 2, name: 'Test Type' }),
      }),
    };
    policyStageRepoStub = {
      findOne: jest.fn().mockResolvedValue({ id: 1, name: 'Test Stage' }),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({ id: 1, name: 'Test Stage' }),
      }),
    };
    handler = new PolicyChangeBilateralHandler(
      repoStub,
      policyTypeRepoStub,
      policyStageRepoStub,
    );
  });

  it('throws when policy_change payload is missing', async () => {
    await expect(
      handler.afterCreate({
        ...baseContext,
        bilateralDto: {
          result_type_id: ResultTypeEnum.POLICY_CHANGE,
        } as any,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when policy_type is missing', async () => {
    await expect(
      handler.afterCreate({
        ...baseContext,
        bilateralDto: {
          ...baseDto,
          policy_change: {
            policy_stage: { id: 1 },
            implementing_organization: [{ institutions_id: 123 }],
          },
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when policy_stage is missing', async () => {
    await expect(
      handler.afterCreate({
        ...baseContext,
        bilateralDto: {
          ...baseDto,
          policy_change: {
            policy_type: { id: 2 },
            implementing_organization: [{ institutions_id: 123 }],
          },
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when implementing_organization is missing or empty', async () => {
    await expect(
      handler.afterCreate({
        ...baseContext,
        bilateralDto: {
          ...baseDto,
          policy_change: {
            policy_type: { id: 2 },
            policy_stage: { id: 1 },
            implementing_organization: [],
          },
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when policy type id is 1 and status_amount is missing', async () => {
    policyTypeRepoStub.findOne.mockResolvedValue({ id: 1 });

    await expect(
      handler.afterCreate({
        ...baseContext,
        bilateralDto: {
          ...baseDto,
          policy_change: {
            policy_type: { id: 1 },
            policy_stage: { id: 1 },
            implementing_organization: [{ institutions_id: 123 }],
          },
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when policy type id is 1 and amount is missing', async () => {
    policyTypeRepoStub.findOne.mockResolvedValue({ id: 1 });

    await expect(
      handler.afterCreate({
        ...baseContext,
        bilateralDto: {
          ...baseDto,
          policy_change: {
            policy_type: { id: 1, status_amount: { id: 1 } },
            policy_stage: { id: 1 },
            implementing_organization: [{ institutions_id: 123 }],
          },
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when policy type by id is invalid', async () => {
    policyTypeRepoStub.findOne.mockResolvedValue(null);

    await expect(
      handler.afterCreate({
        ...baseContext,
        bilateralDto: {
          ...baseDto,
          policy_change: {
            policy_type: { id: 999 },
            policy_stage: { id: 1 },
            implementing_organization: [{ institutions_id: 123 }],
          },
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when policy stage by name is invalid', async () => {
    policyStageRepoStub.createQueryBuilder = jest.fn().mockReturnValue({
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    });

    await expect(
      handler.afterCreate({
        ...baseContext,
        bilateralDto: {
          ...baseDto,
          policy_change: {
            policy_type: { id: 2 },
            policy_stage: { name: 'Invalid Stage' },
            implementing_organization: [{ institutions_id: 123 }],
          },
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates repository entry with policy type and stage by id', async () => {
    await handler.afterCreate(baseContext);

    expect(policyTypeRepoStub.findOne).toHaveBeenCalledWith({
      where: { id: 2 },
    });
    expect(policyStageRepoStub.findOne).toHaveBeenCalledWith({
      where: { id: 1 },
    });
    expect(repoStub.create).toHaveBeenCalledWith(
      expect.objectContaining({
        result_id: baseContext.resultId,
        policy_type_id: 2,
        policy_stage_id: 1,
        status_amount: null,
        amount: null,
      }),
    );
    expect(repoStub.save).toHaveBeenCalled();
  });

  it('creates repository entry with status_amount and amount when policy type is 1', async () => {
    policyTypeRepoStub.findOne.mockResolvedValue({ id: 1 });

    await handler.afterCreate({
      ...baseContext,
      bilateralDto: {
        ...baseDto,
        policy_change: {
          policy_type: { id: 1, status_amount: { id: 2 }, amount: 500000 },
          policy_stage: { id: 1 },
          implementing_organization: [{ institutions_id: 123 }],
        },
      },
    });

    expect(repoStub.create).toHaveBeenCalledWith(
      expect.objectContaining({
        result_id: baseContext.resultId,
        policy_type_id: 1,
        policy_stage_id: 1,
        status_amount: '2',
        amount: 500000,
      }),
    );
    expect(repoStub.save).toHaveBeenCalled();
  });

  it('creates repository entry with policy type and stage by name', async () => {
    await handler.afterCreate({
      ...baseContext,
      bilateralDto: {
        ...baseDto,
        policy_change: {
          policy_type: { name: 'Funding instrument' },
          policy_stage: { name: 'Formulation' },
          implementing_organization: [{ institutions_id: 123 }],
        },
      },
    });

    expect(policyTypeRepoStub.createQueryBuilder).toHaveBeenCalledWith('pt');
    expect(policyStageRepoStub.createQueryBuilder).toHaveBeenCalledWith('ps');
    expect(repoStub.create).toHaveBeenCalledWith(
      expect.objectContaining({
        result_id: baseContext.resultId,
        policy_type_id: 2,
        policy_stage_id: 1,
      }),
    );
    expect(repoStub.save).toHaveBeenCalled();
  });

  it('updates existing record when found', async () => {
    repoStub.findOne.mockResolvedValue({
      result_policy_change_id: 123,
    });

    await handler.afterCreate(baseContext);

    expect(repoStub.findOne).toHaveBeenCalledWith({
      where: { result_id: baseContext.resultId },
    });
    expect(repoStub.save).toHaveBeenCalledWith(
      expect.objectContaining({
        result_policy_change_id: 123,
        policy_type_id: 2,
        policy_stage_id: 1,
        last_updated_by: baseContext.userId,
      }),
    );
  });
});
