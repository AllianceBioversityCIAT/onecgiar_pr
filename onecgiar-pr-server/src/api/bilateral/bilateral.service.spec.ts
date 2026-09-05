import {
  BadRequestException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { BilateralService } from './bilateral.service';
import { ResultTypeEnum } from '../../shared/constants/result-type.enum';

describe('BilateralService (unit)', () => {
  const makeService = (overrides: Partial<any> = {}) => {
    const dataSource = {} as any;
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
    const resultByInstitutionsRepository = {} as any;
    const resultInstitutionsBudgetRepository = {
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
    const clarisaProjectsRepository = { findOne: jest.fn() };
    const resultsByProjectsRepository = { save: jest.fn() };
    const resultByInitiativesRepository = {
      logicalDelete: jest.fn().mockResolvedValue(undefined),
    };
    const shareResultRequestRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockResolvedValue({}),
      logicalDelete: jest.fn().mockResolvedValue(undefined),
    } as any;
    const nonPooledProjectBudgetRepository = { save: jest.fn() };
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
        resultsKnowledgeProductsService,
        adUserService,
        roleByUserRepository,
        notificationService,
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
  // `create()` itself is a ~20-collaborator transaction and is covered end-to-end elsewhere.
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
});
