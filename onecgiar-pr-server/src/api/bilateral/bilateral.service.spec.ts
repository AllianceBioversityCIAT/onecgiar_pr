import {
  BadRequestException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { In } from 'typeorm';
import { BilateralService } from './bilateral.service';
import { ResultTypeEnum } from '../../shared/constants/result-type.enum';
import { ResultCreationMethod } from '../../shared/constants/result-creation-method.enum';
import { SourceEnum } from '../results/entities/result.entity';
import { ResultStatusData } from '../../shared/constants/result-status.enum';
import { ResultTaggedNotificationService } from '../notification/services/result-tagged-notification.service';

describe('BilateralService (unit)', () => {
  const makeService = (
    overrides: Partial<any> = {},
    opts: { withResultTaggedNotificationService?: boolean } = {},
  ) => {
    const initiativeBudgetRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((row) => row),
      save: jest.fn(async (row) => row),
    };
    const dataSource = {
      getRepository: jest.fn(() => initiativeBudgetRepository),
    } as any;
    const resultRepository = {
      findOne: jest.fn(),
      save: jest.fn(async (x) => x),
      update: jest.fn(),
    };
    const handlersError = {} as any;
    const versioningService = {} as any;
    const userRepository = { findOne: jest.fn() };
    const clarisaRegionsRepository = {} as any;
    const yearRepository = {} as any;
    const geoScopeRepository = { findOne: jest.fn() };
    const resultRegionRepository = { updateRegions: jest.fn() };
    const clarisaCountriesRepository = {} as any;
    const resultCountryRepository = { updateCountries: jest.fn() };
    const clarisaSubnationalAreasRepository = {} as any;
    const resultCountrySubnationalRepository = {} as any;
    const resultByInstitutionsRepository = {
      updateInstitutions: jest.fn().mockResolvedValue(undefined),
      getResultByInstitutionExists: jest.fn().mockResolvedValue(false),
      save: jest.fn(async (rows) =>
        (Array.isArray(rows) ? rows : [rows]).map((r, i) => ({
          ...r,
          id: 500 + i,
        })),
      ),
    } as any;
    const resultInstitutionsBudgetRepository = {
      findOne: jest.fn().mockResolvedValue(undefined),
      save: jest.fn().mockResolvedValue([]),
    } as any;
    const clarisaInstitutionsRepository = {} as any;
    const evidencesRepository = {} as any;
    const evidencesService = {} as any;
    const resultsKnowledgeProductsRepository = {} as any;
    const resultsKnowledgeProductsService = {
      extractHandleIdentifier: jest.fn(
        (raw: string) => raw?.split('/').slice(-2).join('/') ?? raw,
      ),
      validateKPExistanceByHandle: jest.fn().mockResolvedValue(null),
      findOnCGSpace: jest.fn().mockResolvedValue({ status: 200 }),
    } as any;
    const clarisaCenters = {} as any;
    const userService = { createFull: jest.fn() };
    const resultsTocResultsRepository = {
      logicalDelete: jest.fn().mockResolvedValue(undefined),
    };
    const clarisaInitiatives = { findOne: jest.fn() };
    const resultsTocResultsIndicatorsRepository = {
      logicalDelete: jest.fn().mockResolvedValue(undefined),
    };
    const resultsTocTargetIndicatorRepository = {
      logicalDelete: jest.fn().mockResolvedValue(undefined),
    };
    const resultsCenterRepository = {} as any;
    const clarisaProjectsRepository = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
    };
    const resultsByProjectsRepository = { save: jest.fn() };
    const resultByInitiativesRepository = {
      logicalDelete: jest.fn().mockResolvedValue(undefined),
      findOne: jest.fn().mockResolvedValue({ id: 777 }),
    };
    const shareResultRequestRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockResolvedValue({}),
      logicalDelete: jest.fn().mockResolvedValue(undefined),
    } as any;
    const nonPooledProjectBudgetRepository = {
      save: jest.fn(),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((row) => row),
    };
    const resultsInnovationsUseRepository = {
      getLinkedResultsByOrigin: jest.fn().mockResolvedValue([]),
    };
    const resultsCapacityDevelopmentsRepository = {
      capDevExists: jest.fn().mockResolvedValue(undefined),
    };
    const resultsPolicyChangesRepository = {
      ResultsPolicyChangesExists: jest.fn().mockResolvedValue(undefined),
    };
    const resultQuestionsService = {
      findQuestionPolicyChange: jest.fn().mockResolvedValue({
        status: HttpStatus.OK,
        response: {
          question_text: 'Is this result related to:',
          optionsWithAnswers: [],
        },
      }),
    };

    const pathwayService = {
      getPathwayMetadataForBilateral: jest.fn().mockResolvedValue({
        step_one: null,
        step_two: null,
        step_three: null,
        step_four: null,
      }),
    };

    const makeHandler = (resultType: number) => ({
      resultType,
      afterCreate: jest.fn(),
      initializeResultHeader: undefined,
    });

    const knowledgeProductHandler = makeHandler(
      ResultTypeEnum.KNOWLEDGE_PRODUCT,
    );
    const capacityChangeHandler = makeHandler(ResultTypeEnum.CAPACITY_CHANGE);
    const innovationDevelopmentHandler = makeHandler(
      ResultTypeEnum.INNOVATION_DEVELOPMENT,
    );
    const innovationUseHandler = makeHandler(ResultTypeEnum.INNOVATION_USE);
    const policyChangeHandler = makeHandler(ResultTypeEnum.POLICY_CHANGE);
    const otherOutputHandler = makeHandler(ResultTypeEnum.OTHER_OUTPUT);
    const otherOutcomeHandler = makeHandler(ResultTypeEnum.OTHER_OUTCOME);
    const adUserService = {
      resolveOrCreateContact: jest.fn().mockResolvedValue(null),
    };
    // 2026-09-05: the submitted-for-review notification to the primary Science Program.
    const roleByUserRepository = {
      getUserIdsByInitiative: jest.fn().mockResolvedValue([21, 22]),
    };
    const notificationService = {
      emitResultNotification: jest.fn().mockResolvedValue(undefined),
    };
    // BCT-T-5 — the new trailing @Optional() constructor param. Real behaviour (targets,
    // ordering, dedup, texts) is unit-tested against the real implementation in
    // `result-tagged-notification.service.spec.ts`; here it is a no-op stub unless a test
    // overrides it.
    const resultTaggedNotificationService = {
      notifyBilateralContributorsOnSubmission: jest
        .fn()
        .mockResolvedValue(undefined),
    };

    const service = new BilateralService(
      dataSource,
      resultRepository as any,
      handlersError,
      versioningService,
      userRepository as any,
      clarisaRegionsRepository,
      yearRepository,
      geoScopeRepository as any,
      resultRegionRepository as any,
      clarisaCountriesRepository,
      resultCountryRepository as any,
      clarisaSubnationalAreasRepository,
      resultCountrySubnationalRepository,
      resultByInstitutionsRepository,
      resultInstitutionsBudgetRepository,
      clarisaInstitutionsRepository,
      evidencesRepository,
      evidencesService,
      resultsKnowledgeProductsRepository,
      resultsKnowledgeProductsService,
      clarisaCenters,
      userService as any,
      resultsTocResultsRepository as any,
      clarisaInitiatives as any,
      resultsTocResultsIndicatorsRepository as any,
      resultsTocTargetIndicatorRepository as any,
      resultsCenterRepository,
      clarisaProjectsRepository as any,
      resultsByProjectsRepository as any,
      resultByInitiativesRepository as any,
      shareResultRequestRepository,
      nonPooledProjectBudgetRepository as any,
      resultsInnovationsUseRepository as any,
      resultsCapacityDevelopmentsRepository as any,
      resultsPolicyChangesRepository as any,
      resultQuestionsService as any,
      pathwayService as any,
      knowledgeProductHandler as any,
      capacityChangeHandler as any,
      innovationDevelopmentHandler as any,
      innovationUseHandler as any,
      policyChangeHandler as any,
      otherOutputHandler as any,
      otherOutcomeHandler as any,
      adUserService as any,
      roleByUserRepository as any,
      notificationService as any,
      // BCT-T-5 falsifier: "the service fails to construct when the optional dependency is
      // absent" — `opts.withResultTaggedNotificationService: false` calls the real constructor
      // with this argument genuinely omitted (not just set to `undefined` post-construction),
      // proving the trailing `@Optional()` param.
      opts.withResultTaggedNotificationService === false
        ? undefined
        : (resultTaggedNotificationService as any),
    ) as any;

    Object.assign(service, overrides);

    // Silence internal Logger logs (without replacing the readonly instance)
    jest
      .spyOn(service.logger, 'debug')
      .mockImplementation(() => undefined as any);
    jest
      .spyOn(service.logger, 'warn')
      .mockImplementation(() => undefined as any);
    jest
      .spyOn(service.logger, 'error')
      .mockImplementation(() => undefined as any);
    jest
      .spyOn(service.logger, 'log')
      .mockImplementation(() => undefined as any);

    return {
      service,
      stubs: {
        resultRepository,
        userRepository,
        userService,
        clarisaInitiatives,
        resultsTocTargetIndicatorRepository,
        resultsTocResultsIndicatorsRepository,
        resultsTocResultsRepository,
        resultByInitiativesRepository,
        clarisaProjectsRepository,
        resultsByProjectsRepository,
        nonPooledProjectBudgetRepository,
        resultInstitutionsBudgetRepository,
        resultByIntitutionsRepository: resultByInstitutionsRepository,
        clarisaInstitutionsRepository,
        initiativeBudgetRepository,
        resultsKnowledgeProductsService,
        adUserService,
        roleByUserRepository,
        notificationService,
        resultTaggedNotificationService,
      },
      handlers: {
        knowledgeProductHandler,
      },
    };
  };

  it('unwrapIncomingResults should support results[], result and data', () => {
    const { service } = makeService();
    expect(service.unwrapIncomingResults(undefined)).toEqual([]);
    expect(
      service.unwrapIncomingResults({ results: [{ x: 1 }] } as any),
    ).toEqual([{ x: 1 }]);
    expect(service.unwrapIncomingResults({ result: { y: 2 } } as any)).toEqual([
      { y: 2 },
    ]);
    expect(service.unwrapIncomingResults({ data: { a: 1 } } as any)).toEqual([
      { type: 'BILATERAL', data: { a: 1 } },
    ]);
  });

  it('buildResultRelations should include relations by type', () => {
    const { service } = makeService();
    const kp = service.buildResultRelations(ResultTypeEnum.KNOWLEDGE_PRODUCT);
    expect(kp).toEqual(
      expect.objectContaining({
        result_knowledge_product_array: expect.anything(),
      }),
    );

    const cap = service.buildResultRelations(
      ResultTypeEnum.CAPACITY_SHARING_FOR_DEVELOPMENT,
    );
    expect(cap).not.toHaveProperty('results_capacity_development_object');
  });

  it('filterActiveRelations should filter arrays by is_active (includes null/undefined/1/true)', () => {
    const { service } = makeService();
    const res = service.filterActiveRelations({
      result_region_array: [
        { id: 1, is_active: true },
        { id: 2, is_active: false },
      ],
      result_country_array: [
        {
          id: 1,
          is_active: 1,
          result_countries_subnational_array: [
            { id: 10, is_active: null },
            { id: 11, is_active: 0 },
          ],
        },
      ],
      result_by_institution_array: [
        { id: 1, is_active: undefined },
        { id: 2, is_active: 0 },
      ],
      result_center_array: [{ id: 1, is_active: true }],
      obj_results_toc_result: [
        { id: 1, is_active: true },
        { id: 2, is_active: false },
      ],
      obj_result_by_project: [{ id: 1, is_active: true }],
      result_knowledge_product_array: [
        { id: 1, is_active: true },
        { id: 2, is_active: false },
      ],
    });

    expect(res.result_region_array).toHaveLength(1);
    expect(
      res.result_country_array[0].result_countries_subnational_array,
    ).toHaveLength(1);
    expect(res.result_by_institution_array).toHaveLength(1);
    expect(res.obj_results_toc_result).toHaveLength(1);
    expect(res.result_knowledge_product_array).toHaveLength(1);
  });

  it('extractProgramIdFromTocMapping / extractProgramIdsFromContributing / collectScienceProgramIds', () => {
    const { service } = makeService();
    expect(service.extractProgramIdFromTocMapping(undefined)).toBeNull();
    expect(
      service.extractProgramIdFromTocMapping({ science_program_id: '  ' }),
    ).toBeNull();
    expect(
      service.extractProgramIdFromTocMapping({ science_program_id: 'A1 ' }),
    ).toBe('A1');

    expect(service.extractProgramIdsFromContributing(undefined)).toEqual([]);
    expect(
      service.extractProgramIdsFromContributing([
        { science_program_id: ' B2 ' },
        { science_program_id: '' },
        {},
      ]),
    ).toEqual(['B2']);

    expect(
      service.collectScienceProgramIds({ science_program_id: 'X' }, [
        { science_program_id: 'Y' },
      ]),
    ).toEqual(['X', 'Y']);
  });

  it('validateInitiatives should return invalid ids (based on clarisaInitiatives.findOne)', async () => {
    const { service, stubs } = makeService();
    stubs.clarisaInitiatives.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 1, official_code: 'OK' });

    const invalid = await service.validateInitiatives(['bad', 'ok']);
    expect(invalid).toEqual(['bad']);
  });

  it('validateTocMappingInitiatives should return if there are no ids and throw if there are invalid ids', async () => {
    const { service } = makeService();
    await expect(
      service.validateTocMappingInitiatives(undefined, undefined),
    ).resolves.toBeUndefined();

    jest.spyOn(service, 'collectScienceProgramIds').mockReturnValueOnce(['X']);
    jest
      .spyOn(service, 'validateInitiatives')
      .mockResolvedValueOnce(['X'] as any);

    await expect(
      service.validateTocMappingInitiatives({ science_program_id: 'X' }, []),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('getSystemUserToken should return admin if it exists or fallback', async () => {
    const { service, stubs } = makeService();
    stubs.userRepository.findOne.mockResolvedValueOnce({
      id: 7,
      email: 'admin@prms.pr',
      first_name: null,
      last_name: null,
    });

    await expect(service.getSystemUserToken()).resolves.toEqual(
      expect.objectContaining({ id: 7, email: 'admin@prms.pr' }),
    );

    stubs.userRepository.findOne.mockResolvedValueOnce(null);
    await expect(service.getSystemUserToken()).resolves.toEqual(
      expect.objectContaining({ id: 0, email: 'system@prms.pr' }),
    );
  });

  it('resolveSubmitterPayload should prioritize submitted_by.email', () => {
    const { service } = makeService();
    expect(
      service.resolveSubmitterPayload({
        submitted_by: { email: 'x@example.com' },
        created_by: { email: 'y@example.com' },
      } as any),
    ).toEqual({ email: 'x@example.com' });

    expect(
      service.resolveSubmitterPayload({
        submitted_by: {},
        created_by: { email: 'y@example.com' },
      } as any),
    ).toEqual({ email: 'y@example.com' });
  });

  it('handleTocMapping should return if toc is not an object', async () => {
    const { service } = makeService();
    await expect(
      service.handleTocMapping(null, [], 1, 1),
    ).resolves.toBeUndefined();
  });

  it('resetTocData should call logicalDelete in repositories', async () => {
    const { service, stubs } = makeService();
    await service.resetTocData(10);
    expect(
      stubs.resultsTocTargetIndicatorRepository.logicalDelete,
    ).toHaveBeenCalledWith(10);
    expect(
      stubs.resultsTocResultsIndicatorsRepository.logicalDelete,
    ).toHaveBeenCalledWith(10);
    expect(
      stubs.resultsTocResultsRepository.logicalDelete,
    ).toHaveBeenCalledWith(10);
    expect(
      stubs.resultByInitiativesRepository.logicalDelete,
    ).toHaveBeenCalledWith(10);
  });

  it('validateGeoFocus / resolveScopeId', () => {
    const { service } = makeService();
    expect(() =>
      service.validateGeoFocus(
        { code: 2, name: 'Regional' },
        undefined,
        undefined,
        undefined,
      ),
    ).toThrow(BadRequestException);

    expect(() =>
      service.validateGeoFocus(
        { code: 1, name: 'Global' },
        undefined,
        undefined,
        undefined,
      ),
    ).not.toThrow();

    expect(service.resolveScopeId(50, [])).toBe(50);
    expect(service.resolveScopeId(3, [{ id: 1 }])).toBe(4);
    expect(service.resolveScopeId(3, [{ id: 1 }, { id: 2 }])).toBe(3);
  });

  it('ensureUniqueTitle should validate title and uniqueness', async () => {
    const { service, stubs } = makeService();
    const versionId = 1;
    await expect(
      service.ensureUniqueTitle('   ', versionId),
    ).rejects.toBeInstanceOf(BadRequestException);

    stubs.resultRepository.findOne.mockResolvedValueOnce({ id: 1 });
    await expect(
      service.ensureUniqueTitle('Title', versionId),
    ).rejects.toBeInstanceOf(BadRequestException);

    stubs.resultRepository.findOne.mockResolvedValueOnce(null);
    await expect(
      service.ensureUniqueTitle('Title', versionId),
    ).resolves.toBeUndefined();
  });

  it('runResultTypeHandlers should call handler.afterCreate', async () => {
    const { service, handlers } = makeService();
    await service.runResultTypeHandlers({
      resultId: 1,
      userId: 2,
      bilateralDto: {
        result_type_id: handlers.knowledgeProductHandler.resultType,
      } as any,
      isDuplicateResult: false,
    });
    expect(handlers.knowledgeProductHandler.afterCreate).toHaveBeenCalledTimes(
      1,
    );
  });

  it('initializeResultHeader should use handler.initializeResultHeader if it returns resultHeader', async () => {
    const { service, stubs, handlers } = makeService();
    handlers.knowledgeProductHandler.initializeResultHeader = jest.fn(
      async () => ({
        resultHeader: { id: 999 },
      }),
    );
    stubs.resultRepository.findOne.mockResolvedValue({ id: 999 });

    const out = await service.initializeResultHeader({
      bilateralDto: {
        result_type_id: handlers.knowledgeProductHandler.resultType,
      } as any,
      userId: 1,
      submittedUserId: 2,
      version: { id: 3 },
      year: { year: 2024 },
    });

    expect(out).toEqual({ id: 999 });
    expect(stubs.resultRepository.save).not.toHaveBeenCalled();
    expect(stubs.resultRepository.findOne).toHaveBeenCalledWith({
      where: { id: 999 },
    });
  });

  it('findScope should return scope or throw NotFoundException', async () => {
    const { service } = makeService();
    const geoRepo = (service as any)._geoScopeRepository;

    geoRepo.findOne.mockResolvedValueOnce({ id: 2, code: 2, name: 'Regional' });
    await expect(service.findScope(2, undefined)).resolves.toEqual(
      expect.objectContaining({ id: 2 }),
    );

    geoRepo.findOne.mockResolvedValueOnce(null);
    await expect(
      service.findScope(undefined, 'Missing'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('handleRegions / handleCountries / handleSubnationals: early returns', async () => {
    const { service } = makeService();
    const resultRegionRepo = (service as any)._resultRegionRepository;
    const resultCountryRepo = (service as any)._resultCountryRepository;

    const result: any = { id: 1 };
    const scope: any = { id: 3 }; // forces region cleanup

    await service.handleRegions(result, scope, undefined);
    expect(resultRegionRepo.updateRegions).toHaveBeenCalledWith(1, []);
    expect(result.has_regions).toBe(false);

    const result2: any = { id: 2 };
    await service.handleCountries(result2, undefined, undefined, 4, 1);
    expect(resultCountryRepo.updateCountries).toHaveBeenCalledWith(2, []);
    expect(result2.has_countries).toBe(false);

    // geoScopeId != 5 => no-op
    await expect(
      service.handleSubnationals([], [], 4, 1),
    ).resolves.toBeUndefined();
  });

  it('findOrCreateUser should validate email and return existing user', async () => {
    const { service, stubs } = makeService();
    await expect(
      service.findOrCreateUser({}, { id: 1 }),
    ).rejects.toBeInstanceOf(BadRequestException);

    stubs.userRepository.findOne.mockResolvedValueOnce({
      id: 9,
      email: 'u@x.com',
    });
    await expect(
      service.findOrCreateUser({ email: 'u@x.com' }, { id: 1 }),
    ).resolves.toEqual({ id: 9, email: 'u@x.com' });
  });

  it('handleNonPooledProject should return if there is no valid list', async () => {
    const { service } = makeService();
    await expect(
      service.handleNonPooledProject(1, 1, undefined),
    ).resolves.toBeUndefined();
    await expect(
      service.handleNonPooledProject(1, 1, []),
    ).resolves.toBeUndefined();
  });

  describe('resolveContributingProjects — the preflight that runs before any write', () => {
    const grantTitle = 'T-PJ-003772';

    it('scopes every lookup to the reporting year and prefers external_code', async () => {
      const { service, stubs } = makeService();
      stubs.clarisaProjectsRepository.find.mockResolvedValue([
        { id: 2149, isActive: null },
      ]);

      const resolved = await service.resolveContributingProjects(
        [{ grant_title: grantTitle, usd_budget: 2500 }],
        2026,
      );

      // external_code is tried first, and it resolves, so the title columns are never reached.
      expect(stubs.clarisaProjectsRepository.find).toHaveBeenCalledTimes(1);
      expect(stubs.clarisaProjectsRepository.find).toHaveBeenCalledWith({
        where: { externalCode: grantTitle, phase: 2026 },
      });
      expect(resolved.get(grantTitle)).toEqual({ id: 2149, isActive: null });
    });

    it('falls back to short_name then full_name, still inside the phase', async () => {
      const { service, stubs } = makeService();
      stubs.clarisaProjectsRepository.find
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ id: 77, isActive: null }]);

      await service.resolveContributingProjects(
        [{ grant_title: 'A long project title' }],
        2026,
      );

      expect(
        stubs.clarisaProjectsRepository.find.mock.calls.map((c) => c[0]),
      ).toEqual([
        { where: { externalCode: 'A long project title', phase: 2026 } },
        { where: { shortName: 'A long project title', phase: 2026 } },
        { where: { fullName: 'A long project title', phase: 2026 } },
      ]);
    });

    // The regression this whole change exists for: the legacy generation of
    // `clarisa_projects` stores "<code>-<title>" in both name columns at phase 2025. It used to
    // win the match, and the result was bound to a project no catalogue can surface.
    it('rejects a grant_title that only matches a row of another phase', async () => {
      const { service, stubs } = makeService();
      stubs.clarisaProjectsRepository.find.mockResolvedValue([]);

      await expect(
        service.resolveContributingProjects(
          [
            {
              grant_title:
                'T-PJ-003772-TAAT Clearinghouse: Re-invest to Accelerate Innovation Adoption',
              usd_budget: 2500,
            },
          ],
          2026,
        ),
      ).rejects.toThrow(/no project of the 2026 reporting phase/);
    });

    it('ignores a candidate that is explicitly inactive', async () => {
      const { service, stubs } = makeService();
      stubs.clarisaProjectsRepository.find.mockResolvedValue([
        { id: 2149, isActive: false },
      ]);

      await expect(
        service.resolveContributingProjects(
          [{ grant_title: grantTitle }],
          2026,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('breaks a multi-row tie on the lowest id so the binding is deterministic', async () => {
      const { service, stubs } = makeService();
      stubs.clarisaProjectsRepository.find.mockResolvedValue([
        { id: 900, isActive: null },
        { id: 12, isActive: null },
        { id: 450, isActive: null },
      ]);

      const resolved = await service.resolveContributingProjects(
        [{ grant_title: grantTitle }],
        2026,
      );

      expect(resolved.get(grantTitle).id).toBe(12);
    });

    it('returns an empty map when the payload carries no projects', async () => {
      const { service, stubs } = makeService();

      await expect(
        service.resolveContributingProjects(undefined, 2026),
      ).resolves.toEqual(new Map());
      expect(stubs.clarisaProjectsRepository.find).not.toHaveBeenCalled();
    });
  });

  describe('investment amounts that used to be accepted and dropped', () => {
    const innovationUse = ResultTypeEnum.INNOVATION_USE;

    describe('contributing partners', () => {
      const partnerPayload = (extra: any) => [
        { institution_id: 42, name: 'Some Partner', ...extra },
      ];

      const withMatchedInstitution = () => {
        const { service, stubs } = makeService();
        stubs.clarisaInstitutionsRepository.findOne = jest
          .fn()
          .mockResolvedValue({ id: 42 });
        return { service, stubs };
      };

      it('persists the usd_budget onto the partner budget row', async () => {
        const { service, stubs } = withMatchedInstitution();

        await service.handleInstitutions(
          11962,
          partnerPayload({ usd_budget: 7500 }),
          1,
          innovationUse,
        );

        expect(
          stubs.resultInstitutionsBudgetRepository.save,
        ).toHaveBeenCalledWith(
          expect.objectContaining({ kind_cash: 7500, is_determined: null }),
        );
      });

      it('nulls the amount when the partner says it is yet to be determined', async () => {
        const { service, stubs } = withMatchedInstitution();

        await service.handleInstitutions(
          11962,
          partnerPayload({ usd_budget: 7500, is_determined: true }),
          1,
          innovationUse,
        );

        expect(
          stubs.resultInstitutionsBudgetRepository.save,
        ).toHaveBeenCalledWith(
          expect.objectContaining({ kind_cash: null, is_determined: true }),
        );
      });

      it('marks an omitted Innovation Use partner amount as yet to be determined', async () => {
        const { service, stubs } = withMatchedInstitution();

        await service.handleInstitutions(
          11962,
          partnerPayload({}),
          1,
          innovationUse,
        );

        expect(
          stubs.resultInstitutionsBudgetRepository.save,
        ).toHaveBeenCalledWith(
          expect.objectContaining({ kind_cash: null, is_determined: true }),
        );
      });
    });

    describe('lead science program', () => {
      it('writes result_initiative_budget from the amount on toc_mapping', async () => {
        const { service, stubs } = makeService();

        await service.saveLeadProgramInvestment(
          11962,
          9,
          { science_program_id: 'SP09', usd_budget: 12000 },
          ResultTypeEnum.INNOVATION_USE,
          1,
        );

        expect(stubs.initiativeBudgetRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            result_initiative_id: 777,
            kind_cash: 12000,
            is_determined: null,
          }),
        );
      });

      it('updates the existing row rather than adding a second one', async () => {
        const { service, stubs } = makeService();
        stubs.initiativeBudgetRepository.findOne.mockResolvedValue({
          result_initiative_budget_id: 3,
          kind_cash: 1,
        });

        await service.saveLeadProgramInvestment(
          11962,
          9,
          { usd_budget: 12000 },
          ResultTypeEnum.INNOVATION_USE,
          1,
        );

        expect(stubs.initiativeBudgetRepository.create).not.toHaveBeenCalled();
        expect(stubs.initiativeBudgetRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            result_initiative_budget_id: 3,
            kind_cash: 12000,
          }),
        );
      });

      // Silence must stay silent: seeding an empty row for every ingested result would put a
      // line in the form that nobody wrote.
      it('marks an omitted Innovation Use lead program amount as yet to be determined', async () => {
        const { service, stubs } = makeService();

        await service.saveLeadProgramInvestment(
          11962,
          9,
          { science_program_id: 'SP09' },
          ResultTypeEnum.INNOVATION_USE,
          1,
        );

        expect(stubs.initiativeBudgetRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({ kind_cash: null, is_determined: true }),
        );
      });

      it('treats a zero Innovation Use lead program amount as yet to be determined', async () => {
        const { service, stubs } = makeService();
        await service.saveLeadProgramInvestment(
          11962,
          9,
          { usd_budget: 0 },
          ResultTypeEnum.INNOVATION_USE,
          1,
        );
        expect(stubs.initiativeBudgetRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({ kind_cash: null, is_determined: true }),
        );
      });

      it('writes nothing for a type that carries no investment tables', async () => {
        const { service, stubs } = makeService();

        await service.saveLeadProgramInvestment(
          11962,
          9,
          { usd_budget: 12000 },
          ResultTypeEnum.POLICY_CHANGE,
          1,
        );

        expect(stubs.initiativeBudgetRepository.save).not.toHaveBeenCalled();
      });
    });
  });

  describe('handleNonPooledProject — writes against the pre-resolved projects', () => {
    const grantTitle = 'T-PJ-003772';

    it('binds the result to the project the preflight resolved, without re-querying', async () => {
      const { service, stubs } = makeService();
      stubs.resultsByProjectsRepository.save.mockResolvedValue({ id: 2520 });

      await service.handleNonPooledProject(
        11962,
        1,
        [{ grant_title: grantTitle, usd_budget: 2500 }],
        ResultTypeEnum.INNOVATION_USE,
        new Map([[grantTitle, { id: 2149 }]]),
      );

      expect(stubs.clarisaProjectsRepository.find).not.toHaveBeenCalled();
      expect(stubs.resultsByProjectsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ result_id: 11962, project_id: 2149 }),
      );
      expect(stubs.nonPooledProjectBudgetRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ result_project_id: 2520, kind_cash: 2500 }),
      );
    });

    it('skips a grant_title the preflight did not resolve instead of writing a partial link', async () => {
      const { service, stubs } = makeService();

      await service.handleNonPooledProject(
        1,
        1,
        [{ grant_title: 'never resolved' }],
        ResultTypeEnum.INNOVATION_USE,
        new Map(),
      );

      expect(stubs.resultsByProjectsRepository.save).not.toHaveBeenCalled();
    });
  });

  it('handleLeadCenter should return early if leadCenter is invalid or empty', async () => {
    const { service } = makeService();
    await expect(
      service.handleLeadCenter(1, null as any, 1),
    ).resolves.toBeUndefined();
    await expect(
      service.handleLeadCenter(1, {} as any, 1),
    ).resolves.toBeUndefined();
  });

  // P2-3166. `result.source` says a result arrived through the API but never says from whom,
  // which is what routing a webhook back needs. These two helpers are the whole of that logic;
  // `create()` itself is a ~20-collaborator transaction, exercised end to end (with every
  // collaborator stubbed) in `describe('create() — call-site ordering (BCT-T-3 / reusable by T5)')`
  // below.
  describe('external platform identity (P2-3166)', () => {
    const mis = { id: 12, name: 'Reporting Tool', acronym: 'PRMS' };

    describe('buildExternalIdentity', () => {
      it('takes the platform from the authenticated key, never from the body tenant', () => {
        const { service } = makeService();

        const identity = (service as any).buildExternalIdentity(
          { external_reference: 'STAR-9f2c-4471', tenant: 'spoofed.tenant' },
          mis,
        );

        expect(identity).toEqual({
          external_platform_id: 12,
          external_platform_code: 'PRMS',
          external_reference: 'STAR-9f2c-4471',
        });
        // The body's `tenant` is caller-declared; trusting it would let a caller aim our
        // callbacks at any platform it names.
        expect(JSON.stringify(identity)).not.toContain('spoofed.tenant');
      });

      // The reference is the platform's own id for *this* result, so it has to come off the
      // result payload. Reading it from the envelope would give every result in a batch the same
      // value and make the callback unmatchable — which is what it used to do.
      it('reads the reference from the result, not from the envelope idempotencyKey', () => {
        const { service } = makeService();

        const identity = (service as any).buildExternalIdentity(
          { external_reference: 'STAR-9f2c-4471' },
          mis,
        );
        expect(identity.external_reference).toBe('STAR-9f2c-4471');

        // An envelope key must not leak in when the result carries no reference of its own.
        const noRef = (service as any).buildExternalIdentity(
          { idempotencyKey: 'prms:kp:ingest:abc' } as any,
          mis,
        );
        expect(noRef.external_reference).toBeNull();
      });

      it('keeps the reference null when it is absent or blank, never an empty string', () => {
        const { service } = makeService();

        for (const value of [undefined, '', '   ']) {
          const identity = (service as any).buildExternalIdentity(
            { external_reference: value },
            mis,
          );
          // Null means "this result has no id in an external system" — a bilateral created in the
          // PRMS UI. An empty string would claim one exists and is blank.
          expect(identity.external_reference).toBeNull();
          // The platform is still recorded: no reference does not mean no origin.
          expect(identity.external_platform_id).toBe(12);
        }
      });

      it('yields nulls when no platform was authenticated', () => {
        const { service } = makeService();

        expect(
          (service as any).buildExternalIdentity({ tenant: 'whatever' }),
        ).toEqual({
          external_platform_id: null,
          external_platform_code: null,
          external_reference: null,
        });
      });

      it('keeps the platform even when the upstream sent no idempotency key', () => {
        const { service } = makeService();

        expect((service as any).buildExternalIdentity({}, mis)).toEqual({
          external_platform_id: 12,
          external_platform_code: 'PRMS',
          external_reference: null,
        });
      });
    });

    describe('applyExternalIdentity', () => {
      it('stamps the identity on a header built by a type handler', async () => {
        const { service, stubs } = makeService();

        await (service as any).applyExternalIdentity(99, {
          external_platform_id: 12,
          external_platform_code: 'PRMS',
          external_reference: 'abc',
        });

        expect(stubs.resultRepository.update).toHaveBeenCalledWith(99, {
          external_platform_id: 12,
          external_platform_code: 'PRMS',
          external_reference: 'abc',
        });
      });

      it('leaves the row alone when there is nothing to record', async () => {
        const { service, stubs } = makeService();

        await (service as any).applyExternalIdentity(99, {
          external_platform_id: null,
          external_platform_code: null,
          external_reference: null,
        });
        await (service as any).applyExternalIdentity(99, undefined);

        expect(stubs.resultRepository.update).not.toHaveBeenCalled();
      });
    });
  });

  describe('populateResultFromExtractedMds — who leads', () => {
    const result = { id: 11, result_type_id: 1 } as any;
    const jobLead = {
      institution_id: 7,
      acronym: 'AfricaRice',
      name: 'Africa Rice Center',
    };

    const spies = (service: any) => ({
      lead: jest
        .spyOn(service, 'handleLeadCenter')
        .mockResolvedValue(undefined),
      contributing: jest
        .spyOn(service, 'handleContributingCenters')
        .mockResolvedValue(undefined),
    });

    // 2026-09-07: the centre the model read in the document ("commissioned by ILRI") became the
    // lead of an AfricaRice upload. The job's centre leads; the extracted one contributes.
    it('the job centre leads and the extracted centre is kept as a contributor', async () => {
      const { service } = makeService();
      const { lead, contributing } = spies(service);

      await service.populateResultFromExtractedMds(
        result,
        { lead_center: { acronym: 'ILRI' } },
        9,
        { leadCenter: jobLead },
      );

      expect(lead).toHaveBeenCalledTimes(1);
      expect(lead).toHaveBeenCalledWith(11, jobLead, 9);
      expect(contributing).toHaveBeenCalledWith(
        11,
        [{ acronym: 'ILRI' }],
        9,
        jobLead,
      );
    });

    it('with a job centre but nothing extracted, the job centre still leads', async () => {
      const { service } = makeService();
      const { lead, contributing } = spies(service);

      await service.populateResultFromExtractedMds(result, null, 9, {
        leadCenter: jobLead,
      });

      expect(lead).toHaveBeenCalledWith(11, jobLead, 9);
      expect(contributing).not.toHaveBeenCalled();
    });

    it('without a job centre the extracted centre leads, as before', async () => {
      const { service } = makeService();
      const { lead, contributing } = spies(service);

      await service.populateResultFromExtractedMds(
        result,
        { lead_center: { acronym: 'ILRI' } },
        9,
      );

      expect(lead).toHaveBeenCalledWith(11, { acronym: 'ILRI' }, 9);
      expect(contributing).not.toHaveBeenCalled();
    });

    it('does nothing with neither MDS nor job centre', async () => {
      const { service } = makeService();
      const { lead, contributing } = spies(service);

      await service.populateResultFromExtractedMds(result, null, 9);

      expect(lead).not.toHaveBeenCalled();
      expect(contributing).not.toHaveBeenCalled();
    });
  });

  describe('populateTypeSpecificFromExtractedMds', () => {
    it('forwards knowledge_product to the KP handler when promoting a KP draft', async () => {
      const { service, handlers } = makeService();
      const extractedMds = {
        knowledge_product: { handle: '10568/175322' },
      };

      await service.populateTypeSpecificFromExtractedMds(
        {
          id: 42,
          result_type_id: ResultTypeEnum.KNOWLEDGE_PRODUCT,
          title: 'Some KP title',
        } as any,
        extractedMds,
        7,
      );

      expect(handlers.knowledgeProductHandler.afterCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          bilateralDto: expect.objectContaining({
            knowledge_product: extractedMds['knowledge_product'],
          }),
          resultId: 42,
          userId: 7,
        }),
      );
    });
  });

  describe('normalizeInstitutionValue (ALLIANCE_ALIASES)', () => {
    it.each([
      ['ABC', true],
      ['abc', true],
      ['CIAT-BIOVERSITY', true],
      ['CIAT (Alliance)', true],
      ['BIOVERSITY (Alliance)', true],
      ['CIAT Alliance', true],
      ['Bioversity Alliance', true],
      ['CIAT', false],
      ['Bioversity', false],
      ['Some Other Org', false],
    ])(
      'normalizeInstitutionValue(%s) → isAlias=%s',
      (input, shouldNormalize) => {
        const { service } = makeService();
        const result = (service as any).normalizeInstitutionValue(input);
        if (shouldNormalize) {
          expect(result).toBe(
            'Alliance of Bioversity and CIAT - Headquarter (Bioversity International)',
          );
        } else {
          expect(result).toBe(input);
        }
      },
    );
  });
  // CLARISA splits the Alliance into CENTER-03 "CIAT (Alliance)" (Regional Hub) and
  // CENTER-02 "Bioversity (Alliance)" (Headquarter), and the 2026 mapping is done per
  // centre. Resolution used to get this wrong in both directions, verified against the
  // live index on 2026-08-26: every Alliance spelling — the canonical "CIAT (Alliance)"
  // included — collapsed onto the Headquarter institution, while the plain acronyms fell
  // through to a `LIKE '%BIOVERSITY%'` that matches BOTH institutions (both names contain
  // "Bioversity") and then took whichever row the database returned first. A payload
  // sending "BIOVERSITY" was stored as CENTER-03, CIAT.
  describe('Alliance centre resolution', () => {
    const centerFor = (code: string) => ({ code, institutionId: 0 });

    const makeCenterService = () => {
      const saved: any[] = [];
      const { service } = makeService({
        _clarisaCenters: {
          findOne: jest.fn(async ({ where }: any) => centerFor(where.code)),
          // Nothing should reach institution-based matching in these cases.
          find: jest.fn(async () => []),
        },
        _clarisaInstitutionsRepository: { find: jest.fn(async () => []) },
        _resultsCenterRepository: {
          getAllResultsCenterByResultIdAndCenterId: jest.fn(async () => null),
          save: jest.fn(async (row: any) => {
            saved.push(row);
            return row;
          }),
        },
      });
      return { service, saved };
    };

    it.each([
      ['BIOVERSITY', 'CENTER-02'],
      ['Bioversity (Alliance)', 'CENTER-02'],
      ['bioversity alliance', 'CENTER-02'],
      ['Bioversity International', 'CENTER-02'],
      ['CIAT', 'CENTER-03'],
      ['CIAT (Alliance)', 'CENTER-03'],
      ['ciat   (alliance)', 'CENTER-03'],
      // Pre-split spellings stay where their data already is.
      ['ABC', 'CENTER-02'],
      ['CIAT-BIOVERSITY', 'CENTER-02'],
    ])('lead_center acronym %s resolves to %s', async (acronym, code) => {
      const { service, saved } = makeCenterService();

      await service.handleLeadCenter(1, { acronym }, 9);

      expect(saved).toEqual([
        expect.objectContaining({
          center_id: code,
          is_leading_result: true,
          is_primary: true,
        }),
      ]);
    });

    it('reads the alias from the name field too', async () => {
      const { service, saved } = makeCenterService();

      await service.handleLeadCenter(1, { name: 'Bioversity (Alliance)' }, 9);

      expect(saved[0]).toEqual(
        expect.objectContaining({ center_id: 'CENTER-02' }),
      );
    });

    it('keeps the two Alliance centres apart', async () => {
      const ciat = makeCenterService();
      const bioversity = makeCenterService();

      await ciat.service.handleLeadCenter(1, { acronym: 'CIAT (Alliance)' }, 9);
      await bioversity.service.handleLeadCenter(
        2,
        { acronym: 'Bioversity (Alliance)' },
        9,
      );

      expect(ciat.saved[0].center_id).toBe('CENTER-03');
      expect(bioversity.saved[0].center_id).toBe('CENTER-02');
      expect(ciat.saved[0].center_id).not.toBe(bioversity.saved[0].center_id);
    });

    it('leaves a non-Alliance acronym to the normal institution path', async () => {
      const { service, saved } = makeCenterService();

      await service.handleLeadCenter(1, { acronym: 'IITA' }, 9);

      // No alias entry, and the stubs match no institution, so nothing is stored —
      // proving the alias table did not claim it.
      expect(saved).toEqual([]);
    });

    it('stores an Alliance contributing centre under its own code', async () => {
      const { service, saved } = makeCenterService();

      await service.handleContributingCenters(
        1,
        [{ acronym: 'Bioversity (Alliance)' }],
        9,
        { acronym: 'IITA' },
      );

      expect(saved).toEqual([
        expect.objectContaining({
          center_id: 'CENTER-02',
          is_leading_result: false,
          is_primary: false,
        }),
      ]);
    });

    it('does not repeat the lead centre as a contributor, whichever spelling each field uses', async () => {
      const { service, saved } = makeCenterService();

      await service.handleContributingCenters(
        1,
        [{ acronym: 'BIOVERSITY' }],
        9,
        { acronym: 'Bioversity (Alliance)' },
      );

      expect(saved).toEqual([]);
    });

    it('keeps a sibling Alliance centre when the other one leads', async () => {
      const { service, saved } = makeCenterService();

      await service.handleContributingCenters(
        1,
        [{ acronym: 'CIAT (Alliance)' }],
        9,
        { acronym: 'Bioversity (Alliance)' },
      );

      expect(saved).toEqual([
        expect.objectContaining({ center_id: 'CENTER-03' }),
      ]);
    });

    it('refuses to resolve when the alias names a code CLARISA does not have', async () => {
      const { service, saved } = makeCenterService();
      (service as any)._clarisaCenters.findOne = jest.fn(async () => null);

      await service.handleLeadCenter(
        1,
        { acronym: 'Bioversity (Alliance)' },
        9,
      );

      expect(saved).toEqual([]);
    });
  });

  /**
   * The lead contact person used to be written by an `update()` a few lines AFTER
   * `initializeResultHeader` had already re-read the row, so the later
   * `save({ ...newResultHeader, ... })` spread the stale nulls back over it and wiped both
   * columns. Verified live: results 8911-8914 were created with a contact in the payload and
   * came back with `lead_contact_person: null`.
   *
   * The invariant that makes the clobber impossible is that the header entity itself carries
   * the contact — then any later spread-save re-writes the same values harmlessly.
   */
  describe('lead contact person', () => {
    const dtoWith = (contact: any) =>
      ({
        title: 'T',
        description: 'D',
        result_type_id: ResultTypeEnum.CAPACITY_SHARING_FOR_DEVELOPMENT,
        result_level_id: 4,
        lead_contact_person: contact,
      }) as any;

    const initHeader = async (service: any, dto: any) =>
      service.initializeResultHeader({
        bilateralDto: dto,
        userId: 1,
        submittedUserId: 2,
        version: { id: 36 },
        year: { year: 2026 },
      });

    it('writes the contact as part of the header, not afterwards', async () => {
      const { service, stubs } = makeService();
      stubs.resultRepository.save.mockImplementation(async (x: any) => ({
        ...x,
        id: 11382,
      }));
      stubs.resultRepository.findOne.mockImplementation(async () => ({
        id: 11382,
      }));
      stubs.adUserService.resolveOrCreateContact.mockResolvedValue({
        id: 77,
        display_name: 'Nicoleta Trifa',
      });

      await initHeader(
        service,
        dtoWith({ name: 'n.trifa@cgiar.org', email: 'n.trifa@cgiar.org' }),
      );

      const saved = stubs.resultRepository.save.mock.calls[0][0];
      expect(saved.lead_contact_person_id).toBe(77);
      // The directory's own name, not the payload's — producers routinely send the email there.
      expect(saved.lead_contact_person).toBe('Nicoleta Trifa');
    });

    it('keeps the payload name as free text when the directory has no match', async () => {
      const { service, stubs } = makeService();
      stubs.resultRepository.save.mockImplementation(async (x: any) => ({
        ...x,
        id: 1,
      }));
      stubs.resultRepository.findOne.mockResolvedValue({ id: 1 });
      stubs.adUserService.resolveOrCreateContact.mockResolvedValue(null);

      await initHeader(
        service,
        dtoWith({ name: 'Arouna Dissa', email: 'a.dissa@ier.ml' }),
      );

      const saved = stubs.resultRepository.save.mock.calls[0][0];
      expect(saved.lead_contact_person).toBe('Arouna Dissa');
      expect(saved.lead_contact_person_id).toBeNull();
    });

    it('never invents a directory row from the payload', async () => {
      const { service, stubs } = makeService();
      stubs.resultRepository.save.mockImplementation(async (x: any) => ({
        ...x,
        id: 1,
      }));
      stubs.resultRepository.findOne.mockResolvedValue({ id: 1 });
      stubs.adUserService.resolveOrCreateContact.mockResolvedValue(null);

      await initHeader(
        service,
        dtoWith({ name: 'Arouna Dissa', email: 'a.dissa@ier.ml' }),
      );

      // A fabricated row would be indistinguishable from a real person in the reporting
      // tool's contact picker: searchUsers is cache-first and filters only by is_active.
      expect(stubs.adUserService.resolveOrCreateContact).toHaveBeenCalledWith(
        'a.dissa@ier.ml',
      );
    });

    it('leaves both columns out when no contact is sent', async () => {
      const { service, stubs } = makeService();
      stubs.resultRepository.save.mockImplementation(async (x: any) => ({
        ...x,
        id: 1,
      }));
      stubs.resultRepository.findOne.mockResolvedValue({ id: 1 });

      await initHeader(service, dtoWith(undefined));

      const saved = stubs.resultRepository.save.mock.calls[0][0];
      expect(saved.lead_contact_person).toBeUndefined();
      expect(saved.lead_contact_person_id).toBeUndefined();
      expect(stubs.adUserService.resolveOrCreateContact).not.toHaveBeenCalled();
    });
  });

  // BSR-T-2 / BSR-AC-3: the base header save is the only creation path that has no explicit
  // `creation_method`, so a CreateBilateralDto ingested through it falls through to the DB's
  // `UNKNOWN` default unless it is stamped `EXTERNAL` here.
  describe('creation_method stamp on the base header save (BSR-T-2)', () => {
    const dto = {
      title: 'T',
      description: 'D',
      result_type_id: ResultTypeEnum.CAPACITY_SHARING_FOR_DEVELOPMENT,
      result_level_id: 4,
    } as any;

    it('stamps creation_method EXTERNAL on a DTO ingested through the base header save', async () => {
      const { service, stubs } = makeService();
      stubs.resultRepository.save.mockImplementation(async (x: any) => ({
        ...x,
        id: 1,
      }));
      stubs.resultRepository.findOne.mockResolvedValue({ id: 1 });

      await (service as any).initializeResultHeader({
        bilateralDto: dto,
        userId: 1,
        submittedUserId: 2,
        version: { id: 36 },
        year: { year: 2026 },
      });

      const saved = stubs.resultRepository.save.mock.calls[0][0];
      expect(saved.creation_method).toBe(ResultCreationMethod.EXTERNAL);
    });
  });

  // 2026-09-05 — the arrival announcement to the primary Science Program. Both entry paths call
  // this (the centre form's submitForReview and the ingest, post-commit); these tests pin the
  // emitter's own contract: status-guarded, SP-member fan-out, centre acronym in the copy, and
  // never throwing.
  describe('emitBilateralSubmittedNotification', () => {
    const arrange = () => {
      const { service, stubs } = makeService();
      const svc: any = service;
      svc._resultRepository.findOne = jest
        .fn()
        .mockResolvedValue({ id: 77, status_id: 5 });
      svc._resultByInitiativesRepository = {
        getOwnerInitiativeByResult: jest.fn().mockResolvedValue({ id: 6 }),
      };
      svc._resultsCenterRepository = {
        getAllResultsCenterByResultId: jest
          .fn()
          .mockResolvedValue([
            { code: 'CENTER-01', acronym: 'AfricaRice', is_leading_result: 1 },
          ]),
      };
      return { service: svc, stubs };
    };

    it('notifies every member of the primary SP, naming the lead centre in the copy', async () => {
      const { service, stubs } = arrange();

      await service.emitBilateralSubmittedNotification(77, 42);

      expect(
        stubs.notificationService.emitResultNotification,
      ).toHaveBeenCalledWith(
        'Result',
        'Bilateral Result Submitted',
        [21, 22],
        42,
        77,
        'was submitted for your review by AfricaRice.',
      );
    });

    it('stays silent when the result is not Pending Review (duplicate re-ingest guard)', async () => {
      const { service, stubs } = arrange();
      service._resultRepository.findOne = jest
        .fn()
        .mockResolvedValue({ id: 77, status_id: 6 });

      await service.emitBilateralSubmittedNotification(77, 42);

      expect(
        stubs.notificationService.emitResultNotification,
      ).not.toHaveBeenCalled();
    });

    it('stays silent when the result has no primary Science Program', async () => {
      const { service, stubs } = arrange();
      service._resultByInitiativesRepository.getOwnerInitiativeByResult = jest
        .fn()
        .mockResolvedValue(null);

      await service.emitBilateralSubmittedNotification(77, 42);

      expect(
        stubs.notificationService.emitResultNotification,
      ).not.toHaveBeenCalled();
    });

    it('never throws — a notification failure cannot fail a submit or an ingest', async () => {
      const { service, stubs } = arrange();
      stubs.roleByUserRepository.getUserIdsByInitiative.mockRejectedValue(
        new Error('db down'),
      );

      await expect(
        service.emitBilateralSubmittedNotification(77, 42),
      ).resolves.toBeUndefined();
    });

    it('still notifies without the centre name when the centres lookup fails', async () => {
      const { service, stubs } = arrange();
      service._resultsCenterRepository.getAllResultsCenterByResultId = jest
        .fn()
        .mockRejectedValue(new Error('no centres'));

      await service.emitBilateralSubmittedNotification(77, 42);

      expect(
        stubs.notificationService.emitResultNotification,
      ).toHaveBeenCalledWith(
        'Result',
        'Bilateral Result Submitted',
        [21, 22],
        42,
        77,
        'was submitted for your review.',
      );
    });
  });

  describe('announcePendingReview (BCT-T-5)', () => {
    it('emits the submitted notification, then the tagging notifications, in that order', async () => {
      const { service, stubs } = makeService();
      jest
        .spyOn(service, 'emitBilateralSubmittedNotification')
        .mockResolvedValue(undefined);

      await service.announcePendingReview(77, 42);

      expect(service.emitBilateralSubmittedNotification).toHaveBeenCalledWith(
        77,
        42,
      );
      expect(
        stubs.resultTaggedNotificationService
          .notifyBilateralContributorsOnSubmission,
      ).toHaveBeenCalledWith(77, 42);
      const submittedOrder = (
        service.emitBilateralSubmittedNotification as jest.Mock
      ).mock.invocationCallOrder[0];
      const taggingOrder = (
        stubs.resultTaggedNotificationService
          .notifyBilateralContributorsOnSubmission as jest.Mock
      ).mock.invocationCallOrder[0];
      expect(taggingOrder).toBeGreaterThan(submittedOrder);
    });

    // Falsifier: "a throwing submitted emitter skips tagging (or the reverse)". Both real
    // methods already swallow their own errors (never throw), so this drives the failure through
    // a test double that DOES throw — the only way to prove the two try/catch blocks are truly
    // independent rather than one relying on the other never failing.
    it('still emits the tagging notifications when the submitted emitter throws', async () => {
      const { service, stubs } = makeService();
      jest
        .spyOn(service, 'emitBilateralSubmittedNotification')
        .mockRejectedValue(new Error('submitted emitter down'));

      await expect(
        service.announcePendingReview(77, 42),
      ).resolves.toBeUndefined();

      expect(
        stubs.resultTaggedNotificationService
          .notifyBilateralContributorsOnSubmission,
      ).toHaveBeenCalledWith(77, 42);
      expect(service.logger.error).toHaveBeenCalledWith(
        'Failed to emit the submitted-for-review notification for result 77',
        expect.any(Error),
      );
    });

    it('still emits the submitted notification when the tagging emitter throws', async () => {
      const { service, stubs } = makeService();
      jest
        .spyOn(service, 'emitBilateralSubmittedNotification')
        .mockResolvedValue(undefined);
      stubs.resultTaggedNotificationService.notifyBilateralContributorsOnSubmission.mockRejectedValue(
        new Error('tagging down'),
      );

      await expect(
        service.announcePendingReview(77, 42),
      ).resolves.toBeUndefined();

      expect(service.emitBilateralSubmittedNotification).toHaveBeenCalledWith(
        77,
        42,
      );
      expect(service.logger.error).toHaveBeenCalledWith(
        'Failed to emit contributor tagging notifications for result 77',
        expect.any(Error),
      );
    });

    // Falsifier: "the service fails to construct when the optional dependency is absent". The
    // constructor call genuinely omits the trailing argument (see `makeService`'s
    // `opts.withResultTaggedNotificationService: false`) — this is not the same as passing
    // `undefined` after the fact, it proves the real `@Optional()` constructor accepts a caller
    // that never supplies the dependency at all.
    it('constructs without the optional ResultTaggedNotificationService and still emits the submitted notification, logging the tagging skip', async () => {
      const { service } = makeService(
        {},
        { withResultTaggedNotificationService: false },
      );
      jest
        .spyOn(service, 'emitBilateralSubmittedNotification')
        .mockResolvedValue(undefined);

      await expect(
        service.announcePendingReview(77, 42),
      ).resolves.toBeUndefined();

      expect(service.emitBilateralSubmittedNotification).toHaveBeenCalledWith(
        77,
        42,
      );
      expect(service.logger.warn).toHaveBeenCalledWith(
        'ResultTaggedNotificationService unavailable; skipping contributor tagging notifications for result 77',
      );
    });
  });

  describe('ensureDerivedContributingCenters (BCT-T-3)', () => {
    const AFRICARICE = { code: 'AFRICARICE', institutionId: 1 };
    const CIP = { code: 'CIP', institutionId: 2 };

    const arrange = (opts: {
      resultSource?: SourceEnum;
      projectRows?: Array<{
        project_id: number;
        is_lead?: boolean | null;
        is_active?: boolean;
      }>;
      projects?: Array<{
        id: number;
        organizationCode: number | null;
        sourceCenterAcronym?: string | null;
      }>;
      centers?: Array<{ code: string; institutionId: number }>;
      leadingRows?: Array<{ center_id: string }>;
      /** Rows `find({ where: { result_id, center_id } })` returns per code, before any write. */
      existingRowsByCode?: Record<
        string,
        Array<{ id: number; is_active: boolean }>
      >;
    }) => {
      const saved: any[] = [];
      const updated: any[] = [];
      const resultsCenterRepository = {
        // Discriminates the two shapes the method actually sends: the leading-rows query
        // (`is_leading_result: true`) and the per-code existing-rows query (`center_id`).
        find: jest.fn(async ({ where }: any) => {
          if (where?.is_leading_result) return opts.leadingRows ?? [];
          return opts.existingRowsByCode?.[where?.center_id] ?? [];
        }),
        save: jest.fn(async (row: any) => {
          saved.push(row);
          return row;
        }),
        update: jest.fn(async (criteria: any, patch: any) => {
          updated.push({ criteria, patch });
          return {};
        }),
        updateCenter: jest.fn(),
      };
      const projectRows = (opts.projectRows ?? []).map((row) => ({
        is_active: true,
        is_lead: false,
        ...row,
      }));
      const { service } = makeService({
        _resultRepository: {
          findOne: jest.fn().mockResolvedValue({
            id: 10,
            source: opts.resultSource ?? SourceEnum.Bilateral,
          }),
        },
        _resultsByProjectsRepository: {
          // Honours `where.is_active` exactly as MySQL would, so a wrong implementation that
          // drops the `is_active: true` filter (and would therefore derive from an inactive
          // project) fails a test instead of passing on a mock that ignores the argument.
          find: jest.fn(async ({ where }: any) => {
            if (where?.result_id !== 10) return [];
            if (where?.is_active === undefined) return projectRows;
            return projectRows.filter(
              (row) => row.is_active === where.is_active,
            );
          }),
        },
        _clarisaProjectsRepository: {
          find: jest.fn().mockResolvedValue(opts.projects ?? []),
        },
        _clarisaCenters: {
          find: jest.fn().mockResolvedValue(opts.centers ?? []),
        },
        _resultsCenterRepository: resultsCenterRepository,
      });
      return { service, saved, updated, resultsCenterRepository };
    };

    it('stores a foreign project owner as an active contributing Center', async () => {
      const { service, saved } = arrange({
        projectRows: [{ project_id: 501 }],
        projects: [{ id: 501, organizationCode: 2 }],
        centers: [AFRICARICE, CIP],
        leadingRows: [{ center_id: 'AFRICARICE' }],
      });
      const svc: any = service;

      await service.ensureDerivedContributingCenters(10, 42);

      expect(svc._resultsByProjectsRepository.find).toHaveBeenCalledWith({
        where: { result_id: 10, is_active: true },
      });
      expect(saved).toEqual([
        expect.objectContaining({
          result_id: 10,
          center_id: 'CIP',
          is_primary: false,
          is_leading_result: false,
          from_cgspace: false,
          is_active: true,
          created_by: 42,
        }),
      ]);
      expect(service.logger.error).not.toHaveBeenCalled();
    });

    it('ignores an inactive contributing project — never derives from it', async () => {
      // Same owner (CIP) as the positive case above, but the project row itself is inactive.
      // Only the `is_active`-honouring mock (see `arrange`) can tell a correct implementation
      // (which filters at the query) from a broken one (which would see this row anyway).
      const { service, saved } = arrange({
        projectRows: [{ project_id: 501, is_active: false }],
        projects: [{ id: 501, organizationCode: 2 }],
        centers: [AFRICARICE, CIP],
        leadingRows: [{ center_id: 'AFRICARICE' }],
      });

      await service.ensureDerivedContributingCenters(10, 42);

      expect(saved).toEqual([]);
      expect(service.logger.error).not.toHaveBeenCalled();
    });

    it('adds no row when the contributing project is owned by the reporting Center', async () => {
      const { service, saved, updated } = arrange({
        projectRows: [{ project_id: 501 }],
        projects: [{ id: 501, organizationCode: 1 }],
        centers: [AFRICARICE, CIP],
        leadingRows: [{ center_id: 'AFRICARICE' }],
      });

      await service.ensureDerivedContributingCenters(10, 42);

      expect(saved).toEqual([]);
      expect(updated).toEqual([]);
      expect(service.logger.error).not.toHaveBeenCalled();
    });

    it('never touches the lead row itself (no update, no save, no deactivation, no per-code lookup at all)', async () => {
      const { service, saved, updated, resultsCenterRepository } = arrange({
        projectRows: [{ project_id: 501 }],
        projects: [{ id: 501, organizationCode: 1 }],
        centers: [AFRICARICE],
        leadingRows: [{ center_id: 'AFRICARICE' }],
      });

      await service.ensureDerivedContributingCenters(10, 42);

      expect(saved).toEqual([]);
      expect(updated).toEqual([]);
      expect(resultsCenterRepository.updateCenter).not.toHaveBeenCalled();
      // The only `find` call is the leading-rows query — the lead code is excluded before any
      // per-code lookup, so the lead row is never even read back, let alone written.
      expect(resultsCenterRepository.find).toHaveBeenCalledTimes(1);
      expect(service.logger.error).not.toHaveBeenCalled();
    });

    it('reactivates an inactive derived row instead of leaving it inactive or duplicating it', async () => {
      const { service, saved, updated, resultsCenterRepository } = arrange({
        projectRows: [{ project_id: 501 }],
        projects: [{ id: 501, organizationCode: 2 }],
        centers: [AFRICARICE, CIP],
        leadingRows: [{ center_id: 'AFRICARICE' }],
        existingRowsByCode: { CIP: [{ id: 77, is_active: false }] },
      });

      await service.ensureDerivedContributingCenters(10, 42);

      expect(updated).toEqual([
        {
          criteria: { id: 77 },
          patch: { is_active: true, last_updated_by: 42 },
        },
      ]);
      expect(saved).toEqual([]);
      expect(resultsCenterRepository.updateCenter).not.toHaveBeenCalled();
      expect(service.logger.error).not.toHaveBeenCalled();
    });

    it('reactivates the lowest-id row when several inactive duplicates exist for the same code', async () => {
      const { service, saved, updated } = arrange({
        projectRows: [{ project_id: 501 }],
        projects: [{ id: 501, organizationCode: 2 }],
        centers: [AFRICARICE, CIP],
        leadingRows: [{ center_id: 'AFRICARICE' }],
        existingRowsByCode: {
          CIP: [
            { id: 9, is_active: false },
            { id: 5, is_active: false },
          ],
        },
      });

      await service.ensureDerivedContributingCenters(10, 42);

      expect(updated).toEqual([
        {
          criteria: { id: 5 },
          patch: { is_active: true, last_updated_by: 42 },
        },
      ]);
      expect(saved).toEqual([]);
    });

    it('leaves a legacy duplicate alone when one of its rows is already active — no update, no save', async () => {
      // An inactive row and an active row for the same code, both predating this method. Any
      // active row means "do nothing" — reactivating the inactive one too would leave two
      // active `results_center` rows for the same code (the reviewer's exact concern).
      const { service, saved, updated } = arrange({
        projectRows: [{ project_id: 501 }],
        projects: [{ id: 501, organizationCode: 2 }],
        centers: [AFRICARICE, CIP],
        leadingRows: [{ center_id: 'AFRICARICE' }],
        existingRowsByCode: {
          CIP: [
            { id: 5, is_active: false },
            { id: 9, is_active: true },
          ],
        },
      });

      await service.ensureDerivedContributingCenters(10, 42);

      expect(saved).toEqual([]);
      expect(updated).toEqual([]);
    });

    it('leaves an already-active derived row alone — no duplicate row from a Center sent and derived together', async () => {
      const { service, saved, updated } = arrange({
        projectRows: [{ project_id: 501 }],
        projects: [{ id: 501, organizationCode: 2 }],
        centers: [AFRICARICE, CIP],
        leadingRows: [{ center_id: 'AFRICARICE' }],
        existingRowsByCode: { CIP: [{ id: 77, is_active: true }] },
      });

      await service.ensureDerivedContributingCenters(10, 42);

      expect(saved).toEqual([]);
      expect(updated).toEqual([]);
    });

    it('returns early for a pool funding result — no lookup at all, no row', async () => {
      const { service, saved } = arrange({
        resultSource: SourceEnum.Result,
        projectRows: [{ project_id: 501 }],
        projects: [{ id: 501, organizationCode: 2 }],
        centers: [CIP],
      });
      const svc: any = service;

      await service.ensureDerivedContributingCenters(10, 42);

      // The source guard fires before the projects are even read — matches the test's own name.
      expect(svc._resultsByProjectsRepository.find).not.toHaveBeenCalled();
      expect(saved).toEqual([]);
    });

    it('returns early when the only active project is the lead project (no lookup)', async () => {
      const { service, saved } = arrange({
        projectRows: [{ project_id: 501, is_lead: true }],
        projects: [{ id: 501, organizationCode: 2 }],
        centers: [CIP],
      });
      const svc: any = service;

      await service.ensureDerivedContributingCenters(10, 42);

      expect(svc._clarisaProjectsRepository.find).not.toHaveBeenCalled();
      expect(saved).toEqual([]);
    });

    it('warns with the exact ids-only message when the owner cannot be resolved', async () => {
      const { service, saved } = arrange({
        projectRows: [{ project_id: 999 }],
        projects: [
          { id: 999, organizationCode: null, sourceCenterAcronym: null },
        ],
        centers: [AFRICARICE],
        leadingRows: [{ center_id: 'AFRICARICE' }],
      });

      await service.ensureDerivedContributingCenters(10, 42);

      expect(saved).toEqual([]);
      expect(service.logger.warn).toHaveBeenCalledWith(
        'Unresolved owner Center for project 999 on result 10 — skipping owner derivation',
      );
    });

    it('warns with the exact ids-only message when the project itself is not in CLARISA', async () => {
      const { service, saved } = arrange({
        projectRows: [{ project_id: 501 }],
        projects: [], // clarisa_projects has no row for 501
        centers: [AFRICARICE],
        leadingRows: [{ center_id: 'AFRICARICE' }],
      });

      await service.ensureDerivedContributingCenters(10, 42);

      expect(saved).toEqual([]);
      expect(service.logger.warn).toHaveBeenCalledWith(
        'No CLARISA project found for project 501 on result 10 — skipping owner derivation',
      );
    });

    it('queries clarisa_projects once with In(...), never once per project', async () => {
      const { service } = arrange({
        projectRows: [{ project_id: 501 }, { project_id: 502 }],
        projects: [
          { id: 501, organizationCode: 2 },
          { id: 502, organizationCode: 2 },
        ],
        centers: [AFRICARICE, CIP],
        leadingRows: [{ center_id: 'AFRICARICE' }],
      });
      const svc: any = service;

      await service.ensureDerivedContributingCenters(10, 42);

      expect(svc._clarisaProjectsRepository.find).toHaveBeenCalledTimes(1);
      expect(svc._clarisaProjectsRepository.find).toHaveBeenCalledWith({
        where: { id: In([501, 502]) },
      });
    });

    it('never throws when a repository write fails — the caller keeps going', async () => {
      const { service, resultsCenterRepository } = arrange({
        projectRows: [{ project_id: 501 }],
        projects: [{ id: 501, organizationCode: 2 }],
        centers: [AFRICARICE, CIP],
        leadingRows: [{ center_id: 'AFRICARICE' }],
      });
      resultsCenterRepository.save.mockRejectedValue(new Error('db down'));

      await expect(
        service.ensureDerivedContributingCenters(10, 42),
      ).resolves.toBeUndefined();

      expect(service.logger.error).toHaveBeenCalled();
    });
  });

  describe('create() — call-site ordering (BCT-T-3 / reusable by T5)', () => {
    /**
     * Reusable harness: `create()` has ~20 collaborators, all methods on the same `as any`
     * service instance, so every one of them is stubbed with `jest.spyOn(svc, 'name')`. T5
     * (`announcePendingReview` at the ingest hook) needs the exact same shape to assert its own
     * ordering (post-commit, after the transaction resolves) — reuse `arrangeCreateHarness`
     * from this describe block rather than re-deriving the collaborator list.
     *
     * `dataSource.transaction` runs the closure with a throwaway `{}` manager: `bilateral.service.ts`'s
     * own comment at :300-306 documents that the transaction enlists no repository (BCT-P-5), so a
     * fake manager is faithful to what the real one already does.
     */
    const buildDto = () => ({
      result: {
        data: {
          result_type_id: ResultTypeEnum.OTHER_OUTPUT,
          title: 'Harness result',
          geo_focus: {
            scope_code: 1,
            regions: [],
            countries: [],
            subnational_areas: [],
          },
          lead_center: { acronym: 'AFRICARICE' },
          contributing_center: [],
          contributing_bilateral_projects: [],
          contributing_partners: [],
          evidence: [],
        },
      },
    });

    const arrangeCreateHarness = () => {
      const { service } = makeService();
      const svc: any = service;

      jest.spyOn(svc, 'runResultTypePreflight').mockResolvedValue(undefined);
      jest
        .spyOn(svc, 'validateTocMappingInitiatives')
        .mockResolvedValue(undefined);
      svc._yearRepository = {
        findOne: jest.fn().mockResolvedValue({ year: 2025 }),
      };
      jest
        .spyOn(svc, 'resolveContributingProjects')
        .mockResolvedValue(new Map());

      // `closed` flips only once the transaction closure's promise has actually resolved —
      // distinct from the mock merely having been *called* (invocationCallOrder proves call
      // order, not resolution order). The "post-commit" test below asserts on this flag directly.
      const transactionState = { closed: false };
      svc.dataSource = {
        transaction: jest.fn(async (cb: any) => {
          const result = await cb({});
          transactionState.closed = true;
          return result;
        }),
      };
      svc.__transactionState = transactionState;

      svc._userRepository = { findOne: jest.fn().mockResolvedValue({ id: 1 }) };
      jest.spyOn(svc, 'findOrCreateUser').mockResolvedValue({ id: 42 });
      jest.spyOn(svc, 'resolveSubmitterPayload').mockReturnValue({});
      svc._versioningService = {
        $_findActivePhase: jest.fn().mockResolvedValue({ id: 9 }),
      };
      jest.spyOn(svc, 'ensureUniqueTitle').mockResolvedValue(undefined);
      jest
        .spyOn(svc, 'buildExternalIdentity')
        .mockReturnValue({ external_reference: null });
      jest
        .spyOn(svc, 'initializeResultHeader')
        .mockResolvedValue({ id: 10, result_code: 'RC-1' });
      jest.spyOn(svc, 'handleLeadCenter').mockResolvedValue(undefined);
      jest.spyOn(svc, 'findScope').mockResolvedValue({ id: 5 });
      jest.spyOn(svc, 'validateGeoFocus').mockReturnValue(undefined);
      jest.spyOn(svc, 'handleRegions').mockResolvedValue(undefined);
      jest.spyOn(svc, 'handleCountries').mockResolvedValue(undefined);
      jest.spyOn(svc, 'resolveScopeId').mockReturnValue(5);
      jest.spyOn(svc, 'handleTocMapping').mockResolvedValue(undefined);
      jest.spyOn(svc, 'handleInstitutions').mockResolvedValue(undefined);
      jest.spyOn(svc, 'handleEvidence').mockResolvedValue(undefined);
      jest.spyOn(svc, 'handleNonPooledProject').mockResolvedValue(undefined);
      jest.spyOn(svc, 'runResultTypeHandlers').mockResolvedValue(undefined);
      jest.spyOn(svc, 'handleContributingCenters').mockResolvedValue(undefined);
      jest
        .spyOn(svc, 'ensureDerivedContributingCenters')
        .mockResolvedValue(undefined);
      // Read back after the two writes above: kept truthy (and Bilateral-sourced) so it exercises
      // `filterActiveRelations` the same way a real ingest would.
      svc._resultRepository.findOne = jest
        .fn()
        .mockResolvedValue({ id: 10, source: SourceEnum.Bilateral });
      jest
        .spyOn(svc, 'enrichBilateralResultResponse')
        .mockResolvedValue(undefined);
      // BCT-T-5: the ingest hook now calls the orchestrator, not the submitted emitter directly.
      jest.spyOn(svc, 'announcePendingReview').mockResolvedValue(undefined);

      return { service: svc };
    };

    it('derives after handleNonPooledProject and handleContributingCenters, with (resultId, userId)', async () => {
      const { service } = arrangeCreateHarness();

      await service.create(buildDto());

      const nonPooledOrder = (service.handleNonPooledProject as jest.Mock).mock
        .invocationCallOrder[0];
      const contributingCentersOrder = (
        service.handleContributingCenters as jest.Mock
      ).mock.invocationCallOrder[0];
      const derivedOrder = (
        service.ensureDerivedContributingCenters as jest.Mock
      ).mock.invocationCallOrder[0];

      expect(derivedOrder).toBeGreaterThan(nonPooledOrder);
      expect(derivedOrder).toBeGreaterThan(contributingCentersOrder);
      expect(service.ensureDerivedContributingCenters).toHaveBeenCalledWith(
        10,
        42,
      );
    });

    // BCT-T-5 — the ingest hook. `announcePendingReview` replaces the direct
    // `emitBilateralSubmittedNotification` call and must fire only after the transaction closure
    // (which is where `enrichBilateralResultResponse` — the last thing the closure does — runs)
    // has resolved.
    it('calls announcePendingReview post-commit, after the transaction closure resolves', async () => {
      const { service } = arrangeCreateHarness();
      // Falsifier: the ingest hook must not call the submitted emitter directly any more — only
      // `announcePendingReview` does, and only when it decides to. Spied (not replaced) so this
      // stays a call-tracking assertion; `announcePendingReview` is fully mocked above, so the
      // real method is never reached from `create()` regardless.
      const emitSpy = jest.spyOn(service, 'emitBilateralSubmittedNotification');
      // Directly checks the harness's `closed` flag (flipped only once the transaction's own
      // promise resolves, not merely once the mock was called) at the exact moment
      // `announcePendingReview` runs.
      let closedWhenAnnounced: boolean | undefined;
      (service.announcePendingReview as jest.Mock).mockImplementation(
        async () => {
          closedWhenAnnounced = (service as any).__transactionState.closed;
        },
      );

      await service.create(buildDto());

      const nonPooledOrder = (service.handleNonPooledProject as jest.Mock).mock
        .invocationCallOrder[0];
      const contributingCentersOrder = (
        service.handleContributingCenters as jest.Mock
      ).mock.invocationCallOrder[0];
      const derivedOrder = (
        service.ensureDerivedContributingCenters as jest.Mock
      ).mock.invocationCallOrder[0];
      const enrichOrder = (service.enrichBilateralResultResponse as jest.Mock)
        .mock.invocationCallOrder[0];
      const announceOrder = (service.announcePendingReview as jest.Mock).mock
        .invocationCallOrder[0];

      expect(derivedOrder).toBeGreaterThan(nonPooledOrder);
      expect(derivedOrder).toBeGreaterThan(contributingCentersOrder);
      expect(derivedOrder).toBeLessThan(announceOrder);
      expect(announceOrder).toBeGreaterThan(enrichOrder);
      expect(service.announcePendingReview).toHaveBeenCalledWith(10, 42);
      expect(emitSpy).not.toHaveBeenCalled();
      expect(closedWhenAnnounced).toBe(true);
    });

    /**
     * BCT-T-5 / BCT-R-10 — builds the REAL `ResultTaggedNotificationService` (T4), not a
     * hand-written stand-in for its status guard, so the two tests below can only pass if T4's
     * own guard (`notifyBilateralContributorsOnSubmission`, status !== Pending Review → no-op)
     * actually runs. Its `resultRepo` is a fixture independent from `BilateralService`'s own
     * `_resultRepository`, exactly as the two repositories are independent DI instances in
     * production. `notificationServiceStub` is T4's emitter, separate from
     * `service._notificationService` (`emitBilateralSubmittedNotification`'s emitter) — the two
     * are asserted independently below.
     */
    const arrangeRealTaggingService = (statusId: number) => {
      const notificationServiceStub = {
        emitResultNotification: jest.fn().mockResolvedValue(undefined),
      };
      const resultRepoStub = {
        findOne: jest.fn().mockResolvedValue({
          id: 10,
          status_id: statusId,
          source: SourceEnum.Bilateral,
          obj_result_by_initiatives: [],
        }),
      };
      const notificationRepoStub = { find: jest.fn().mockResolvedValue([]) };
      const roleByUserRepoStub = {
        getUserIdsByCenter: jest.fn().mockResolvedValue([99]),
      };
      const centerRepoStub = { find: jest.fn().mockResolvedValue([]) };
      const projectRepoStub = { find: jest.fn().mockResolvedValue([]) };
      const resultsCenterRepoStub = {
        find: jest.fn().mockResolvedValue([
          {
            center_id: 'CIP',
            is_leading_result: false,
            is_active: true,
            clarisa_center_object: {
              code: 'CIP',
              clarisa_institution: { name: 'CIP Center' },
            },
          },
        ]),
      };
      const resultsByProjectsRepoStub = {
        find: jest.fn().mockResolvedValue([]),
      };

      const realTaggingService = new ResultTaggedNotificationService(
        notificationServiceStub as any,
        notificationRepoStub as any,
        roleByUserRepoStub as any,
        resultRepoStub as any,
        centerRepoStub as any,
        projectRepoStub as any,
        resultsCenterRepoStub as any,
        resultsByProjectsRepoStub as any,
      );

      return { realTaggingService, notificationServiceStub };
    };

    // BCT-T-5 / BCT-R-10 — `keep_editing: true` (design's `resolveInitialStatusId`) births the
    // result Editing, not Pending Review. The status guard that must catch that lives in T4
    // (`ResultTaggedNotificationService.notifyBilateralContributorsOnSubmission`, real instance
    // here — not a copy of its guard) and in the existing `emitBilateralSubmittedNotification`;
    // this proves `create()` still reaches `announcePendingReview` — using the REAL method, not
    // the harness's stub — and that both guards, reading their own (Editing) status fixture,
    // produce no emission.
    // NOTE: `initializeResultHeader` (where `resolveInitialStatusId` actually runs) is stubbed by
    // `arrangeCreateHarness`, so the DTO's `keep_editing: true` below documents the scenario; the
    // real T4 service's own `resultRepo` fixture (Editing) stands in for "what the DB shows after
    // a keep_editing ingest", which is what T4's guard actually reads.
    it('ingest with keep_editing: true reaches the real announcePendingReview, but the REAL T4 guard emits no tagging notification', async () => {
      const { service } = arrangeCreateHarness();
      (service.announcePendingReview as jest.Mock).mockRestore();

      // BilateralService's own repo — read by `emitBilateralSubmittedNotification`'s guard.
      service._resultRepository.findOne = jest.fn().mockResolvedValue({
        id: 10,
        source: SourceEnum.Bilateral,
        status_id: ResultStatusData.Editing.value,
      });
      const { realTaggingService, notificationServiceStub } =
        arrangeRealTaggingService(ResultStatusData.Editing.value);
      service._resultTaggedNotificationService = realTaggingService;

      const dto = buildDto();
      (dto.result.data as any).keep_editing = true;

      await service.create(dto);

      expect(
        notificationServiceStub.emitResultNotification,
      ).not.toHaveBeenCalled();
      // The submitted notification is equally silent — same status read, its own guard.
      expect(
        (service as any)._notificationService.emitResultNotification,
      ).not.toHaveBeenCalled();
    });

    // The positive twin: without `keep_editing`, the result is born Pending Review, so the same
    // REAL T4 service (only its status fixture changes) lets the tagging notification through —
    // proving the previous test's silence is T4's own guard at work, not a fixture that never
    // fires. Also asserts the submitted notification IS emitted at status 5, using the real
    // `emitBilateralSubmittedNotification` fixture (its collaborators already default to sensible
    // values in `makeService`).
    it('ingest without keep_editing reaches Pending Review, so the REAL T4 guard lets tagging (and the submitted notification) through', async () => {
      const { service } = arrangeCreateHarness();
      (service.announcePendingReview as jest.Mock).mockRestore();

      service._resultRepository.findOne = jest.fn().mockResolvedValue({
        id: 10,
        source: SourceEnum.Bilateral,
        status_id: ResultStatusData.PendingReview.value,
      });
      // `emitBilateralSubmittedNotification`'s own collaborators: the harness's default
      // `_resultByInitiativesRepository` stub only has `findOne`/`logicalDelete`, not
      // `getOwnerInitiativeByResult` — without this override the real method throws (caught by
      // its own outer try/catch) before it ever reaches the emitter, same as the dedicated
      // `emitBilateralSubmittedNotification` describe block above arranges it.
      service._resultByInitiativesRepository = {
        getOwnerInitiativeByResult: jest.fn().mockResolvedValue({ id: 6 }),
      };
      service._resultsCenterRepository = {
        getAllResultsCenterByResultId: jest.fn().mockResolvedValue([]),
      };
      const { realTaggingService, notificationServiceStub } =
        arrangeRealTaggingService(ResultStatusData.PendingReview.value);
      service._resultTaggedNotificationService = realTaggingService;

      await service.create(buildDto());

      expect(
        notificationServiceStub.emitResultNotification,
      ).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        [99],
        42,
        10,
        expect.stringContaining('CIP Center'),
      );
      expect(
        (service as any)._notificationService.emitResultNotification,
      ).toHaveBeenCalled();
    });

    it('never fails the ingest when the REAL derivation hits a throwing repository (BCT-NFR-1, end to end)', async () => {
      const { service } = arrangeCreateHarness();
      // Undo the harness's own stub so the real method (with its own try/catch) runs.
      (service.ensureDerivedContributingCenters as jest.Mock).mockRestore();

      service._resultsByProjectsRepository = {
        find: jest
          .fn()
          .mockResolvedValue([
            { project_id: 501, is_lead: false, is_active: true },
          ]),
      };
      service._clarisaProjectsRepository = {
        find: jest.fn().mockResolvedValue([{ id: 501, organizationCode: 2 }]),
      };
      service._clarisaCenters = {
        find: jest.fn().mockResolvedValue([{ code: 'CIP', institutionId: 2 }]),
      };
      service._resultsCenterRepository = {
        find: jest.fn().mockResolvedValue([]),
        save: jest.fn().mockRejectedValue(new Error('db down')),
        update: jest.fn(),
        updateCenter: jest.fn(),
      };

      const result = await service.create(buildDto());

      expect(result.status).toBe(201);
      expect(service.logger.error).toHaveBeenCalledWith(
        'Failed to derive contributing Centers for result 10',
        expect.anything(),
      );
    });
  });
});
