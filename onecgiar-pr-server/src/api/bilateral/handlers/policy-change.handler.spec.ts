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
  let resultByInstitutionsRepoStub: any;
  let clarisaInstitutionsRepoStub: any;

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
      findOne: jest.fn().mockResolvedValue({ id: 6, name: 'Test Stage' }),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({ id: 6, name: 'Test Stage' }),
      }),
    };
    resultByInstitutionsRepoStub = {
      updateInstitutions: jest.fn().mockResolvedValue(undefined),
      getResultByInstitutionExists: jest.fn().mockResolvedValue(undefined),
      save: jest.fn().mockResolvedValue(undefined),
    };
    clarisaInstitutionsRepoStub = {
      findOne: jest
        .fn()
        .mockResolvedValue({ id: 123, name: 'Test Inst', acronym: 'TI' }),
      find: jest
        .fn()
        .mockResolvedValue([{ id: 123, name: 'Test Inst', acronym: 'TI' }]),
    };
    handler = new PolicyChangeBilateralHandler(
      repoStub,
      policyTypeRepoStub,
      policyStageRepoStub,
      resultByInstitutionsRepoStub,
      clarisaInstitutionsRepoStub,
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

  it('saves when policy type id is 1 and status_amount is missing (stores null)', async () => {
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
    ).resolves.toBeUndefined();

    expect(repoStub.save).toHaveBeenCalled();
  });

  it('saves when policy type id is 1 and amount is missing (stores null)', async () => {
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
    ).resolves.toBeUndefined();

    expect(repoStub.save).toHaveBeenCalled();
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
    // When id: 1 is provided, it maps to CLARISA id: 6
    expect(policyStageRepoStub.findOne).toHaveBeenCalledWith({
      where: { id: 6 },
    });
    expect(repoStub.create).toHaveBeenCalledWith(
      expect.objectContaining({
        result_id: baseContext.resultId,
        policy_type_id: 2,
        policy_stage_id: 6, // Mapped from 1 to 6
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

    // When id: 1 is provided for policy_stage, it maps to CLARISA id: 6
    expect(policyStageRepoStub.findOne).toHaveBeenCalledWith({
      where: { id: 6 },
    });
    expect(repoStub.create).toHaveBeenCalledWith(
      expect.objectContaining({
        result_id: baseContext.resultId,
        policy_type_id: 1,
        policy_stage_id: 6, // Mapped from 1 to 6
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
        policy_stage_id: 6, // Mock returns id: 6
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
    // When id: 1 is provided for policy_stage, it maps to CLARISA id: 6
    expect(policyStageRepoStub.findOne).toHaveBeenCalledWith({
      where: { id: 6 },
    });
    expect(repoStub.save).toHaveBeenCalledWith(
      expect.objectContaining({
        result_policy_change_id: 123,
        policy_type_id: 2,
        policy_stage_id: 6, // Mapped from 1 to 6
        last_updated_by: baseContext.userId,
      }),
    );
  });
});

// @akili-spec bilateral/resubmit-rejected-result — RSB-T-3 / RSB-DD-1. `resolveAndValidate` is the
// pure (no row, no write) half of `afterCreate`: the resubmission preflight calls it BEFORE the
// first write, `afterCreate` consumes it unchanged. Messages are the ones the no-code create has
// always raised (RSB-R-1).
describe('PolicyChangeBilateralHandler.resolveAndValidate (RSB-T-3)', () => {
  const dto = (policyChange?: any): any => ({
    result_type_id: ResultTypeEnum.POLICY_CHANGE,
    policy_change: policyChange,
  });
  const valid = () => ({
    policy_type: { id: 2 },
    policy_stage: { id: 1 },
    implementing_organization: [{ institutions_id: 123 }],
  });

  let handler: PolicyChangeBilateralHandler;
  let repoStub: any;
  let institutionsRepoStub: any;
  let policyTypeRepoStub: any;

  beforeEach(() => {
    repoStub = {
      findOne: jest.fn().mockResolvedValue(undefined),
      save: jest.fn(),
      create: jest.fn((payload) => payload),
    };
    policyTypeRepoStub = {
      findOne: jest.fn().mockResolvedValue({ id: 2 }),
      createQueryBuilder: jest.fn(),
    };
    institutionsRepoStub = {
      updateInstitutions: jest.fn(),
      getResultByInstitutionExists: jest.fn(),
      save: jest.fn(),
    };
    handler = new PolicyChangeBilateralHandler(
      repoStub,
      policyTypeRepoStub,
      { findOne: jest.fn().mockResolvedValue({ id: 6 }) } as any,
      institutionsRepoStub,
      { findOne: jest.fn(), find: jest.fn() } as any,
    );
  });

  const writers = () => [
    repoStub.save,
    repoStub.create,
    institutionsRepoStub.updateInstitutions,
    institutionsRepoStub.save,
  ];

  it.each([
    [undefined, 'policy_change object is required for POLICY_CHANGE results.'],
    [
      { ...valid(), policy_type: undefined },
      'policy_type is required for POLICY_CHANGE results.',
    ],
    [
      { ...valid(), implementing_organization: [] },
      'implementing_organization array is required and must have at least one item for POLICY_CHANGE results.',
    ],
  ])(
    'rejects case %# with the create message and writes nothing',
    async (pc, message) => {
      await expect(
        handler.resolveAndValidate({ bilateralDto: dto(pc) }),
      ).rejects.toThrow(message);
      writers().forEach((writer) => expect(writer).not.toHaveBeenCalled());
    },
  );

  it('an unknown policy_type id is a 400 from the lookup, before any write', async () => {
    policyTypeRepoStub.findOne.mockResolvedValue(null);
    await expect(
      handler.resolveAndValidate({
        bilateralDto: dto({ ...valid(), policy_type: { id: 999 } }),
      }),
    ).rejects.toThrow('Invalid policy_type id: 999');
    writers().forEach((writer) => expect(writer).not.toHaveBeenCalled());
  });

  it('a valid payload resolves without a single write or row lookup', async () => {
    await expect(
      handler.resolveAndValidate({ bilateralDto: dto(valid()) }),
    ).resolves.toEqual(
      expect.objectContaining({ policyTypeId: 2, policyStageId: 6 }),
    );
    writers().forEach((writer) => expect(writer).not.toHaveBeenCalled());
    expect(repoStub.findOne).not.toHaveBeenCalled();
  });

  it('a payload of another result type is not its business (null)', async () => {
    await expect(
      handler.resolveAndValidate({
        bilateralDto: { result_type_id: ResultTypeEnum.INNOVATION_USE } as any,
      }),
    ).resolves.toBeNull();
  });

  it('afterCreate raises the same message the preflight raises (DD-1 parity)', async () => {
    const invalid = dto({ ...valid(), policy_stage: undefined });
    await expect(
      handler.resolveAndValidate({ bilateralDto: invalid }),
    ).rejects.toThrow('policy_stage is required for POLICY_CHANGE results.');
    await expect(
      handler.afterCreate({ bilateralDto: invalid, resultId: 5, userId: 2 }),
    ).rejects.toThrow('policy_stage is required for POLICY_CHANGE results.');
    expect(repoStub.save).not.toHaveBeenCalled();
  });
});
