import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BilateralService } from './bilateral.service';
import { ResultTypeEnum } from '../../shared/constants/result-type.enum';

describe('BilateralService (unit)', () => {
  const makeService = (overrides: Partial<any> = {}) => {
    const dataSource = {} as any;
    const resultRepository = {
      findOne: jest.fn(),
      save: jest.fn(async (x) => x),
    };
    const resultsService = {} as any;
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
    const resultsTocResultsRepository = { logicalDelete: jest.fn() };
    const clarisaInitiatives = { findOne: jest.fn() };
    const resultsTocResultsIndicatorsRepository = { logicalDelete: jest.fn() };
    const resultsTocTargetIndicatorRepository = { logicalDelete: jest.fn() };
    const resultsCenterRepository = {} as any;
    const clarisaProjectsRepository = { findOne: jest.fn() };
    const resultsByProjectsRepository = { save: jest.fn() };
    const resultByInitiativesRepository = { logicalDelete: jest.fn() };

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

    const service = new BilateralService(
      dataSource,
      resultRepository as any,
      resultsService,
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
      knowledgeProductHandler as any,
      capacityChangeHandler as any,
      innovationDevelopmentHandler as any,
      innovationUseHandler as any,
      policyChangeHandler as any,
      otherOutputHandler as any,
      otherOutcomeHandler as any,
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
    expect(cap).toEqual(
      expect.objectContaining({ results_capacity_development_object: true }),
    );
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
});
