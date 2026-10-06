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

  const withoutDevelopers = (innovation: Record<string, unknown>) =>
    Object.fromEntries(
      Object.entries(innovation).filter(
        ([key]) => key !== 'innovation_developers',
      ),
    );

  // Since 2026-09-03 the Innovation Developer is the Lead contact person: the field is optional and
  // the handler falls back to the contact's name instead of rejecting the payload.
  it('stores the lead contact person as the innovation developer when the field is omitted', async () => {
    const rest = withoutDevelopers(
      baseContext.bilateralDto.innovation_development,
    );
    await handler.afterCreate({
      ...baseContext,
      bilateralDto: {
        ...baseContext.bilateralDto,
        lead_contact_person: { email: 'j.smith@cgiar.org', name: 'Jane Smith' },
        innovation_development: rest,
      } as any,
    });

    expect(repoStub.create).toHaveBeenCalledWith(
      expect.objectContaining({ innovation_developers: 'Jane Smith' }),
    );
  });

  it('leaves the innovation developer null when neither the field nor a lead contact is given', async () => {
    const rest = withoutDevelopers(
      baseContext.bilateralDto.innovation_development,
    );
    await handler.afterCreate({
      ...baseContext,
      bilateralDto: {
        ...baseContext.bilateralDto,
        lead_contact_person: undefined,
        innovation_development: rest,
      } as any,
    });

    expect(repoStub.create).toHaveBeenCalledWith(
      expect.objectContaining({ innovation_developers: null }),
    );
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
        results_id: baseContext.resultId,
        result_object: { id: baseContext.resultId },
        innovation_nature: { code: 12 },
        innovation_readiness_level: { id: 14 },
      }),
    );
    expect(repoStub.save).toHaveBeenCalled();
  });

  // NOST-456 QA finding 01: the record used to be seeded with `short_title = title`, so a 14-word
  // result title became a Short title over its 10-word ceiling. Short title is full metadata, not MDS.
  it('leaves short_title empty instead of copying the result title into it', async () => {
    await handler.afterCreate(baseContext);

    const payload = repoStub.create.mock.calls[0][0];
    expect(payload).not.toHaveProperty('short_title');
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
        results_id: baseContext.resultId,
        result_object: { id: baseContext.resultId },
        innovation_readiness_level: { id: 14 },
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
        innovation_nature: { code: 12 },
        innovation_readiness_level: { id: 14 },
        last_updated_by: baseContext.userId,
      }),
    );
  });
});

// @akili-spec bilateral/resubmit-rejected-result — RSB-T-3 / RSB-DD-1 (see the policy-change spec).
describe('InnovationDevelopmentBilateralHandler.resolveAndValidate (RSB-T-3)', () => {
  const dto = (innovation?: any): any => ({
    result_type_id: ResultTypeEnum.INNOVATION_DEVELOPMENT,
    innovation_development: innovation,
  });
  const valid = () => ({
    innovation_typology: { code: 12 },
    innovation_developers: 'Person A',
    innovation_readiness_level: { level: 3 },
  });

  let handler: InnovationDevelopmentBilateralHandler;
  let repoStub: any;
  let readinessRepo: any;

  beforeEach(() => {
    repoStub = {
      findOne: jest.fn().mockResolvedValue(undefined),
      save: jest.fn(),
      create: jest.fn((payload) => payload),
    };
    readinessRepo = {
      findOne: jest.fn().mockResolvedValue({ id: 14, level: 3 }),
      createQueryBuilder: jest.fn(),
    };
    handler = new InnovationDevelopmentBilateralHandler(
      repoStub,
      readinessRepo,
    );
  });

  const expectNoWrites = () => {
    expect(repoStub.save).not.toHaveBeenCalled();
    expect(repoStub.create).not.toHaveBeenCalled();
  };

  it.each([
    [
      undefined,
      'innovation_development object is required for INNOVATION_DEVELOPMENT results.',
    ],
    [
      { ...valid(), innovation_typology: undefined },
      'innovation_typology code or name must be provided.',
    ],
    [
      { ...valid(), innovation_typology: { code: 99 } },
      'Unsupported innovation typology code "99".',
    ],
    [
      { ...valid(), innovation_readiness_level: undefined },
      'innovation_readiness_level is required for INNOVATION_DEVELOPMENT results.',
    ],
  ])(
    'rejects case %# with the create message and writes nothing',
    async (innovation, message) => {
      await expect(
        handler.resolveAndValidate({ bilateralDto: dto(innovation) }),
      ).rejects.toThrow(message);
      expectNoWrites();
    },
  );

  it('an unknown readiness level is a 400 from the lookup, before any write', async () => {
    readinessRepo.findOne.mockResolvedValue(null);
    await expect(
      handler.resolveAndValidate({
        bilateralDto: dto({
          ...valid(),
          innovation_readiness_level: { level: 42 },
        }),
      }),
    ).rejects.toThrow('Invalid innovation readiness level: 42.');
    expectNoWrites();
  });

  it('a valid payload resolves ids and developers with no write and no row lookup', async () => {
    await expect(
      handler.resolveAndValidate({ bilateralDto: dto(valid()) }),
    ).resolves.toEqual({
      innovationNatureId: 12,
      readinessLevelId: 14,
      innovationDevelopers: 'Person A',
    });
    expectNoWrites();
    expect(repoStub.findOne).not.toHaveBeenCalled();
  });

  it('another result type resolves to null', async () => {
    await expect(
      handler.resolveAndValidate({
        bilateralDto: { result_type_id: ResultTypeEnum.POLICY_CHANGE } as any,
      }),
    ).resolves.toBeNull();
  });

  it('afterCreate raises the same message the preflight raises (DD-1 parity)', async () => {
    const invalid = dto({ ...valid(), innovation_typology: { code: 99 } });
    await expect(
      handler.resolveAndValidate({ bilateralDto: invalid }),
    ).rejects.toThrow('Unsupported innovation typology code "99".');
    await expect(
      handler.afterCreate({ bilateralDto: invalid, resultId: 5, userId: 2 }),
    ).rejects.toThrow('Unsupported innovation typology code "99".');
    expectNoWrites();
  });
});
