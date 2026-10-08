import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { In, Not } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BilateralService } from './bilateral.service';
import {
  BilateralResubmissionService,
  describeResultStatus,
} from './services/bilateral-resubmission.service';
import { PolicyChangeBilateralHandler } from './handlers/policy-change.handler';
import { CapacityChangeBilateralHandler } from './handlers/capacity-change.handler';
import { InnovationDevelopmentBilateralHandler } from './handlers/innovation-development.handler';
import { InnovationUseBilateralHandler } from './handlers/innovation-use.handler';
import { ResultTypeEnum } from '../../shared/constants/result-type.enum';
import { ResultCreationMethod } from '../../shared/constants/result-creation-method.enum';
import { SourceEnum } from '../results/entities/result.entity';
import { ResultStatusData } from '../../shared/constants/result-status.enum';
import { ResultTaggedNotificationService } from '../notification/services/result-tagged-notification.service';
import { TocMappingDto } from './dto/create-bilateral.dto';
import { createClosedWorld } from '../../shared/test/closed-world.test-helper';
import {
  createInMemoryDb,
  EntityClass,
  Row,
} from '../../shared/test/in-memory-db.test-helper';
import { Evidence } from '../results/evidences/entities/evidence.entity';
import { ResultsByProjects } from '../results/results_by_projects/entities/results_by_projects.entity';
import { NonPooledProjectBudget } from '../results/result_budget/entities/non_pooled_proyect_budget.entity';
import { ResultsByInstitution } from '../results/results_by_institutions/entities/results_by_institution.entity';
import { ResultCountry } from '../results/result-countries/entities/result-country.entity';
import { ResultCountrySubnational } from '../results/result-countries-sub-national/entities/result-country-subnational.entity';
import { ResultCountrySubnationalRepository } from '../results/result-countries-sub-national/repositories/result-country-subnational.repository';
import { ResultActor } from '../results/result-actors/entities/result-actor.entity';
import { InnovationUseService } from '../results-framework-reporting/innovation-use/innovation-use.service';
import { PrimaryProgramRequestService } from '../results/share-result-request/services/primary-program-request.service';
import { ShareResultRequest } from '../results/share-result-request/entities/share-result-request.entity';
import { ResultsByInititiative } from '../results/results_by_inititiatives/entities/results_by_inititiative.entity';
import { ResultInitiativeBudget } from '../results/result_budget/entities/result_initiative_budget.entity';
import { ResultsTocResult } from '../results/results-toc-results/entities/results-toc-result.entity';
import { ResultReviewHistory } from '../results/result-review-history/entities/result-review-history.entity';
import { Result } from '../results/entities/result.entity';

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
    // @akili-spec changes/bilateral-create-upsert-by-code — UBC-T-1: the shared resolve-step
    // collaborator. `findInPhase` resolving `undefined` is the default "no code / not found in
    // the open phase" case: `resolveResultCodeTarget` short-circuits before ever reaching this
    // (no `result_code` on the fixture DTOs above), so these are only exercised by the
    // resolve-step describe block below, which overrides what it needs per case.
    const bilateralVersioningRulesService = {
      getActiveReportingPhase: jest.fn().mockResolvedValue({ id: 36 }),
      findInPhase: jest.fn().mockResolvedValue(undefined),
      resolveVersionableResult: jest.fn(),
      assertCallerMayVersion: jest.fn().mockResolvedValue(undefined),
      assertNotKnowledgeProduct: jest.fn(),
      assertIsBilateral: jest.fn(),
    };
    // @akili-spec bilateral/resubmit-rejected-result — RSB-T-2: the resubmission skeleton the
    // `updated` branch delegates to. Its own lock/status behaviour is covered in
    // `services/bilateral-resubmission.service.spec.ts`.
    const bilateralResubmissionService = {
      resubmit: jest.fn(),
    };
    const notificationService = {
      emitResultNotification: jest.fn().mockResolvedValue(undefined),
    };
    // `PSR-T-5`: `populateInitiativeAndTocFromProgramCode` requests a primary Science Program
    // instead of writing role 1 directly.
    const primaryProgramRequestService = {
      request: jest
        .fn()
        .mockResolvedValue({ ok: true, shareResultRequestId: 1 }),
      // `RRC-T-6`: the API resubmission assigns a changed primary directly.
      transferPrimary: jest.fn().mockResolvedValue({
        outcome: 'transferred',
        previousInitiativeId: null,
      }),
      stateFor: jest.fn().mockResolvedValue({
        state: 'none',
        program_code: null,
        declined_by_codes: [],
      }),
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
      primaryProgramRequestService as any,
      bilateralVersioningRulesService as any,
      bilateralResubmissionService as any,
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
        bilateralVersioningRulesService,
        notificationService,
        primaryProgramRequestService,
        resultTaggedNotificationService,
      },
      handlers: {
        knowledgeProductHandler,
      },
    };
  };

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
    jest.spyOn(svc, 'resolveContributingProjects').mockResolvedValue(new Map());

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
      // @akili-spec changes/bilateral-create-upsert-by-code — UBC-T-2 reviewer advisory: a real
      // stub (not absent) so a version target that wrongly called `versionProcessV2` (the
      // rejected `DD-2` alternative) would fail a deliberate `not.toHaveBeenCalled()` assertion
      // instead of a bare `TypeError`.
      versionProcessV2: jest.fn(),
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

  describe('handleTocMapping — target_contribution on the push (BTC-T-2)', () => {
    const baseToc = () => ({
      science_program_id: 'CLIMATE',
      aow_compose_code: 'CLIMATE-AGROECOLOGICAL',
      result_title: 'Climate-resilient crop systems adopted',
      result_indicator_description:
        'Number of climate resilient practices documented',
      result_indicator_type_name: 'Output',
    });

    /** Arranges a full ToC match (title + indicator + an active target row). */
    const arrangeFullMatch = (stubs: any, numberTarget: number | null = 50) => {
      stubs.clarisaInitiatives.findOne.mockResolvedValue({
        id: 5,
        official_code: 'CLIMATE',
        active: true,
        name: 'Climate',
      });
      stubs.resultByInitiativesRepository.findOne.mockResolvedValue({
        id: 777,
      });
      stubs.resultByInitiativesRepository.update = jest
        .fn()
        .mockResolvedValue(undefined);
      stubs.resultsTocResultsRepository.findTocResultsForBilateral = jest
        .fn()
        .mockResolvedValue([
          {
            toc_result_id: 99,
            toc_results_indicator_id: 77,
            category: null,
            // Disqualifier guard (BTC-T-2): number_target MUST be present here, otherwise the
            // save-not-reached path would pass this test for the wrong reason.
            number_target: numberTarget,
            target_date: 2026,
          },
        ]);
      stubs.resultsTocResultsRepository.findOne = jest
        .fn()
        .mockResolvedValue(null);
      stubs.resultsTocResultsRepository.save = jest
        .fn()
        .mockResolvedValue({ result_toc_result_id: 555 });
      stubs.resultsTocResultsIndicatorsRepository.findOne = jest
        .fn()
        .mockResolvedValue(null);
      stubs.resultsTocResultsIndicatorsRepository.save = jest
        .fn()
        .mockResolvedValue({ result_toc_result_indicator_id: 888 });
      stubs.resultsTocTargetIndicatorRepository.findOne = jest
        .fn()
        .mockResolvedValue(null);
      stubs.resultsTocTargetIndicatorRepository.save = jest
        .fn()
        .mockResolvedValue({});
    };

    it('stores the sent target_contribution on the target row (full match)', async () => {
      const { service, stubs: stubsTyped } = makeService();
      const stubs: any = stubsTyped;
      arrangeFullMatch(stubs);

      await service.handleTocMapping(
        { ...baseToc(), target_contribution: 12.5 },
        [],
        1,
        42,
      );

      // Assert the save happened before asserting its argument (disqualifier guard).
      expect(
        stubs.resultsTocTargetIndicatorRepository.save,
      ).toHaveBeenCalledTimes(1);
      expect(
        stubs.resultsTocTargetIndicatorRepository.save,
      ).toHaveBeenCalledWith(
        expect.objectContaining({ contributing_indicator: 12.5 }),
      );
    });

    it('searches the ToC by the program official code, not the PRMS initiative id', async () => {
      const { service, stubs: stubsTyped } = makeService();
      const stubs: any = stubsTyped;
      arrangeFullMatch(stubs);

      await service.handleTocMapping(baseToc(), [], 1, 42);

      // toc_work_packages.initiativeId holds 'CLIMATE', never 5 — an id here never matches.
      expect(
        stubs.resultsTocResultsRepository.findTocResultsForBilateral,
      ).toHaveBeenCalledWith(
        expect.objectContaining({ initiative_id: 'CLIMATE' }),
      );
    });

    it('keeps the constant 1 when target_contribution is not sent (full match, backward compatibility)', async () => {
      const { service, stubs: stubsTyped } = makeService();
      const stubs: any = stubsTyped;
      arrangeFullMatch(stubs);

      await service.handleTocMapping(baseToc(), [], 1, 42);

      expect(
        stubs.resultsTocTargetIndicatorRepository.save,
      ).toHaveBeenCalledTimes(1);
      expect(
        stubs.resultsTocTargetIndicatorRepository.save,
      ).toHaveBeenCalledWith(
        expect.objectContaining({ contributing_indicator: 1 }),
      );
    });

    it('does not write a target row and logs a warning when the field is sent but the match is initiative-only', async () => {
      const { service, stubs: stubsTyped } = makeService();
      const stubs: any = stubsTyped;
      stubs.clarisaInitiatives.findOne.mockResolvedValue({
        id: 5,
        official_code: 'CLIMATE',
        active: true,
        name: 'Climate',
      });
      stubs.resultByInitiativesRepository.findOne.mockResolvedValue({
        id: 777,
      });
      stubs.resultByInitiativesRepository.update = jest
        .fn()
        .mockResolvedValue(undefined);
      stubs.resultsTocResultsRepository.findOne = jest
        .fn()
        .mockResolvedValue(null);
      stubs.resultsTocResultsRepository.save = jest
        .fn()
        .mockResolvedValue({ result_toc_result_id: 555 });
      stubs.resultsTocTargetIndicatorRepository.save = jest.fn();

      // No result_title → attemptTocSearch is false → initiative-only mapping, no indicator.
      await service.handleTocMapping(
        { science_program_id: 'CLIMATE', target_contribution: 12.5 },
        [],
        1,
        42,
      );

      expect(
        stubs.resultsTocTargetIndicatorRepository.save,
      ).not.toHaveBeenCalled();
      expect(service.logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('result 42'),
      );
      // The warning names the result and the reason only — never the payload value.
      const warnCalls = (service.logger.warn as jest.Mock).mock.calls.map(
        (call) => call[0],
      );
      expect(
        warnCalls.some((message: string) => message.includes('12.5')),
      ).toBe(false);
    });

    // `PSR-T-5` tasks.md Falsifier: "the ingest `create` no longer writes role 1 → FAIL" /
    // design.md P-3 "the API ingest writes role 1 via `processToc` → `upsertResultInitiative`" —
    // the reversion challenge's premise this task leaves untouched. `handleTocMapping` pushes the
    // `toc` mapping with `roleId: 1` (bilateral.service.ts:1449) and calls `upsertResultInitiative`
    // directly; it must still write role 1 and must never go through `PrimaryProgramRequestService
    // .request()`.
    it('PSR-T-5: still writes role 1 directly and never calls request()', async () => {
      const { service, stubs: stubsTyped } = makeService();
      const stubs: any = stubsTyped;
      arrangeFullMatch(stubs);

      await service.handleTocMapping(baseToc(), [], 1, 42);

      expect(stubs.resultByInitiativesRepository.update).toHaveBeenCalledWith(
        { id: 777 },
        expect.objectContaining({ initiative_role_id: 1, is_active: true }),
      );
      expect(stubs.primaryProgramRequestService.request).not.toHaveBeenCalled();
    });
  });

  describe('TocMappingDto.target_contribution validation (BTC-T-2 scenario: invalid value)', () => {
    const validateTargetContribution = async (target_contribution: unknown) => {
      const dto = plainToInstance(TocMappingDto, {
        science_program_id: 'CLIMATE',
        target_contribution,
      });
      const errors = await validate(dto);
      return errors.find((error) => error.property === 'target_contribution');
    };

    it.each([-1, 1.234, '12'])(
      'rejects %p (negative, >2 decimals, or non-numeric)',
      async (value) => {
        expect(await validateTargetContribution(value)).toBeDefined();
      },
    );

    it.each([12.5, 12])(
      'accepts %p (up to 2 decimals, non-negative)',
      async (value) => {
        expect(await validateTargetContribution(value)).toBeUndefined();
      },
    );

    it('accepts an omitted target_contribution (optional)', async () => {
      expect(await validateTargetContribution(undefined)).toBeUndefined();
    });
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

    // @akili-spec bilateral/resubmit-followups — RSF-R-5 "BUT the no-code create must NOT change":
    // the lookup lifted into `findLeadCenter` is shared with the resubmission preflight, but
    // `handleLeadCenter` itself still only warns on an unknown centre and never throws or stores.
    it('RSF-R-5: the no-code path with an unknown lead_center still logs a warn and writes nothing', async () => {
      const { service, saved } = makeCenterService();
      const warn = jest
        .spyOn((service as any).logger, 'warn')
        .mockImplementation(() => undefined);

      await expect(
        service.handleLeadCenter(1, { acronym: 'NOWHERE' }, 9),
      ).resolves.toBeUndefined();

      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('No institutions matched lead_center input'),
      );
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

    // @akili-spec bilateral/resubmit-rejected-result — RSB-T-5 / RSB-R-1 (falsifier (i)): a create
    // WITHOUT result_code makes the identical call sequence it made before the resubmission existed,
    // with the identical arguments (none of the replace-safe options leaks into it), and returns the
    // identical response. The literals below were captured from the create path BEFORE this task's
    // changes (the create path itself is untouched: only the `updated` branch is new).
    it('RSB-R-1: a no-code create keeps its exact call sequence, its arguments and its response', async () => {
      const { service } = arrangeCreateHarness();
      const traced = [
        'runResultTypePreflight',
        'validateTocMappingInitiatives',
        'resolveContributingProjects',
        'findOrCreateUser',
        'ensureUniqueTitle',
        'initializeResultHeader',
        'handleLeadCenter',
        'findScope',
        'validateGeoFocus',
        'handleRegions',
        'handleCountries',
        'resolveScopeId',
        'handleTocMapping',
        'handleInstitutions',
        'handleEvidence',
        'handleNonPooledProject',
        'runResultTypeHandlers',
        'handleContributingCenters',
        'ensureDerivedContributingCenters',
        'enrichBilateralResultResponse',
        'announcePendingReview',
      ];
      // Set BEFORE tracing: `mockResolvedValue` would replace the tracing wrapper.
      (service.initializeResultHeader as jest.Mock).mockResolvedValue({
        id: 10,
        result_code: 'RC-1',
        status_id: ResultStatusData.PendingReview.value,
      });
      const called: Array<[number, string]> = [];
      for (const name of traced) {
        const mock = service[name] as jest.Mock;
        const previous = mock.getMockImplementation();
        mock.mockImplementation((...args: any[]) => {
          called.push([called.length, name]);
          return previous?.(...args);
        });
      }
      const resubmit = service._bilateralResubmissionService.resubmit;

      const result = await service.create(buildDto());

      // The sequence, in order (a name can appear twice: findOrCreateUser runs for created_by and for
      // the submitter).
      expect(called.map(([, name]) => name)).toEqual([
        'runResultTypePreflight',
        'validateTocMappingInitiatives',
        'resolveContributingProjects',
        'findOrCreateUser',
        'findOrCreateUser',
        'ensureUniqueTitle',
        'initializeResultHeader',
        'handleLeadCenter',
        'findScope',
        'validateGeoFocus',
        'handleRegions',
        'handleCountries',
        'resolveScopeId',
        'handleTocMapping',
        'handleInstitutions',
        'handleEvidence',
        'handleNonPooledProject',
        'runResultTypeHandlers',
        'handleContributingCenters',
        'ensureDerivedContributingCenters',
        'enrichBilateralResultResponse',
        'announcePendingReview',
      ]);
      // The arguments: none of the resubmission options reaches the create path.
      expect(service.handleLeadCenter.mock.calls[0]).toHaveLength(3);
      expect(service.handleCountries.mock.calls[0]).toHaveLength(5);
      expect(service.handleTocMapping.mock.calls[0]).toHaveLength(5);
      expect(service.handleInstitutions.mock.calls[0]).toHaveLength(4);
      // The resubmission machinery is never consulted.
      expect(resubmit).not.toHaveBeenCalled();
      // The response.
      expect(result.status).toBe(201);
      expect(result.message).toBe('Results Bilateral created successfully.');
      expect(result.response.outcomes).toEqual([
        {
          result_code: 'RC-1',
          operation: 'created',
          status_id: ResultStatusData.PendingReview.value,
          status: ResultStatusData.PendingReview.name,
          external_reference: null,
        },
      ]);
      expect(service.announcePendingReview).toHaveBeenCalledTimes(1);
      expect(service.announcePendingReview).toHaveBeenCalledWith(10, 42);
    });

    // @akili-spec changes/bilateral-create-upsert-by-code — UBC-T-1/DD-5/R-10: additive
    // per-result outcomes, `operation: 'created'` for the unchanged (no-code) path.
    it('stamps response.outcomes with operation "created" for a codeless create', async () => {
      const { service } = arrangeCreateHarness();
      (service.initializeResultHeader as jest.Mock).mockResolvedValue({
        id: 10,
        result_code: 'RC-1',
        status_id: ResultStatusData.PendingReview.value,
      });

      const result = await service.create(buildDto());

      expect(result.response.outcomes).toEqual([
        {
          result_code: 'RC-1',
          operation: 'created',
          status_id: ResultStatusData.PendingReview.value,
          status: ResultStatusData.PendingReview.name,
          external_reference: null,
        },
      ]);
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

  // `PSR-T-5` — `promoteDraft`'s only caller (P-3, reversion challenge). design.md DD-2/DD-3: the
  // chosen primary SP is sent a pending request instead of being written as the owner outright,
  // and the ToC stub seed moves to accept.
  describe('populateInitiativeAndTocFromProgramCode (direct primary assignment)', () => {
    // Product decision 2026-10-07: the chosen SP owns the result at once — no acceptance round.
    const withTransaction = (service: any) => {
      const manager = { findOne: jest.fn().mockResolvedValue({ id: 10 }) };
      service.dataSource = {
        ...service.dataSource,
        transaction: jest.fn(async (work: any) => work(manager)),
      };
      return manager;
    };

    it('assigns the resolved initiative as primary directly (role 1 + ToC stub via transferPrimary), inside a locked transaction', async () => {
      const { service, stubs } = makeService();
      stubs.clarisaInitiatives.findOne.mockResolvedValue({
        id: 404,
        official_code: 'SP09',
      });
      const manager = withTransaction(service);

      await service.populateInitiativeAndTocFromProgramCode(10, 'sp09', 42);

      expect(manager.findOne).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          where: { id: 10 },
          lock: { mode: 'pessimistic_write' },
        }),
      );
      expect(
        stubs.primaryProgramRequestService.transferPrimary,
      ).toHaveBeenCalledWith(
        10,
        404,
        expect.objectContaining({ id: 42 }),
        manager,
        { releaseContributors: false },
      );
      expect(stubs.primaryProgramRequestService.request).not.toHaveBeenCalled();
    });

    it('does nothing when no program_code is provided', async () => {
      const { service, stubs } = makeService();

      await service.populateInitiativeAndTocFromProgramCode(10, null, 42);

      expect(stubs.clarisaInitiatives.findOne).not.toHaveBeenCalled();
      expect(stubs.primaryProgramRequestService.request).not.toHaveBeenCalled();
    });

    it('logs and swallows when no CLARISA initiative matches the code', async () => {
      const { service, stubs } = makeService();
      stubs.clarisaInitiatives.findOne.mockResolvedValue(null);

      await service.populateInitiativeAndTocFromProgramCode(10, 'UNKNOWN', 42);

      expect(stubs.primaryProgramRequestService.request).not.toHaveBeenCalled();
      expect(service.logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('no initiative found'),
      );
    });

    // requirements.md PSR-R-1 "request step fails": promoteDraft must still succeed (this method
    // never throws); the caller (`promoteDraft`) is unaffected and only a warning is logged.
    it('logs and swallows when the primary assignment fails', async () => {
      const { service, stubs } = makeService();
      stubs.clarisaInitiatives.findOne.mockResolvedValue({
        id: 404,
        official_code: 'SP09',
      });
      withTransaction(service);
      stubs.primaryProgramRequestService.transferPrimary.mockRejectedValueOnce(
        new Error('boom'),
      );

      await expect(
        service.populateInitiativeAndTocFromProgramCode(10, 'SP09', 42),
      ).resolves.toBeUndefined();

      expect(service.logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('primary assignment failed'),
      );
    });
  });

  // @akili-spec changes/bilateral-create-upsert-by-code — UBC-T-1. `create()`'s resolve step:
  // a `result_code` that cannot be carried forward rejects with a 4xx BEFORE any write, and an
  // eligible target is rejected too (T-2/T-3 wire the real writes; this task only resolves and
  // rejects). Every falsifier case below runs the FULL create() harness (arrangeCreateHarness) —
  // not a bare service — so "nothing was written" is a real claim: if the resolve step were
  // missing, wrong, or too late, this exact harness would happily complete the create and call
  // findOrCreateUser / _resultRepository.save for real (tasks.md UBC-T-1 Disqualifier: "a case
  // that mocks the resolve step itself proves nothing").
  describe('create() — resolving result_code before any write (UBC-T-1)', () => {
    const STAR = { id: 12, acronym: 'STAR' };

    const buildDtoWithCode = (resultCode: string) => {
      const dto = buildDto();
      (dto.result.data as any).result_code = resultCode;
      return dto;
    };

    it('a no-code create is unchanged (R-1): the resolve step is never consulted', async () => {
      const { service } = arrangeCreateHarness();

      const result = await service.create(buildDto());

      expect(result.status).toBe(201);
      expect(
        service._bilateralVersioningRulesService.getActiveReportingPhase,
      ).not.toHaveBeenCalled();
    });

    it('rejects a code that does not exist anywhere (404) and writes nothing', async () => {
      const { service } = arrangeCreateHarness();
      service._bilateralVersioningRulesService.findInPhase.mockResolvedValue(
        undefined,
      );
      service._bilateralVersioningRulesService.resolveVersionableResult.mockRejectedValue(
        new NotFoundException('No active result found for result_code 99999.'),
      );

      await expect(
        service.create(buildDtoWithCode('99999'), STAR as any),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(service._resultRepository.save).not.toHaveBeenCalled();
      expect(service.findOrCreateUser).not.toHaveBeenCalled();
    });

    it('rejects a code owned by another platform (403) and writes nothing', async () => {
      const { service } = arrangeCreateHarness();
      const foreignSource = {
        id: 900,
        result_code: '28111',
        status_id: ResultStatusData.Approved.value,
      };
      service._bilateralVersioningRulesService.findInPhase.mockResolvedValue(
        undefined,
      );
      service._bilateralVersioningRulesService.resolveVersionableResult.mockResolvedValue(
        foreignSource,
      );
      service._bilateralVersioningRulesService.assertCallerMayVersion.mockRejectedValue(
        new ForbiddenException(
          'Result 28111 was reported by a different platform.',
        ),
      );

      await expect(
        service.create(buildDtoWithCode('28111'), STAR as any),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(service._resultRepository.save).not.toHaveBeenCalled();
      expect(service.findOrCreateUser).not.toHaveBeenCalled();
    });

    it('rejects a Knowledge Product code (409) and writes nothing', async () => {
      const { service } = arrangeCreateHarness();
      service._bilateralVersioningRulesService.findInPhase.mockResolvedValue(
        undefined,
      );
      service._bilateralVersioningRulesService.resolveVersionableResult.mockRejectedValue(
        new ConflictException('Result 28222 is a Knowledge Product.'),
      );

      await expect(
        service.create(buildDtoWithCode('28222'), STAR as any),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(service._resultRepository.save).not.toHaveBeenCalled();
      expect(service.findOrCreateUser).not.toHaveBeenCalled();
    });

    it('rejects an open-phase code that is not in an editable status (409) and writes nothing', async () => {
      const { service } = arrangeCreateHarness();
      const approvedOpenPhaseRow = {
        id: 500,
        result_code: '28565',
        status_id: ResultStatusData.Approved.value,
      };
      service._bilateralVersioningRulesService.findInPhase.mockResolvedValue(
        approvedOpenPhaseRow,
      );

      await expect(
        service.create(buildDtoWithCode('28565'), STAR as any),
      ).rejects.toBeInstanceOf(ConflictException);

      // Ownership and the KP guard both ran, in order, before the status guard rejected.
      expect(
        service._bilateralVersioningRulesService.assertCallerMayVersion,
      ).toHaveBeenCalledWith(approvedOpenPhaseRow, '28565', STAR);
      expect(
        service._bilateralVersioningRulesService.assertNotKnowledgeProduct,
      ).toHaveBeenCalledWith(approvedOpenPhaseRow, '28565');
      expect(service._resultRepository.save).not.toHaveBeenCalled();
      expect(service.findOrCreateUser).not.toHaveBeenCalled();
    });

    // @akili-spec bilateral/resubmit-rejected-result — RSB-T-2 / RSB-R-2. Replaces the UBC-T-3
    // placeholder test (a 409 for any editable status): only Rejected (7) reaches
    // `resubmit()`; every other status is a 409 naming the code and the status. Expected status
    // names come from the requirements scenario ("pending review").
    describe('open-phase status table (RSB-R-2)', () => {
      const nonRejected: Array<[number, string]> = [
        [1, 'editing'],
        [2, 'quality assessed'],
        [3, 'submitted'],
        [4, 'discontinued'],
        [5, 'pending review'],
        [6, 'approved'],
        [8, 'draft'],
      ];

      it.each(nonRejected)(
        'status %s (%s) -> 409 naming the code and the status; resubmit never called',
        async (statusId, statusName) => {
          const { service } = arrangeCreateHarness();
          service._bilateralVersioningRulesService.findInPhase.mockResolvedValue(
            {
              id: 501,
              result_code: 28565,
              status_id: statusId,
              result_type_id: ResultTypeEnum.OTHER_OUTPUT,
            },
          );

          const attempt = service.create(
            buildDtoWithCode('28565'),
            STAR as any,
          );
          await expect(attempt).rejects.toMatchObject({ status: 409 });
          await expect(attempt).rejects.toThrow('28565');
          await expect(attempt).rejects.toThrow(statusName);

          expect(
            service._bilateralResubmissionService.resubmit,
          ).not.toHaveBeenCalled();
          expect(service._resultRepository.save).not.toHaveBeenCalled();
          expect(service.findOrCreateUser).not.toHaveBeenCalled();
          expect(
            service._bilateralVersioningRulesService.resolveVersionableResult,
          ).not.toHaveBeenCalled();
        },
      );

      it('status 7 (rejected) reaches resubmit() with target, payload and platform, and skips the normal create sequence', async () => {
        const { service } = arrangeCreateHarness();
        const rejectedRow = {
          id: 501,
          result_code: 28565,
          status_id: ResultStatusData.Rejected.value,
          result_type_id: ResultTypeEnum.OTHER_OUTPUT,
        };
        service._bilateralVersioningRulesService.findInPhase.mockResolvedValue(
          rejectedRow,
        );
        service._bilateralResubmissionService.resubmit.mockResolvedValue({
          id: 501,
          result_code: 28565,
          status_id: ResultStatusData.PendingReview.value,
          status: ResultStatusData.PendingReview.name,
        });
        const dto = buildDtoWithCode('28565');

        const result = await service.create(dto, STAR as any);

        expect(
          service._bilateralResubmissionService.resubmit,
        ).toHaveBeenCalledTimes(1);
        expect(
          service._bilateralResubmissionService.resubmit,
        ).toHaveBeenCalledWith({
          target: rejectedRow,
          bilateralDto: dto.result.data,
          platform: STAR,
          // RSB-T-3: the read-only preflight checks, built from this service own helpers.
          preflight: expect.objectContaining({
            validateTypeSpecificPayload: expect.any(Function),
            ensureUniqueTitle: expect.any(Function),
          }),
          // RSB-T-5: the writers of the pipeline, built from this service own helpers.
          writers: expect.objectContaining({
            countResolvablePartners: expect.any(Function),
            readOwnerInitiativeId: expect.any(Function),
            writeResult: expect.any(Function),
            // RRC-T-6: the direct transfer replaced the ownership request on this port.
            transferPrimary: expect.any(Function),
            announcePendingReview: expect.any(Function),
          }),
        });
        expect(service._resultRepository.save).not.toHaveBeenCalled();
        expect(service.findOrCreateUser).not.toHaveBeenCalled();
        expect(result.response.outcomes).toEqual([
          expect.objectContaining({
            operation: 'updated',
            result_code: 28565,
            status_id: ResultStatusData.PendingReview.value,
          }),
        ]);
      });

      // RSB-R-17 (T-5 attempt 2): the resubmission is already COMMITTED when the response body is
      // built. A failure there must not turn it into an error: the outcome is still returned.
      it.each([
        [
          'the read-back findOne',
          (svc: any) =>
            (svc._resultRepository.findOne = jest
              .fn()
              .mockRejectedValue(new Error('db read failed'))),
        ],
        [
          'enrichBilateralResultResponse',
          (svc: any) =>
            (svc.enrichBilateralResultResponse = jest
              .fn()
              .mockRejectedValue(new Error('enrich failed'))),
        ],
      ])(
        'RSB-R-17: %s throws after the commit -> the `updated` outcome is STILL returned, the error is logged without the payload',
        async (_label, breakIt) => {
          const { service } = arrangeCreateHarness();
          service._bilateralVersioningRulesService.findInPhase.mockResolvedValue(
            {
              id: 501,
              result_code: 28565,
              status_id: ResultStatusData.Rejected.value,
              result_type_id: ResultTypeEnum.OTHER_OUTPUT,
            },
          );
          service._bilateralResubmissionService.resubmit.mockResolvedValue({
            id: 501,
            result_code: 28565,
            status_id: ResultStatusData.PendingReview.value,
            status: 'pending review',
          });
          // The harness stubs the enrichment; the throwing variants replace what they name.
          service._resultRepository.findOne = jest
            .fn()
            .mockResolvedValue({ id: 501, source: SourceEnum.Bilateral });
          breakIt(service);
          const dto = buildDtoWithCode('28565');
          (dto.result.data as any).description = 'a private description';

          const result = await service.create(dto, STAR as any);

          expect(result.status).toBe(201);
          expect(result.response.outcomes).toEqual([
            {
              result_code: 28565,
              operation: 'updated',
              status_id: ResultStatusData.PendingReview.value,
              status: 'pending review',
              external_reference: null,
            },
          ]);
          const logged = (service.logger.error as jest.Mock).mock.calls
            .map((call) => call.map(String).join(' '))
            .join('\n');
          expect(logged).toContain('was committed');
          expect(logged).not.toContain('a private description');
        },
      );

      it('another platform -> 403 (RSB-R-6); resubmit never called', async () => {
        const { service } = arrangeCreateHarness();
        service._bilateralVersioningRulesService.findInPhase.mockResolvedValue({
          id: 501,
          result_code: 28565,
          status_id: ResultStatusData.Rejected.value,
        });
        service._bilateralVersioningRulesService.assertCallerMayVersion.mockRejectedValue(
          new ForbiddenException(
            'Result 28565 was reported by a different platform.',
          ),
        );

        await expect(
          service.create(buildDtoWithCode('28565'), STAR as any),
        ).rejects.toBeInstanceOf(ForbiddenException);
        expect(
          service._bilateralResubmissionService.resubmit,
        ).not.toHaveBeenCalled();
      });

      it('a Knowledge Product target -> 409 (RSB-R-7); resubmit never called', async () => {
        const { service } = arrangeCreateHarness();
        service._bilateralVersioningRulesService.findInPhase.mockResolvedValue({
          id: 501,
          result_code: 28565,
          status_id: ResultStatusData.Rejected.value,
          result_type_id: ResultTypeEnum.KNOWLEDGE_PRODUCT,
        });
        service._bilateralVersioningRulesService.assertNotKnowledgeProduct.mockImplementation(
          () => {
            throw new ConflictException('Result 28565 is a Knowledge Product.');
          },
        );

        await expect(
          service.create(buildDtoWithCode('28565'), STAR as any),
        ).rejects.toMatchObject({ status: 409 });
        expect(
          service._bilateralResubmissionService.resubmit,
        ).not.toHaveBeenCalled();
      });

      it('a payload of a different type than the stored one -> 409 naming code and both types (RSB-R-22); nothing written', async () => {
        const { service } = arrangeCreateHarness();
        // The harness payload is OTHER_OUTPUT; the stored row is a policy change.
        service._bilateralVersioningRulesService.findInPhase.mockResolvedValue({
          id: 501,
          result_code: 28565,
          status_id: ResultStatusData.Rejected.value,
          result_type_id: ResultTypeEnum.POLICY_CHANGE,
        });

        const attempt = service.create(buildDtoWithCode('28565'), STAR as any);
        await expect(attempt).rejects.toMatchObject({ status: 409 });
        await expect(attempt).rejects.toThrow('28565');
        await expect(attempt).rejects.toThrow('policy change');
        await expect(attempt).rejects.toThrow('other output');
        expect(
          service._bilateralResubmissionService.resubmit,
        ).not.toHaveBeenCalled();
        expect(service._resultRepository.save).not.toHaveBeenCalled();
      });

      it('a result_code found in no phase is still a 404 and never reaches resubmit() (RSB-R-10)', async () => {
        const { service } = arrangeCreateHarness();
        service._bilateralVersioningRulesService.findInPhase.mockResolvedValue(
          undefined,
        );
        service._bilateralVersioningRulesService.resolveVersionableResult.mockRejectedValue(
          new NotFoundException(
            'No active result found for result_code 99999.',
          ),
        );

        await expect(
          service.create(buildDtoWithCode('99999'), STAR as any),
        ).rejects.toBeInstanceOf(NotFoundException);
        expect(
          service._bilateralResubmissionService.resubmit,
        ).not.toHaveBeenCalled();
      });

      it('a no-code create never touches the resolver nor resubmit() (RSB-R-1)', async () => {
        const { service } = arrangeCreateHarness();

        const result = await service.create(buildDto(), STAR as any);

        expect(result.status).toBe(201);
        expect(
          service._bilateralResubmissionService.resubmit,
        ).not.toHaveBeenCalled();
        expect(
          service._bilateralVersioningRulesService.findInPhase,
        ).not.toHaveBeenCalled();
        expect(
          service._bilateralVersioningRulesService.getActiveReportingPhase,
        ).not.toHaveBeenCalled();
      });
    });

    // Superseded by `create() — versioning with data (UBC-T-2)` below: an eligible
    // version-with-data target no longer rejects — it flows into the real create path
    // (`DD-2`). The eligibility check itself (ownership) still runs first, which that describe
    // block's falsifier confirms alongside the write.
  });

  // @akili-spec changes/bilateral-create-upsert-by-code — UBC-T-2. An eligible `versioned`
  // target flows into the SAME `arrangeCreateHarness()` full create() path used by UBC-T-1 above
  // (not a bare service), so "the source row was never written" is a real claim about calls
  // into `_resultRepository`, not an assumption about a path this harness never exercises
  // (tasks.md UBC-T-2 Disqualifier).
  describe('create() — versioning with data (UBC-T-2)', () => {
    const STAR = { id: 12, acronym: 'STAR' };

    // Falsifier fixture: source row in phase 35 (Approved), open phase 36 (the harness default
    // for `getActiveReportingPhase`).
    const approvedSource = {
      id: 31921,
      result_code: 28565,
      version_id: 35,
      status_id: ResultStatusData.Approved.value,
    };

    const buildVersionDto = (overrides: Record<string, unknown> = {}) => {
      const dto = buildDto();
      Object.assign(dto.result.data as any, {
        result_code: '28565',
        ...overrides,
      });
      return dto;
    };

    const arrangeVersionTarget = (
      headerOverrides: Record<string, unknown> = {},
    ) => {
      const { service } = arrangeCreateHarness();
      service._bilateralVersioningRulesService.findInPhase.mockResolvedValue(
        undefined,
      );
      service._bilateralVersioningRulesService.resolveVersionableResult.mockResolvedValue(
        approvedSource,
      );
      // The new row's header, as the auto-increment trigger would leave it right after the
      // insert (`P-9`): some other code, definitely not 28565, which is exactly what the
      // restore step must correct.
      (service.initializeResultHeader as jest.Mock).mockResolvedValue({
        id: 777,
        result_code: 999999,
        status_id: ResultStatusData.PendingReview.value,
        ...headerOverrides,
      });
      return { service };
    };

    it('falsifier: the new row gets the source code back and the source row is never saved or updated (R-3)', async () => {
      const { service } = arrangeVersionTarget();

      const result = await service.create(buildVersionDto(), STAR as any);

      // Eligibility still runs against the SOURCE row before any write (T-1's guarantee holds).
      expect(
        service._bilateralVersioningRulesService.resolveVersionableResult,
      ).toHaveBeenCalledWith('28565', 36);
      expect(
        service._bilateralVersioningRulesService.assertCallerMayVersion,
      ).toHaveBeenCalledWith(approvedSource, '28565', STAR);

      // DD-2: restore runs against the NEW row's id (777), with the SOURCE's own result_code.
      expect(service._resultRepository.update).toHaveBeenCalledWith(777, {
        result_code: 28565,
      });

      expect(result.response.outcomes).toEqual([
        expect.objectContaining({
          result_code: 28565,
          operation: 'versioned',
        }),
      ]);

      // Disqualifier guard: the source row (31921) must never be a `save`/`update` target.
      const updateTargets = (
        service._resultRepository.update as jest.Mock
      ).mock.calls.map((call) => call[0]);
      const saveTargets = (
        service._resultRepository.save as jest.Mock
      ).mock.calls.map((call) => call[0]?.id);
      expect(updateTargets).not.toContain(approvedSource.id);
      expect(saveTargets).not.toContain(approvedSource.id);

      // Mutation (b) guard: the rejected DD-2 alternative (`versionProcessV2` + update) never
      // runs. A deliberate assertion, not a `TypeError` from an absent stub.
      expect(
        service._versioningService.versionProcessV2,
      ).not.toHaveBeenCalled();
    });

    // R-7, mutation (c) — reworked after Reviewer FAIL (attempt 1 stubbed the OUTCOME, which
    // `keep_editing` never touches; the real read is `status_id: resolveInitialStatusId(bilateralDto)`
    // at `bilateral.service.ts:4370`, inside `initializeResultHeader`). `initializeResultHeader`
    // is RESTORED to its real implementation here — not stubbed — so `keep_editing` is the only
    // input that can move the result. `_resultRepository.save`/`findOne` are wired to echo the
    // real header back (id 777, matching the DD-2 falsifier above), the way an actual insert +
    // read-back would.
    it.each([
      [true, ResultStatusData.Editing],
      [false, ResultStatusData.PendingReview],
    ])(
      'status follows keep_editing=%s -> %s (R-7)',
      async (keepEditing, expectedStatus) => {
        const { service } = arrangeVersionTarget();
        (service.initializeResultHeader as jest.Mock).mockRestore();

        let savedHeader: any;
        (service._resultRepository.save as jest.Mock).mockImplementation(
          async (row: any) => {
            savedHeader = { id: 777, ...row };
            return savedHeader;
          },
        );
        (service._resultRepository.findOne as jest.Mock).mockImplementation(
          async (query: any) =>
            query?.where?.id === 777
              ? { ...savedHeader, source: SourceEnum.Bilateral }
              : { id: 10, source: SourceEnum.Bilateral },
        );

        const result = await service.create(
          buildVersionDto({ keep_editing: keepEditing }),
          STAR as any,
        );

        // The real header-insert call is the only source of truth here: `keep_editing` is the
        // only input that can move it between the two cases (mutation (c) at `:4370` — hardcode
        // `resolveInitialStatusId`'s result — turns this red).
        expect(service._resultRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({ status_id: expectedStatus.value }),
        );
        expect(result.response.outcomes[0]).toEqual(
          expect.objectContaining({
            operation: 'versioned',
            status_id: expectedStatus.value,
            status: expectedStatus.name,
          }),
        );
      },
    );
  });

  describe('buildBilateralProjectsSummary — external_code (BPC-T-1)', () => {
    const arrange = (rows: any[]) => {
      const find = jest.fn().mockResolvedValue(rows);
      const { service } = makeService({
        _resultsByProjectsRepository: { find },
      });
      return { svc: service as any, find };
    };

    it('S-1.1: emits short_name, organization_code and external_code', async () => {
      const { svc } = arrange([
        {
          obj_clarisa_project: {
            shortName: 'CSICAP',
            externalCode: 'A1701',
            obj_organization: { acronym: 'Bioversity (Alliance)' },
          },
        },
      ]);

      await expect(svc.buildBilateralProjectsSummary(10)).resolves.toEqual([
        {
          short_name: 'CSICAP',
          organization_code: 'Bioversity (Alliance)',
          external_code: 'A1701',
        },
      ]);
    });

    it('S-1.2: external_code is present and null when the project has no code', async () => {
      const { svc } = arrange([
        {
          obj_clarisa_project: {
            shortName: 'CSICAP',
            externalCode: null,
            obj_organization: { acronym: 'Bioversity (Alliance)' },
          },
        },
      ]);

      const [item] = await svc.buildBilateralProjectsSummary(10);

      expect(Object.keys(item)).toContain('external_code');
      expect(item.external_code).toBeNull();
    });

    it('S-1.3: existing fields unchanged, null project filtered, query unchanged', async () => {
      const { svc, find } = arrange([
        {
          obj_clarisa_project: {
            shortName: 'NOORG',
            externalCode: 'X1',
            obj_organization: null,
          },
        },
        { obj_clarisa_project: null },
      ]);

      const result = await svc.buildBilateralProjectsSummary(10);

      expect(result).toEqual([
        { short_name: 'NOORG', organization_code: null, external_code: 'X1' },
      ]);
      expect(find).toHaveBeenCalledWith({
        where: {
          result_id: 10,
          is_active: true,
          obj_result_project: { is_active: true },
        },
        relations: { obj_clarisa_project: { obj_organization: true } },
      });
    });
  });

  // @akili-spec bilateral/resubmit-rejected-result — RSB-T-3 (RSB-R-8, R-12, R-13, R-16; DD-1,
  // DD-2, DD-7). Drives `create()` end to end with the REAL `BilateralResubmissionService`, the
  // REAL `BilateralService` helpers behind the preflight port and the REAL type handlers; only the
  // repositories are fakes. Every repository a resubmission could write to is a spy, so "zero
  // writes before the refusal" is a claim about calls actually made, not about the shape of the
  // code (tasks.md RSB-T-3 Falsifier; the UBC-T-3 attempt-1 FAILs were exactly writes that
  // slipped in before a late refusal).
  describe('create() — resubmission preflight: zero writes before any refusal (RSB-T-3)', () => {
    const STAR = { id: 12, acronym: 'STAR' };
    // RSB-T-5: past the preflight the pipeline reads the stored owner and then RESETS (its first
    // write). These cases stop right at the reset with a sentinel, so "the preflight passed and
    // wrote nothing" stays a claim about the preflight alone.
    const AFTER_PREFLIGHT = 'RSB-T-3 spec: the preflight passed';
    const PLACEHOLDER = AFTER_PREFLIGHT;
    const REJECTED = ResultStatusData.Rejected.value;

    const arrangeResubmission = (
      opts: { targetType?: number; stored?: Record<string, unknown> } = {},
    ) => {
      const { service } = makeService();
      const svc: any = service;
      const targetType = opts.targetType ?? ResultTypeEnum.OTHER_OUTPUT;
      const target = {
        id: 501,
        result_code: 28565,
        status_id: REJECTED,
        result_type_id: targetType,
        version_id: 36,
        ...opts.stored,
      };

      // CLOSED WORLD (T-3 review advisory B, delivered in T-4). Every repository, service and
      // manager the branch could reach answers ONLY the reads declared below; any other method is
      // a recorded violation that throws. A writer nobody listed (today's, or one T-5 adds) fails
      // `expectNothingWritten` by construction, even when a `try/catch` swallows the throw.
      const world = createClosedWorld();
      const writers: Record<string, jest.Mock> = {};
      // Methods of the service itself that the branch must never reach before a refusal.
      const writer = (name: string) =>
        (writers[name] = jest.fn().mockResolvedValue(undefined));

      svc._resultRepository = world.fake('resultRepository', {
        findOne: jest.fn().mockResolvedValue(null),
      });
      svc._yearRepository = world.fake('yearRepository', {
        findOne: jest.fn().mockResolvedValue({ year: 2025 }),
      });
      svc._geoScopeRepository = world.fake('geoScopeRepository', {
        findOne: jest
          .fn()
          .mockResolvedValue({ id: 4, code: 4, name: 'National' }),
      });
      svc._clarisaRegionsRepository = world.fake('clarisaRegions', {
        find: jest.fn().mockResolvedValue([{ um49Code: 1 }]),
      });
      svc._resultRegionRepository = world.fake('resultRegion', {
        getResultRegionByResultIdAndRegionId: jest.fn(),
      });
      svc._clarisaCountriesRepository = world.fake('clarisaCountries', {
        find: jest.fn().mockResolvedValue([{ id: 1 }]),
      });
      svc._resultCountryRepository = world.fake('resultCountry', {
        getResultCountrieByIdResultAndCountryId: jest.fn(),
      });
      svc._clarisaSubnationalAreasRepository = world.fake(
        'clarisaSubnational',
        { find: jest.fn().mockResolvedValue([{ code: 'S1' }]) },
      );
      svc._resultCountrySubnationalRepository = world.fake(
        'resultCountrySubnational',
      );
      svc._resultByIntitutionsRepository = world.fake('resultByInstitutions', {
        getResultByInstitutionExists: jest.fn(),
      });
      svc._resultInstitutionsBudgetRepository = world.fake(
        'institutionsBudget',
        { findOne: jest.fn() },
      );
      svc._evidencesRepository = world.fake('evidences');
      svc._evidencesService = world.fake('evidencesService');
      svc._resultsTocResultsRepository = world.fake('tocResults');
      svc._resultsTocResultsIndicatorsRepository = world.fake('tocIndicators');
      svc._resultsTocTargetIndicatorRepository = world.fake('tocTargets');
      svc._resultsCenterRepository = world.fake('resultsCenter');
      svc._resultsByProjectsRepository = world.fake('resultsByProjects', {
        find: jest.fn().mockResolvedValue([]),
      });
      svc._nonPooledProjectBudgetRepository = world.fake('projectBudget', {
        findOne: jest.fn(),
      });
      svc._resultByInitiativesRepository = world.fake('resultByInitiatives', {
        findOne: jest.fn(),
        // The stored owner is a READ the pipeline makes before the reset (T-4 pointer 5).
        getOwnerInitiativeByResult: jest.fn().mockResolvedValue(undefined),
      });
      svc._shareResultRequestRepository = world.fake('shareRequests', {
        findOne: jest.fn(),
      });
      svc._userRepository = world.fake('userRepository', {
        findOne: jest.fn().mockResolvedValue({ id: 1, email: 'admin@prms.pr' }),
      });
      svc._userService = world.fake('userService');
      svc._clarisaInitiatives = world.fake('clarisaInitiatives', {
        findOne: jest.fn(async ({ where }: any) =>
          where.official_code === 'SP99'
            ? null
            : {
                id: Number(String(where.official_code).replace(/\D/g, '')),
                official_code: where.official_code,
              },
        ),
      });
      svc._clarisaProjectsRepository = world.fake('clarisaProjects', {
        find: jest.fn(async ({ where }: any) =>
          where.externalCode === 'P1' ? [{ id: 77, isActive: true }] : [],
        ),
      });
      svc._primaryProgramRequestService = world.fake('primaryRequests', {
        isAligned: jest.fn().mockResolvedValue(true),
        getAlignments: jest.fn(),
      });
      // `findOrCreateUser` may create a user row on a VALID payload (same as the create path); it
      // is therefore NOT a "writer" here: the specs assert it runs last, and never on a refusal.
      svc.findOrCreateUser = jest.fn(async () => ({ id: 9 }));
      svc.announcePendingReview = writer('announcePendingReview');
      svc.initializeResultHeader = writer('initializeResultHeader');

      // The real type handlers, in the same closed world.
      const policyRepo = world.fake('policyRepo', { findOne: jest.fn() });
      svc.resultTypeHandlerMap.set(
        ResultTypeEnum.POLICY_CHANGE,
        new PolicyChangeBilateralHandler(
          policyRepo as any,
          { findOne: jest.fn().mockResolvedValue({ id: 2 }) } as any,
          { findOne: jest.fn().mockResolvedValue({ id: 6 }) } as any,
          world.fake('policyInstitutions', {
            getResultByInstitutionExists: jest.fn(),
          }) as any,
          { findOne: jest.fn(), find: jest.fn() } as any,
        ),
      );
      const capDevRepo = world.fake('capDevRepo', {
        capDevExists: jest.fn(),
      });
      svc.resultTypeHandlerMap.set(
        ResultTypeEnum.CAPACITY_SHARING_FOR_DEVELOPMENT,
        new CapacityChangeBilateralHandler(
          capDevRepo as any,
          {
            findOne: jest.fn().mockResolvedValue({ capdev_term_id: 3 }),
          } as any,
          {
            findOne: jest
              .fn()
              .mockResolvedValue({ capdev_delivery_method_id: 2 }),
          } as any,
        ),
      );
      svc.resultTypeHandlerMap.set(
        ResultTypeEnum.INNOVATION_DEVELOPMENT,
        new InnovationDevelopmentBilateralHandler(
          world.fake('innoDevRepo', { findOne: jest.fn() }) as any,
          {
            findOne: jest.fn().mockResolvedValue({ id: 14, level: 3 }),
          } as any,
        ),
      );
      const actorTypes = [
        { actor_type_id: 1, name: 'Farmers' },
        { actor_type_id: 2, name: 'Researchers' },
      ];
      svc.resultTypeHandlerMap.set(
        ResultTypeEnum.INNOVATION_USE,
        new InnovationUseBilateralHandler(
          world.fake('innovationUseService') as any,
          {
            findOne: jest.fn(async ({ where }: any) =>
              where.level === 2 ? { id: 3, level: 2 } : null,
            ),
          } as any,
          {
            findOne: jest.fn(
              async ({ where }: any) =>
                actorTypes.find(
                  (a) => a.actor_type_id === where.actor_type_id,
                ) ?? null,
            ),
            find: jest.fn().mockResolvedValue(actorTypes),
          } as any,
          {
            assertExternalCreateMds: jest.fn().mockResolvedValue(undefined),
          } as any,
        ),
      );

      // Rules: the open-phase target, ownership and KP guards all pass.
      svc._bilateralVersioningRulesService.findInPhase.mockResolvedValue(
        target,
      );

      // Real resubmission service over a closed-world connection: it answers the lock plumbing and
      // the status read; any other statement, and any manager / transaction / repository, is a
      // violation (and `sql` keeps the statements for the regex check below).
      const sql: string[] = [];
      const query = jest.fn(async (statement: string) => {
        sql.push(statement);
        if (statement.includes('GET_LOCK')) return [{ acquired: 1 }];
        if (statement.includes('RELEASE_LOCK')) return [{ released: 1 }];
        if (/select\s+status_id/i.test(statement))
          return [{ status_id: REJECTED }];
        world.violations.push(`queryRunner.query(${statement.slice(0, 40)})`);
        throw new Error(`unexpected SQL in test: ${statement}`);
      });
      const resubmission = new BilateralResubmissionService(
        world.fake('dataSource', {
          createQueryRunner: () =>
            world.fake('queryRunner', {
              connect: jest.fn().mockResolvedValue(undefined),
              query,
              release: jest.fn().mockResolvedValue(undefined),
            }),
        }) as any,
      );
      ['log', 'warn', 'error'].forEach((level) =>
        jest
          .spyOn((resubmission as any).logger, level)
          .mockImplementation(() => undefined),
      );
      svc._bilateralResubmissionService = resubmission;
      const resetSpy = jest
        .spyOn(resubmission, 'resetSectionsForResubmission')
        .mockRejectedValue(new ConflictException(AFTER_PREFLIGHT));

      const payload = (overrides: Record<string, unknown> = {}) => ({
        result: {
          data: {
            result_code: '28565',
            result_type_id: targetType,
            title: 'Corrected title',
            geo_focus: {
              scope_code: 4,
              regions: [],
              countries: [{ id: 1 }],
              subnational_areas: [],
            },
            toc_mapping: { science_program_id: 'SP06' },
            contributing_bilateral_projects: [
              { grant_title: 'P1', is_lead: true },
            ],
            evidence: [{ link: 'https://example.org/a' }],
            ...overrides,
          },
        },
      });

      // `resetReached`: the payload passed the whole preflight, so the pipeline got as far as the
      // reset (the sentinel above) and not one write came before it.
      const expectNothingWritten = ({
        resetReached,
      }: { resetReached?: boolean } = {}) => {
        Object.entries(writers).forEach(([name, fn]) => {
          if (fn.mock.calls.length) {
            throw new Error(
              `${name} was called ${fn.mock.calls.length} time(s)`,
            );
          }
        });
        expect(world.violations).toEqual([]);
        if (resetReached) expect(resetSpy).toHaveBeenCalledTimes(1);
        else expect(resetSpy).not.toHaveBeenCalled();
        expect(sql.join('\n')).not.toMatch(
          /\b(insert|update|delete|replace)\b/i,
        );
      };

      return {
        svc,
        target,
        payload,
        writers,
        expectNothingWritten,
        sql,
        world,
      };
    };

    // [label, target type, payload overrides, mutation of the fakes, status, message]
    type Refusal = [
      string,
      number,
      Record<string, unknown>,
      ((svc: any) => void) | undefined,
      number,
      string,
    ];
    const OTHER = ResultTypeEnum.OTHER_OUTPUT;
    const refusals: Refusal[] = [
      [
        'unknown country (geo lookup the handlers run after the header)',
        OTHER,
        { geo_focus: { scope_code: 4, countries: [{ id: 99999 }] } },
        (svc) => svc._clarisaCountriesRepository.find.mockResolvedValue([]),
        404,
        'No countries found matching any of the provided identifiers: ids=99999, names=N/A.',
      ],
      [
        'unknown region',
        OTHER,
        {
          geo_focus: {
            scope_code: 2,
            regions: [{ um49code: 1 }],
            countries: [],
          },
        },
        (svc) => {
          svc._geoScopeRepository.findOne.mockResolvedValue({
            id: 2,
            code: 2,
            name: 'Regional',
          });
          svc._clarisaRegionsRepository.find.mockResolvedValue([]);
        },
        404,
        'No regions found matching the provided data (codes: 1, names: N/A).',
      ],
      [
        'unknown subnational area',
        OTHER,
        {
          geo_focus: {
            scope_code: 5,
            countries: [{ id: 1 }],
            subnational_areas: [{ id: 9 }],
          },
        },
        (svc) => {
          svc._geoScopeRepository.findOne.mockResolvedValue({
            id: 5,
            code: 5,
            name: 'Sub-national',
          });
          svc._clarisaSubnationalAreasRepository.find.mockResolvedValue([]);
        },
        404,
        'No subnational areas found matching any of the provided identifiers: ids=9, names=N/A.',
      ],
      [
        'unknown geographic scope',
        OTHER,
        { geo_focus: { scope_code: 77 } },
        (svc) => svc._geoScopeRepository.findOne.mockResolvedValue(null),
        404,
        'No geographic scope found for code 77',
      ],
      [
        'geo_focus missing',
        OTHER,
        { geo_focus: undefined },
        undefined,
        400,
        'geo_focus is required for non-Knowledge Product results.',
      ],
      [
        'invalid innovation_use_level',
        ResultTypeEnum.INNOVATION_USE,
        {
          innovation_use: {
            current_innovation_use_numbers: {
              innov_use_to_be_determined: false,
              actors: [{ actor_type_id: 1, how_many: 1 }],
            },
            innovation_use_level: { level: 77 },
          },
        },
        undefined,
        400,
        'Invalid innovation use level: 77.',
      ],
      [
        'unknown actor type',
        ResultTypeEnum.INNOVATION_USE,
        {
          innovation_use: {
            current_innovation_use_numbers: {
              innov_use_to_be_determined: false,
              actors: [{ actor_type_id: 999, how_many: 1 }],
            },
          },
        },
        undefined,
        400,
        'Invalid actors[0].actor_type_id: 999.',
      ],
      [
        'policy change without policy_stage',
        ResultTypeEnum.POLICY_CHANGE,
        {
          policy_change: {
            policy_type: { id: 2 },
            implementing_organization: [{ institutions_id: 1 }],
          },
        },
        undefined,
        400,
        'policy_stage is required for POLICY_CHANGE results.',
      ],
      [
        'capacity sharing with an unsupported delivery method',
        ResultTypeEnum.CAPACITY_SHARING_FOR_DEVELOPMENT,
        {
          capacity_sharing: {
            number_people_trained: { women: 1 },
            length_training: 'Short-term',
            delivery_method: 'Unknown',
          },
        },
        undefined,
        400,
        'Unsupported delivery_method value "Unknown".',
      ],
      [
        'innovation development with an unsupported typology',
        ResultTypeEnum.INNOVATION_DEVELOPMENT,
        {
          innovation_development: {
            innovation_typology: { code: 99 },
            innovation_readiness_level: { level: 3 },
          },
        },
        undefined,
        400,
        'Unsupported innovation typology code "99".',
      ],
      [
        'duplicate evidence links',
        OTHER,
        {
          evidence: [
            { link: 'https://example.org/a' },
            { link: 'https://example.org/a' },
          ],
        },
        undefined,
        400,
        'Duplicate links found in the evidence',
      ],
      [
        'science program unknown to CLARISA',
        OTHER,
        { toc_mapping: { science_program_id: 'SP99' } },
        undefined,
        400,
        'do not exist in CLARISA: SP99',
      ],
      [
        'contributing project that resolves to nothing',
        OTHER,
        { contributing_bilateral_projects: [{ grant_title: 'NOPE' }] },
        undefined,
        400,
        'no project of the 2025 reporting phase matches grant_title "NOPE"',
      ],
      [
        'no primary Science Program',
        OTHER,
        { toc_mapping: {} },
        undefined,
        400,
        'Result 28565 cannot be resubmitted without a primary Science Program (toc_mapping.science_program_id).',
      ],
      [
        'SP09 present in CLARISA but not allocated to the lead project',
        OTHER,
        { toc_mapping: { science_program_id: 'SP09' } },
        (svc) =>
          svc._primaryProgramRequestService.isAligned.mockImplementation(
            async (_project: number, initiative: number) => initiative !== 9,
          ),
        400,
        'SP09 is not allocated to the lead project of result 28565.',
      ],
      [
        'a title equal to ANOTHER result',
        OTHER,
        { title: 'Same as another result' },
        (svc) => svc._resultRepository.findOne.mockResolvedValue({ id: 999 }),
        400,
        'A result with the title "Same as another result" already exists.',
      ],
    ];

    it.each(refusals)(
      '%s -> refused, nothing written',
      async (_label, targetType, overrides, mutate, status, message) => {
        const { svc, payload, expectNothingWritten } = arrangeResubmission({
          targetType,
        });
        mutate?.(svc);

        const attempt = svc.create(payload(overrides), STAR as any);
        await expect(attempt).rejects.toMatchObject({ status });
        await expect(attempt).rejects.toMatchObject({
          message: expect.stringContaining(message),
        });

        expectNothingWritten();
        expect(svc.findOrCreateUser).not.toHaveBeenCalled();
      },
    );

    it('the active reporting year missing -> 404, nothing written', async () => {
      const { svc, payload, expectNothingWritten } = arrangeResubmission();
      svc._yearRepository.findOne.mockResolvedValue(null);

      await expect(svc.create(payload(), STAR as any)).rejects.toMatchObject({
        status: 404,
        message: 'Active year not found',
      });
      expectNothingWritten();
    });

    it('the allocated primary of a fully valid payload passes the preflight with zero writes, and reaches the reset (the first write)', async () => {
      const { svc, payload, expectNothingWritten } = arrangeResubmission();

      await expect(svc.create(payload(), STAR as any)).rejects.toMatchObject({
        status: 409,
        message: PLACEHOLDER,
      });

      // The payload lead project (77, from grant_title "P1") is what alignment is checked on.
      expect(svc._primaryProgramRequestService.isAligned).toHaveBeenCalledWith(
        77,
        6,
      );
      expectNothingWritten({ resetReached: true });
    });

    // T-3 review forward pointer (7). RSB-R-12 scenario "project with a single SP": "GIVEN a lead
    // project allocated only to SP01, WHEN it is resubmitted with another SP as primary, THEN it is
    // refused". The allocation list of the lead project is {SP01}; SP06 is a real CLARISA program.
    describe('RSB-R-12 scenario: a project with a single SP', () => {
      const SP01_ONLY = (svc: any) =>
        svc._primaryProgramRequestService.isAligned.mockImplementation(
          async (_project: number, initiative: number) => initiative === 1,
        );

      it('another SP as primary is refused (400 naming the SP and the result), zero writes, the title and users never reached', async () => {
        const { svc, payload, expectNothingWritten } = arrangeResubmission();
        SP01_ONLY(svc);

        const attempt = svc.create(
          payload({ toc_mapping: { science_program_id: 'SP06' } }),
          STAR as any,
        );
        await expect(attempt).rejects.toMatchObject({ status: 400 });
        await expect(attempt).rejects.toThrow(
          'SP06 is not allocated to the lead project of result 28565.',
        );

        expect(
          svc._primaryProgramRequestService.isAligned,
        ).toHaveBeenCalledWith(77, 6);
        expect(svc.findOrCreateUser).not.toHaveBeenCalled();
        expectNothingWritten();
      });

      it('the SAME single SP as primary passes (the twin: the refusal above is the allocation, not the payload)', async () => {
        const { svc, payload, expectNothingWritten } = arrangeResubmission();
        SP01_ONLY(svc);

        await expect(
          svc.create(
            payload({ toc_mapping: { science_program_id: 'SP01' } }),
            STAR as any,
          ),
        ).rejects.toMatchObject({ status: 409, message: AFTER_PREFLIGHT });

        expect(
          svc._primaryProgramRequestService.isAligned,
        ).toHaveBeenCalledWith(77, 1);
        expectNothingWritten({ resetReached: true });
      });
    });

    it('the SAME title as the result itself passes (R-16): the duplicate lookup excludes the result id', async () => {
      const { svc, payload, expectNothingWritten } = arrangeResubmission();
      // The only row that carries this title is the result being resubmitted: a lookup that
      // excludes it finds nothing. A lookup that does NOT exclude it would find id 501 and refuse.
      svc._resultRepository.findOne.mockImplementation(async (options: any) =>
        options?.where?.id ? null : { id: 501 },
      );

      await expect(
        svc.create(payload({ title: 'Its own title' }), STAR as any),
      ).rejects.toMatchObject({ status: 409, message: PLACEHOLDER });

      expect(svc._resultRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            title: 'Its own title',
            version_id: 36,
            id: Not(501),
          }),
        }),
      );
      expectNothingWritten({ resetReached: true });
    });

    // RSB-R-23 (T-3 Pivot Record, user decision 2026-10-06): the payload names the lead project the
    // create writers will store. The stored lead is NOT a fallback (the reset deactivates it).
    describe('RSB-R-23: the payload must yield a lead bilateral project', () => {
      const NO_LEAD =
        'Result 28565 cannot be resubmitted without a lead bilateral project (one project, or one flagged is_lead).';
      const twoProjects = (svc: any) =>
        svc._clarisaProjectsRepository.find.mockImplementation(
          async ({ where }: any) =>
            ({
              P1: [{ id: 77, isActive: true }],
              P2: [{ id: 78, isActive: true }],
            })[where.externalCode] ?? [],
        );

      it('no project in the payload -> 400 before any write; alignment never asked', async () => {
        const { svc, payload, expectNothingWritten } = arrangeResubmission();

        const attempt = svc.create(
          payload({ contributing_bilateral_projects: [] }),
          STAR as any,
        );
        await expect(attempt).rejects.toMatchObject({ status: 400 });
        await expect(attempt).rejects.toMatchObject({ message: NO_LEAD });

        expect(
          svc._primaryProgramRequestService.isAligned,
        ).not.toHaveBeenCalled();
        expect(svc.findOrCreateUser).not.toHaveBeenCalled();
        expectNothingWritten();
      });

      it('several projects, none flagged is_lead (the R-23 scenario) -> 400, zero writes', async () => {
        const { svc, payload, expectNothingWritten } = arrangeResubmission();
        twoProjects(svc);

        const attempt = svc.create(
          payload({
            contributing_bilateral_projects: [
              { grant_title: 'P1' },
              { grant_title: 'P2' },
            ],
          }),
          STAR as any,
        );
        await expect(attempt).rejects.toMatchObject({ status: 400 });
        await expect(attempt).rejects.toMatchObject({ message: NO_LEAD });

        expect(
          svc._primaryProgramRequestService.isAligned,
        ).not.toHaveBeenCalled();
        expectNothingWritten();
      });

      it('one project flagged among several -> passes, and isAligned receives THAT project', async () => {
        const { svc, payload, expectNothingWritten } = arrangeResubmission();
        twoProjects(svc);

        await expect(
          svc.create(
            payload({
              contributing_bilateral_projects: [
                { grant_title: 'P1' },
                { grant_title: 'P2', is_lead: true },
              ],
            }),
            STAR as any,
          ),
        ).rejects.toMatchObject({ status: 409, message: PLACEHOLDER });

        expect(
          svc._primaryProgramRequestService.isAligned,
        ).toHaveBeenCalledWith(78, 6);
        expectNothingWritten({ resetReached: true });
      });

      it('a single project is the lead even without the flag (determineIsLead)', async () => {
        const { svc, payload } = arrangeResubmission();

        await expect(
          svc.create(
            payload({
              contributing_bilateral_projects: [{ grant_title: 'P1' }],
            }),
            STAR as any,
          ),
        ).rejects.toMatchObject({ status: 409, message: PLACEHOLDER });

        expect(
          svc._primaryProgramRequestService.isAligned,
        ).toHaveBeenCalledWith(77, 6);
      });

      it('the stored lead project is never read (no `find` on results_by_projects during the preflight)', async () => {
        const { svc, payload } = arrangeResubmission();

        await expect(
          svc.create(
            payload({ contributing_bilateral_projects: [] }),
            STAR as any,
          ),
        ).rejects.toMatchObject({ status: 400 });

        expect(svc._resultsByProjectsRepository.find).not.toHaveBeenCalled();
      });
    });

    // @akili-spec bilateral/resubmit-followups — RSF-T-4 (RSF-R-5, R-6, DD-6, P-13). The lead centre
    // is resolved with the lookup `handleLeadCenter` uses, through a CLOSED WORLD: `_clarisaCenters`,
    // `_clarisaInstitutionsRepository` and `_resultsCenterRepository` answer only reads, so a
    // lookup that wrote (a cache row, a `save`) is a recorded violation.
    describe('RSF-T-4: lead centre, one lead project, contributor ids (resubmission branch only)', () => {
      const arrange = () => {
        const base = arrangeResubmission();
        const { svc, world } = base;
        const centers = {
          findOne: jest.fn().mockResolvedValue(null),
          find: jest.fn().mockResolvedValue([]),
        };
        const institutions = {
          findOne: jest.fn().mockResolvedValue(null),
          find: jest.fn().mockResolvedValue([]),
        };
        svc._clarisaCenters = world.fake('clarisaCenters', centers);
        svc._clarisaInstitutionsRepository = world.fake(
          'clarisaInstitutions',
          institutions,
        );
        const persist = jest.spyOn(svc, 'persistLeadCenter');
        return { ...base, centers, institutions, persist };
      };
      const LEAD_CENTER_400 = (value: string) =>
        `Result 28565 cannot be resubmitted: lead_center ${value} does not match a CGIAR center.`;
      const threeProjects = (svc: any) =>
        svc._clarisaProjectsRepository.find.mockImplementation(
          async ({ where }: any) =>
            ({
              P1: [{ id: 77, isActive: true }],
              P2: [{ id: 78, isActive: true }],
              P3: [{ id: 79, isActive: true }],
            })[where.externalCode] ?? [],
        );

      it('an unknown lead_center -> 400 naming the result and the value sent; zero writes, users and reset never reached', async () => {
        const { svc, payload, expectNothingWritten, persist } = arrange();

        const attempt = svc.create(
          payload({ lead_center: { acronym: 'NOWHERE' } }),
          STAR as any,
        );
        await expect(attempt).rejects.toMatchObject({
          status: 400,
          message: LEAD_CENTER_400('NOWHERE'),
        });

        expect(svc.findOrCreateUser).not.toHaveBeenCalled();
        expect(persist).not.toHaveBeenCalled();
        expectNothingWritten();
      });

      it('an institution that matches but owns no clarisa_center -> the same 400', async () => {
        const { svc, payload, expectNothingWritten, institutions } = arrange();
        institutions.find.mockResolvedValue([{ id: 5 }]);

        await expect(
          svc.create(
            payload({ lead_center: { name: 'Some Institute' } }),
            STAR as any,
          ),
        ).rejects.toMatchObject({
          status: 400,
          message: LEAD_CENTER_400('Some Institute'),
        });
        expectNothingWritten();
      });

      it('a lead_center that resolves through institutions passes, and the lookup wrote nothing', async () => {
        const { svc, payload, expectNothingWritten, institutions, centers } =
          arrange();
        institutions.find.mockResolvedValue([{ id: 5 }]);
        centers.find.mockResolvedValue([
          { code: 'CENTER-09', institutionId: 5 },
        ]);

        await expect(
          svc.create(
            payload({ lead_center: { acronym: 'IITA' } }),
            STAR as any,
          ),
        ).rejects.toMatchObject({ status: 409, message: PLACEHOLDER });

        // Read-only: the closed world holds `_resultsCenterRepository` (no save / update / query).
        expectNothingWritten({ resetReached: true });
      });

      it('an Alliance alias resolves from the alias table and passes', async () => {
        const { svc, payload, expectNothingWritten, centers } = arrange();
        centers.findOne.mockResolvedValue({ code: 'CENTER-03' });

        await expect(
          svc.create(
            payload({ lead_center: { acronym: 'CIAT (Alliance)' } }),
            STAR as any,
          ),
        ).rejects.toMatchObject({ status: 409, message: PLACEHOLDER });
        expectNothingWritten({ resetReached: true });
      });

      it('a payload without a lead_center object is not refused (nothing to resolve, as before)', async () => {
        const { svc, payload, expectNothingWritten } = arrange();

        await expect(svc.create(payload(), STAR as any)).rejects.toMatchObject({
          status: 409,
          message: PLACEHOLDER,
        });
        expectNothingWritten({ resetReached: true });
      });

      it('two projects flagged is_lead -> 400 naming the result and the count; alignment, users and writers never reached', async () => {
        const { svc, payload, expectNothingWritten } = arrange();
        threeProjects(svc);

        const attempt = svc.create(
          payload({
            contributing_bilateral_projects: [
              { grant_title: 'P1', is_lead: true },
              { grant_title: 'P2', is_lead: 1 },
              { grant_title: 'P3' },
            ],
          }),
          STAR as any,
        );
        await expect(attempt).rejects.toMatchObject({
          status: 400,
          message:
            'Result 28565 cannot be resubmitted: 2 bilateral projects are flagged is_lead; flag exactly one.',
        });

        expect(
          svc._primaryProgramRequestService.isAligned,
        ).not.toHaveBeenCalled();
        expect(svc.findOrCreateUser).not.toHaveBeenCalled();
        expectNothingWritten();
      });

      it('one flagged project among three passes; a lone project passes without the flag', async () => {
        const { svc, payload, expectNothingWritten } = arrange();
        threeProjects(svc);

        await expect(
          svc.create(
            payload({
              contributing_bilateral_projects: [
                { grant_title: 'P1' },
                { grant_title: 'P2', is_lead: true },
                { grant_title: 'P3', is_lead: false },
              ],
            }),
            STAR as any,
          ),
        ).rejects.toMatchObject({ status: 409, message: PLACEHOLDER });
        expect(
          svc._primaryProgramRequestService.isAligned,
        ).toHaveBeenCalledWith(78, 6);
        expectNothingWritten({ resetReached: true });
      });

      // RSF-R-10: the contract doc tells platforms that a 409 "its status is pending review" after a
      // timeout means the attempt committed. The server must produce exactly that wording for 5.
      it('R-10: describeResultStatus(5) is the literal "pending review", the wording the contract doc promises', () => {
        expect(describeResultStatus(5)).toBe('pending review');
        expect(describeResultStatus('5')).toBe('pending review');

        const doc = readFileSync(
          join(__dirname, '../../../docs/bilateral-result-summaries.en.md'),
          'utf8',
        );
        expect(doc).toContain('`409` with `its status is pending review`');
        expect(doc).toContain('`status: "pending review"` (with a space)');
      });

      it('the preflight result carries the contributor initiative ids, deduped (read-only CLARISA lookup, P-13)', async () => {
        const { svc, payload, expectNothingWritten } = arrange();
        const preflight = jest.spyOn(
          svc._bilateralResubmissionService,
          'runPreflight',
        );

        await expect(
          svc.create(
            payload({
              contributing_programs: [
                { science_program_id: ' sp03 ' },
                { science_program_id: 'SP04' },
                { science_program_id: 'SP03' },
              ],
            }),
            STAR as any,
          ),
        ).rejects.toMatchObject({ status: 409, message: PLACEHOLDER });

        await expect(preflight.mock.results[0].value).resolves.toMatchObject({
          contributorInitiativeIds: [3, 4],
        });
        expectNothingWritten({ resetReached: true });
      });
    });

    // T-3 review carry-over: the users are resolved in the preflight, before any result write.
    describe('users are resolved in the preflight (T-3 review, forward pointer to T-4)', () => {
      it('a valid payload resolves both users AFTER every validation (title check included)', async () => {
        const { svc, payload, expectNothingWritten } = arrangeResubmission();

        await expect(svc.create(payload(), STAR as any)).rejects.toMatchObject({
          status: 409,
          message: PLACEHOLDER,
        });

        // created_by, then the submitter (same two calls the create path makes).
        expect(svc.findOrCreateUser).toHaveBeenCalledTimes(2);
        const lastValidation = Math.max(
          ...svc._resultRepository.findOne.mock.invocationCallOrder,
          ...svc._primaryProgramRequestService.isAligned.mock
            .invocationCallOrder,
        );
        expect(
          svc.findOrCreateUser.mock.invocationCallOrder[0],
        ).toBeGreaterThan(lastValidation);
        // It may create a USER row (like the create path); no RESULT row is written.
        expectNothingWritten({ resetReached: true });
      });

      it('a users refusal ("User email is required.") is raised before any result write', async () => {
        const { svc, payload, expectNothingWritten } = arrangeResubmission();
        svc.findOrCreateUser.mockRejectedValue(
          new BadRequestException('User email is required.'),
        );

        await expect(svc.create(payload(), STAR as any)).rejects.toMatchObject({
          status: 400,
          message: 'User email is required.',
        });

        expectNothingWritten();
      });

      it('the real findOrCreateUser refuses a payload without an email (not just the stub)', async () => {
        const { svc, payload, expectNothingWritten } = arrangeResubmission();
        svc.findOrCreateUser = BilateralService.prototype['findOrCreateUser'];

        await expect(
          svc.create(payload({ created_by: {} }), STAR as any),
        ).rejects.toMatchObject({
          status: 400,
          message: 'User email is required.',
        });

        expectNothingWritten();
      });
    });
  });

  // @akili-spec bilateral/resubmit-rejected-result — RSB-T-3 / RSB-DD-1 / RSB-R-1. The handlers'
  // `afterCreate` now consumes `resolveAndValidate`; a NO-CODE create with an invalid payload must
  // fail with the same message at the same moment as before: after the header and every section
  // writer, before the contributing centres (assert the call order, not just the message).
  describe('create() — no-code create keeps the handler error at the same moment (RSB-T-3 / RSB-R-1)', () => {
    const STAR = { id: 12, acronym: 'STAR' };

    const cases: Array<[string, number, Record<string, unknown>, string]> = [
      [
        'policy change',
        ResultTypeEnum.POLICY_CHANGE,
        { policy_change: undefined },
        'policy_change object is required for POLICY_CHANGE results.',
      ],
      [
        'capacity sharing',
        ResultTypeEnum.CAPACITY_SHARING_FOR_DEVELOPMENT,
        { capacity_sharing: undefined },
        'capacity_sharing object is required for capacity sharing results.',
      ],
      [
        'innovation development',
        ResultTypeEnum.INNOVATION_DEVELOPMENT,
        { innovation_development: undefined },
        'innovation_development object is required for INNOVATION_DEVELOPMENT results.',
      ],
      [
        'innovation use',
        ResultTypeEnum.INNOVATION_USE,
        {
          innovation_use: {
            current_innovation_use_numbers: {
              innov_use_to_be_determined: false,
              actors: [{ actor_type_id: 999 }],
            },
          },
        },
        'Invalid actors[0].actor_type_id: 999.',
      ],
    ];

    it.each(cases)(
      '%s: invalid payload -> same message, raised after the header + section writers, before the contributing centres',
      async (_label, resultType, overrides, message) => {
        const { service } = arrangeCreateHarness();
        const svc: any = service;
        // Put the real code back: the harness stubs it out.
        (svc.runResultTypeHandlers as jest.Mock).mockRestore();
        const writes = {
          save: jest.fn(),
          create: jest.fn(),
          saveUse: jest.fn(),
        };
        const stubHandlers = {
          [ResultTypeEnum.POLICY_CHANGE]: new PolicyChangeBilateralHandler(
            {
              save: writes.save,
              create: writes.create,
              findOne: jest.fn(),
            } as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
          ),
          [ResultTypeEnum.CAPACITY_SHARING_FOR_DEVELOPMENT]:
            new CapacityChangeBilateralHandler(
              { save: writes.save, create: writes.create } as any,
              {} as any,
              {} as any,
            ),
          [ResultTypeEnum.INNOVATION_DEVELOPMENT]:
            new InnovationDevelopmentBilateralHandler(
              {
                save: writes.save,
                create: writes.create,
                findOne: jest.fn(),
              } as any,
              {} as any,
            ),
          [ResultTypeEnum.INNOVATION_USE]: new InnovationUseBilateralHandler(
            { saveInnovationUse: writes.saveUse } as any,
            {} as any,
            {
              findOne: jest.fn().mockResolvedValue(null),
              find: jest.fn().mockResolvedValue([]),
            } as any,
            {} as any,
          ),
        };
        svc.resultTypeHandlerMap.set(resultType, stubHandlers[resultType]);

        const dto: any = {
          result: {
            data: {
              ...(buildDto().result.data as any),
              result_type_id: resultType,
              ...overrides,
            },
          },
        };

        await expect(svc.create(dto, STAR as any)).rejects.toThrow(message);

        // Same moment as before: the header and every section writer already ran...
        const order = (spy: jest.SpyInstance) =>
          spy.mock.invocationCallOrder[0];
        expect(svc.initializeResultHeader).toHaveBeenCalledTimes(1);
        expect(svc.handleTocMapping).toHaveBeenCalledTimes(1);
        expect(svc.handleInstitutions).toHaveBeenCalledTimes(1);
        expect(svc.handleEvidence).toHaveBeenCalledTimes(1);
        expect(svc.handleNonPooledProject).toHaveBeenCalledTimes(1);
        expect(order(svc.initializeResultHeader)).toBeLessThan(
          order(svc.handleNonPooledProject),
        );
        // ...and the error stopped the create before anything after the handlers.
        expect(svc.handleContributingCenters).not.toHaveBeenCalled();
        expect(svc.ensureDerivedContributingCenters).not.toHaveBeenCalled();
        // The handler wrote nothing of its own.
        expect(writes.save).not.toHaveBeenCalled();
        expect(writes.create).not.toHaveBeenCalled();
        expect(writes.saveUse).not.toHaveBeenCalled();
      },
    );
  });

  // @akili-spec bilateral/resubmit-rejected-result — RSB-T-4 (RSB-R-4, R-23; design §7
  // `bs.persistLeadCenter`, §9 DD-7). The replace-safe writer fixes the reset depends on. Every
  // case here proves CALLS (and, where an in-memory table is used, the rows left active); that the
  // real rows come out right on MySQL is RSB-T-7 (tasks.md T-4 "Gap").
  describe('replace-safe writers (RSB-T-4)', () => {
    const USER = 9;
    const center = { code: 'CENTER-02', institutionId: 0 } as any;

    const makeCenters = (existing: any = null) => {
      const queries: Array<{ sql: string; params: unknown[] }> = [];
      const { service } = makeService({
        _resultRepository: {
          query: jest.fn(async (sql: string, params: unknown[]) => {
            queries.push({ sql, params });
          }),
        },
        _resultsCenterRepository: {
          getAllResultsCenterByResultIdAndCenterId: jest.fn(
            async () => existing,
          ),
          save: jest.fn(async (row: any) => row),
          update: jest.fn(async () => undefined),
        },
      });
      const svc: any = service;
      return { svc, queries, centers: svc._resultsCenterRepository };
    };

    describe('persistLeadCenter', () => {
      it('NEW create (no existing row): exactly the calls it made before -- one lookup, one save, no UPDATE, no demotion', async () => {
        const { svc, queries, centers } = makeCenters(null);

        await svc.persistLeadCenter(501, center, USER);

        expect(
          centers.getAllResultsCenterByResultIdAndCenterId,
        ).toHaveBeenCalledTimes(1);
        expect(
          centers.getAllResultsCenterByResultIdAndCenterId,
        ).toHaveBeenCalledWith(501, 'CENTER-02');
        expect(centers.save).toHaveBeenCalledTimes(1);
        expect(centers.save).toHaveBeenCalledWith({
          result_id: 501,
          center_id: 'CENTER-02',
          is_primary: true,
          is_leading_result: true,
          from_cgspace: false,
          is_active: true,
          created_by: USER,
        });
        expect(queries).toEqual([]);
        expect(centers.update).not.toHaveBeenCalled();
      });

      it('an existing row is REACTIVATED as the lead (a reset may have deactivated it), not duplicated', async () => {
        const { svc, queries, centers } = makeCenters({
          id: 31,
          is_active: 0,
          is_leading_result: 0,
        });

        await svc.persistLeadCenter(501, center, USER);

        expect(centers.save).not.toHaveBeenCalled();
        expect(queries).toHaveLength(1);
        expect(queries[0].sql).toMatch(/is_active\s*=\s*1/);
        expect(queries[0].sql).toMatch(/is_leading_result\s*=\s*1/);
        expect(queries[0].params).toEqual([USER, 31]);
      });

      it('replacePreviousLead: the previous lead (another centre) is demoted and deactivated, scoped to this result', async () => {
        const { svc, queries } = makeCenters(null);

        await svc.persistLeadCenter(501, center, USER, {
          replacePreviousLead: true,
        });

        const demotion = queries.find((q) =>
          /is_leading_result\s*=\s*0/.test(q.sql),
        );
        expect(demotion).toBeDefined();
        expect(demotion.sql).toMatch(/is_active\s*=\s*0/);
        expect(demotion.sql).toMatch(/is_primary\s*=\s*0/);
        // Only this result, never the centre being made lead, only rows that ARE the lead.
        expect(demotion.sql).toMatch(/result_id\s*=\s*\?/);
        expect(demotion.sql).toMatch(/center_id\s*<>\s*\?/);
        expect(demotion.sql).toMatch(/is_leading_result\s*=\s*1/);
        expect(demotion.params).toEqual([USER, 501, 'CENTER-02']);
      });

      it('the demotion comes BEFORE the new lead is flagged', async () => {
        const { svc, queries, centers } = makeCenters({
          id: 31,
          is_active: 1,
          is_leading_result: 0,
        });

        await svc.persistLeadCenter(501, center, USER, {
          replacePreviousLead: true,
        });

        expect(queries).toHaveLength(2);
        expect(queries[0].sql).toMatch(/is_leading_result\s*=\s*0/);
        expect(queries[1].params).toEqual([USER, 31]);
        expect(centers.save).not.toHaveBeenCalled();
      });

      it('handleLeadCenter threads the option through to persistLeadCenter, and omits it by default (create path)', async () => {
        const { service } = makeService({
          _clarisaCenters: {
            findOne: jest.fn(async ({ where }: any) => ({
              code: where.code,
              institutionId: 0,
            })),
          },
        });
        const svc: any = service;
        const persist = jest
          .spyOn(svc, 'persistLeadCenter')
          .mockResolvedValue(undefined);

        await svc.handleLeadCenter(
          7,
          { acronym: 'Bioversity (Alliance)' },
          USER,
        );
        await svc.handleLeadCenter(
          7,
          { acronym: 'Bioversity (Alliance)' },
          USER,
          { replacePreviousLead: true },
        );

        expect(persist.mock.calls[0][3]).toBeUndefined();
        expect(persist.mock.calls[1][3]).toEqual({ replacePreviousLead: true });
      });
    });

    describe('persistContributingCenter', () => {
      it('no existing row: the same single save as before', async () => {
        const { svc, centers } = makeCenters(null);

        await svc.persistContributingCenter(501, center, USER);

        expect(centers.save).toHaveBeenCalledWith({
          result_id: 501,
          center_id: 'CENTER-02',
          is_primary: false,
          is_leading_result: false,
          from_cgspace: false,
          is_active: true,
          created_by: USER,
        });
        expect(centers.update).not.toHaveBeenCalled();
      });

      it('an existing INACTIVE row (deactivated by the reset) is reactivated as a contributor, never duplicated', async () => {
        const { svc, centers } = makeCenters({ id: 31, is_active: 0 });

        await svc.persistContributingCenter(501, center, USER);

        expect(centers.save).not.toHaveBeenCalled();
        expect(centers.update).toHaveBeenCalledWith(
          { id: 31 },
          {
            is_active: true,
            is_primary: false,
            is_leading_result: false,
            last_updated_by: USER,
          },
        );
      });

      it('an existing ACTIVE row is left exactly as it is', async () => {
        const { svc, centers } = makeCenters({ id: 31, is_active: 1 });

        await svc.persistContributingCenter(501, center, USER);

        expect(centers.save).not.toHaveBeenCalled();
        expect(centers.update).not.toHaveBeenCalled();
      });
    });

    describe('handleCountries / subnationals (R-4: "an existing country with new subnationals -> written")', () => {
      const arrangeCountries = (existingCountryRow: any) => {
        const { service } = makeService({
          _clarisaCountriesRepository: {
            find: jest.fn().mockResolvedValue([{ id: 1 }]),
          },
          _clarisaSubnationalAreasRepository: {
            find: jest.fn().mockResolvedValue([{ code: 'S1' }]),
          },
          _resultCountryRepository: {
            updateCountries: jest.fn().mockResolvedValue(undefined),
            getResultCountrieByIdResultAndCountryId: jest
              .fn()
              .mockResolvedValue(existingCountryRow),
            save: jest.fn(async (rows: any[]) => {
              rows.forEach((r) => (r.result_country_id = 77));
              return rows;
            }),
          },
          _resultCountrySubnationalRepository: {
            bulkUpdateSubnational: jest.fn().mockResolvedValue(undefined),
            upsertSubnational: jest.fn().mockResolvedValue(undefined),
          },
        });
        const svc: any = service;
        return { svc, subnationals: svc._resultCountrySubnationalRepository };
      };

      it('resubmission (all countries): a country that ALREADY exists gets its subnationals written', async () => {
        const { svc, subnationals } = arrangeCountries({
          result_country_id: 33,
        });

        await svc.handleCountries(
          { id: 501 },
          [{ id: 1 }],
          [{ id: 9 }],
          5,
          USER,
          {
            writeSubnationalsForAllCountries: true,
          },
        );

        expect(subnationals.bulkUpdateSubnational).toHaveBeenCalledWith(
          33,
          ['S1'],
          USER,
        );
        expect(subnationals.upsertSubnational).toHaveBeenCalledWith(
          33,
          ['S1'],
          USER,
        );
      });

      it('NEW country: identical subnational writes with or without the option (the create path is unchanged)', async () => {
        const plain = arrangeCountries(undefined);
        const all = arrangeCountries(undefined);

        await plain.svc.handleCountries(
          { id: 501 },
          [{ id: 1 }],
          [{ id: 9 }],
          5,
          USER,
        );
        await all.svc.handleCountries(
          { id: 501 },
          [{ id: 1 }],
          [{ id: 9 }],
          5,
          USER,
          {
            writeSubnationalsForAllCountries: true,
          },
        );

        for (const { subnationals } of [plain, all]) {
          expect(subnationals.bulkUpdateSubnational.mock.calls).toEqual([
            [77, ['S1'], USER],
          ]);
          expect(subnationals.upsertSubnational.mock.calls).toEqual([
            [77, ['S1'], USER],
          ]);
        }
      });

      it('create path default: an existing country is NOT touched (behaviour unchanged for every other caller)', async () => {
        const { svc, subnationals } = arrangeCountries({
          result_country_id: 33,
        });

        await svc.handleCountries(
          { id: 501 },
          [{ id: 1 }],
          [{ id: 9 }],
          5,
          USER,
        );

        expect(subnationals.bulkUpdateSubnational).not.toHaveBeenCalled();
        expect(subnationals.upsertSubnational).not.toHaveBeenCalled();
      });
    });

    // The reset runs against an in-memory model of the tables; the writers are the REAL bs methods
    // writing into the same model, so "before 2, payload 1 -> 1 active" is a claim about both
    // halves together. A model, not MySQL: the behavioural proof is RSB-T-7.
    describe('reset + the real writers (rows left active)', () => {
      const RESULT = 501;
      const arrangeDb = (seed: Array<[EntityClass, Row[]]>) => {
        const db = createInMemoryDb(seed);
        const resubmission = new BilateralResubmissionService(db.dataSource);
        return { db, resubmission };
      };
      const activeLinks = (db: ReturnType<typeof createInMemoryDb>) =>
        db
          .rowsOf(Evidence)
          .filter((r) => r.result_id === RESULT && db.isActive(Evidence, r.id))
          .map((r) => r.link);

      it('EVIDENCE: two links before, one in the payload -> exactly one active (without the reset: three)', async () => {
        const { db, resubmission } = arrangeDb([
          [
            Evidence,
            [
              {
                id: 1,
                result_id: RESULT,
                link: 'https://x.org/old-1',
                is_active: 1,
              },
              {
                id: 2,
                result_id: RESULT,
                link: 'https://x.org/old-2',
                is_active: 1,
              },
            ],
          ],
        ]);
        const { service } = makeService({
          _evidencesRepository: {
            save: jest.fn(async (e: any) => {
              db.rowsOf(Evidence).push({ id: 3, ...e, is_active: 1 });
            }),
          },
          _evidencesService: {
            getHandleFromRegularLink: jest.fn(async (l: string) => l),
          },
          _resultsKnowledgeProductsRepository: {
            findOne: jest.fn().mockResolvedValue(null),
          },
        });
        const svc: any = service;

        await resubmission.resetSectionsForResubmission(RESULT, {
          userId: USER,
          resultTypeId: ResultTypeEnum.OTHER_OUTPUT,
          primaryChanged: false,
          payloadSendsPartners: true,
          // The pre-RSF-T-6 shape of these cases: no contributing_programs in the payload.
          contributorInitiativeIds: [],
        });
        await svc.handleEvidence(RESULT, [{ link: 'https://x.org/new' }], USER);

        expect(activeLinks(db)).toEqual(['https://x.org/new']);
      });

      it('PROJECTS: two before, the payload names one -> exactly one active, and its budget row is the new one', async () => {
        const { db, resubmission } = arrangeDb([
          [
            ResultsByProjects,
            [
              { id: 1, result_id: RESULT, project_id: 10, is_active: 1 },
              { id: 2, result_id: RESULT, project_id: 11, is_active: 1 },
            ],
          ],
          [
            NonPooledProjectBudget,
            [{ id: 5, result_project_id: 1, is_active: 1 }],
          ],
        ]);
        const { service } = makeService({
          _resultsByProjectsRepository: {
            save: jest.fn(async (row: any) => {
              const saved = { id: 3, ...row, is_active: 1 };
              db.rowsOf(ResultsByProjects).push(saved);
              return saved;
            }),
          },
        });
        const svc: any = service;

        await resubmission.resetSectionsForResubmission(RESULT, {
          userId: USER,
          resultTypeId: ResultTypeEnum.OTHER_OUTPUT,
          primaryChanged: false,
          payloadSendsPartners: true,
          // The pre-RSF-T-6 shape of these cases: no contributing_programs in the payload.
          contributorInitiativeIds: [],
        });
        await svc.handleNonPooledProject(
          RESULT,
          USER,
          [{ grant_title: 'P1', is_lead: true }],
          ResultTypeEnum.OTHER_OUTPUT,
          new Map([['P1', { id: 12 }]]),
        );

        const active = db
          .rowsOf(ResultsByProjects)
          .filter((r) => db.isActive(ResultsByProjects, r.id));
        expect(active.map((r) => r.project_id)).toEqual([12]);
        expect(db.isActive(NonPooledProjectBudget, 5)).toBe(false);
      });

      it('PARTNERS ({A,B} -> {C}): the reset leaves them to updateInstitutions, which gets exactly {C}; an existing C row is reused, so there is no duplicate C (call-level: the SQL replace is RSB-T-7)', async () => {
        const { db, resubmission } = arrangeDb([
          [
            ResultsByInstitution,
            [
              {
                id: 1,
                result_id: RESULT,
                institutions_id: 71,
                institution_roles_id: 2,
                is_active: 1,
              },
              {
                id: 2,
                result_id: RESULT,
                institutions_id: 72,
                institution_roles_id: 2,
                is_active: 1,
              },
              {
                id: 3,
                result_id: RESULT,
                institutions_id: 73,
                institution_roles_id: 2,
                is_active: 0,
              },
            ],
          ],
        ]);
        const institutions = {
          updateInstitutions: jest.fn().mockResolvedValue(undefined),
          getResultByInstitutionExists: jest.fn().mockResolvedValue({
            id: 3,
            institutions_id: 73,
            is_active: false,
          }),
          save: jest.fn(),
        };
        const { service } = makeService({
          _clarisaInstitutionsRepository: {
            findOne: jest.fn().mockResolvedValue({ id: 73 }),
            find: jest.fn().mockResolvedValue([]),
          },
          _resultByIntitutionsRepository: institutions,
        });
        const svc: any = service;

        await resubmission.resetSectionsForResubmission(RESULT, {
          userId: USER,
          resultTypeId: ResultTypeEnum.OTHER_OUTPUT,
          primaryChanged: false,
          payloadSendsPartners: true,
          // The pre-RSF-T-6 shape of these cases: no contributing_programs in the payload.
          contributorInitiativeIds: [],
        });
        await svc.handleInstitutions(
          RESULT,
          [{ institution_id: 73 }],
          USER,
          ResultTypeEnum.OTHER_OUTPUT,
        );

        // The reset did not touch A and B (the writer below deactivates them: it is replace-safe).
        expect(db.isActive(ResultsByInstitution, 1)).toBe(true);
        expect(institutions.updateInstitutions).toHaveBeenCalledWith(
          RESULT,
          [{ institutions_id: 73 }],
          USER,
          false,
          [2],
        );
        expect(institutions.save).not.toHaveBeenCalled();
      });

      it('PARTNERS the payload sends none -> no active partner is left (the reset deactivates them; handleInstitutions returns early)', async () => {
        const { db, resubmission } = arrangeDb([
          [
            ResultsByInstitution,
            [
              {
                id: 1,
                result_id: RESULT,
                institutions_id: 71,
                institution_roles_id: 2,
                is_active: 1,
              },
              {
                id: 2,
                result_id: RESULT,
                institutions_id: 72,
                institution_roles_id: 2,
                is_active: 1,
              },
            ],
          ],
        ]);
        const { service } = makeService();
        const svc: any = service;

        await resubmission.resetSectionsForResubmission(RESULT, {
          userId: USER,
          resultTypeId: ResultTypeEnum.OTHER_OUTPUT,
          primaryChanged: false,
          payloadSendsPartners: false,
          // The pre-RSF-T-6 shape of these cases: no contributing_programs in the payload.
          contributorInitiativeIds: [],
        });
        await svc.handleInstitutions(
          RESULT,
          [],
          USER,
          ResultTypeEnum.OTHER_OUTPUT,
        );

        expect(
          db
            .rowsOf(ResultsByInstitution)
            .filter((r) => db.isActive(ResultsByInstitution, r.id)),
        ).toEqual([]);
      });

      it('SUBNATIONALS: same country, same subnational S re-sent -> exactly ONE active S (real handleCountries + real repository logic over the model)', async () => {
        const { db, resubmission } = arrangeDb([
          [
            ResultCountry,
            [{ id: 1, result_country_id: 33, result_id: RESULT, is_active: 1 }],
          ],
          [
            ResultCountrySubnational,
            [
              {
                id: 1,
                result_country_id: 33,
                clarisa_subnational_scope_code: 'S1',
                geo_scope_role_id: 1,
                is_active: 1,
              },
            ],
          ],
        ]);
        // The REAL repository methods; only the two database primitives they use are modelled.
        // Each primitive acts when CALLED and resolves a tick later, like a query on a pool: that
        // is what lets a parallel read overtake a write issued by a sibling call.
        const rows = () => db.rowsOf(ResultCountrySubnational);
        const repo: any = Object.create(
          ResultCountrySubnationalRepository.prototype,
        );
        repo._handlersError = {
          returnErrorRepository: ({ error }: any) => error,
        };
        repo.query = async (sql: string, params: any[]) => {
          const [, rcId, role, ...codes] = params;
          const notIn = /not in/i.test(sql);
          for (const r of rows()) {
            if (r.result_country_id !== rcId || r.geo_scope_role_id !== role)
              continue;
            const listed = codes.includes(r.clarisa_subnational_scope_code);
            if (notIn && !listed && r.is_active === 1) r.is_active = 0;
            if (!notIn && listed) r.is_active = 1;
          }
          await Promise.resolve();
        };
        repo.findOneBy = async (where: any) => {
          const found = rows().find(
            (r) =>
              r.is_active === (where.is_active ? 1 : 0) &&
              r.result_country_id === where.result_country_id &&
              r.clarisa_subnational_scope_code ===
                where.clarisa_subnational_scope_code &&
              r.geo_scope_role_id === where.geo_scope_role_id,
          );
          await Promise.resolve();
          return found ?? null;
        };
        repo.save = async (toSave: any[]) => {
          toSave.forEach((r) =>
            rows().push({ id: rows().length + 1, ...r, is_active: 1 }),
          );
        };
        const { service } = makeService({
          _clarisaCountriesRepository: {
            find: jest.fn().mockResolvedValue([{ id: 1 }]),
          },
          _clarisaSubnationalAreasRepository: {
            find: jest.fn().mockResolvedValue([{ code: 'S1' }]),
          },
          _resultCountryRepository: {
            updateCountries: jest.fn().mockResolvedValue(undefined),
            getResultCountrieByIdResultAndCountryId: jest
              .fn()
              .mockResolvedValue({ result_country_id: 33 }),
          },
          _resultCountrySubnationalRepository: repo,
        });
        const svc: any = service;

        await resubmission.resetSectionsForResubmission(RESULT, {
          userId: USER,
          resultTypeId: ResultTypeEnum.OTHER_OUTPUT,
          primaryChanged: false,
          payloadSendsPartners: true,
          // The pre-RSF-T-6 shape of these cases: no contributing_programs in the payload.
          contributorInitiativeIds: [],
        });
        expect(rows().filter((r) => r.is_active === 1)).toEqual([]);
        await svc.handleCountries(
          { id: RESULT },
          [{ id: 1 }],
          [{ id: 9 }],
          5,
          USER,
          { writeSubnationalsForAllCountries: true },
        );

        const active = rows().filter((r) => r.is_active === 1);
        expect(active.map((r) => r.clarisa_subnational_scope_code)).toEqual([
          'S1',
        ]);
      });

      it('INNOVATION USE actors: before two actor types, the payload sends one -> one active (the REAL saveAnticipatedInnoUser writes into the same model)', async () => {
        const { db, resubmission } = arrangeDb([
          [
            ResultActor,
            [
              {
                id: 1,
                result_id: RESULT,
                actor_type_id: 1,
                section_id: 1,
                is_active: 1,
              },
              {
                id: 2,
                result_id: RESULT,
                actor_type_id: 2,
                section_id: 1,
                is_active: 1,
              },
            ],
          ],
        ]);
        // The real writer, over thin CRUD stand-ins for the actor repository (no writer logic here).
        const innovationUse: any = Object.create(
          InnovationUseService.prototype,
        );
        const sameWhere = (
          row: Record<string, any>,
          where: Record<string, any>,
        ) =>
          Object.entries(where).every(
            ([key, value]) =>
              (typeof value === 'boolean' ? Number(value) : value) === row[key],
          );
        innovationUse._resultActorRepository = {
          findOne: jest.fn(
            async ({ where }: any) =>
              db.rowsOf(ResultActor).find((r) => sameWhere(r, where)) ?? null,
          ),
          update: jest.fn(async (criteria: any, set: any) => {
            const where =
              typeof criteria === 'object' ? criteria : { id: criteria };
            db.rowsOf(ResultActor)
              .filter((r) => sameWhere(r, where))
              .forEach((r) => Object.assign(r, set));
          }),
          save: jest.fn(async (row: any) => {
            db.rowsOf(ResultActor).push({ id: 3, ...row, is_active: 1 });
          }),
        };

        await resubmission.resetSectionsForResubmission(RESULT, {
          userId: USER,
          resultTypeId: ResultTypeEnum.INNOVATION_USE,
          primaryChanged: false,
          payloadSendsPartners: true,
          // The pre-RSF-T-6 shape of these cases: no contributing_programs in the payload.
          contributorInitiativeIds: [],
        });
        await innovationUse.saveAnticipatedInnoUser(
          RESULT,
          USER,
          {
            actors: [{ actor_type_id: 1, men: 3 }],
            organization: [],
            measures: [],
          },
          1,
          false,
        );

        const activeActors = db
          .rowsOf(ResultActor)
          .filter((r) => db.isActive(ResultActor, r.id))
          .map((r) => r.actor_type_id);
        expect(activeActors).toEqual([1]);
      });
    });
  });

  // @akili-spec bilateral/resubmit-rejected-result — RSB-T-5 (RSB-R-1, R-3, R-4, R-14, R-15; DD-5,
  // DD-6; T-4 forward pointers 1, 2, 3, 5). What each member of the writers port really does. The
  // ORDER of the pipeline stages and what they do with the result are pinned in
  // `services/bilateral-resubmission.service.spec.ts`; here the REAL `BilateralService` helpers run.
  describe('resubmission writers port (RSB-T-5)', () => {
    const USER = 9;
    const SUBMITTER = 10;
    const STAR = { id: 12, acronym: 'STAR' };

    describe('writeResubmittedResult: the header in place, then every writer in the create order', () => {
      const dto = (): any => ({
        result_type_id: ResultTypeEnum.OTHER_OUTPUT,
        result_level_id: 3,
        title: 'Corrected title',
        description: 'Corrected description',
        geo_focus: {
          scope_code: 4,
          regions: [],
          countries: [{ id: 1 }],
          subnational_areas: [],
        },
        lead_center: { acronym: 'CIP' },
        toc_mapping: { science_program_id: 'SP06' },
        contributing_programs: [{ science_program_id: 'SP01' }],
        contributing_partners: [{ name: 'Partner' }],
        evidence: [{ link: 'https://example.org/a' }],
        contributing_bilateral_projects: [{ grant_title: 'P1' }],
        contributing_center: [{ acronym: 'ILRI' }],
        submitted_by: {
          email: 's@example.org',
          name: 'S',
          submitted_date: '2026-10-05',
          comment: 'second attempt',
        },
        created_by: { email: 'c@example.org' },
        external_reference: 'ext-1',
        keep_editing: true,
      });

      const arrange = () => {
        const { service } = makeService();
        const svc: any = service;
        const order: string[] = [];
        svc._resultRepository = {
          update: jest.fn(async () => {
            order.push('header.update');
          }),
          findOne: jest.fn(async () => {
            order.push('header.read');
            return { id: 501, status_id: 7, result_code: 28565 };
          }),
          save: jest.fn(async (row: any) => {
            order.push('result.save');
            return row;
          }),
        };
        const spy = (
          name: string,
          impl: (...a: any[]) => any = () => undefined,
        ) =>
          jest.spyOn(svc, name).mockImplementation(async (...a: any[]) => {
            order.push(name);
            return impl(...a);
          });
        spy('handleLeadCenter');
        spy('findScope', () => ({ id: 4 }));
        jest.spyOn(svc, 'validateGeoFocus').mockReturnValue(undefined);
        spy('handleRegions');
        spy('handleCountries');
        spy('handleTocMapping');
        spy('handleInstitutions');
        spy('handleEvidence');
        spy('handleNonPooledProject');
        spy('runResultTypeHandlers');
        spy('handleContributingCenters');
        spy('ensureDerivedContributingCenters');
        const args = (overrides: Record<string, unknown> = {}) => ({
          target: { id: 501, result_code: 28565 },
          bilateralDto: dto(),
          platform: STAR,
          userId: USER,
          submittedUserId: SUBMITTER,
          resolvedProjects: new Map([['P1', { id: 77 }]]),
          suppressPrimaryRole: false,
          ...overrides,
        });
        return { svc, order, args };
      };

      it('runs the header update, then the writers, in the order the no-code create runs them', async () => {
        const { svc, order, args } = arrange();

        await svc.writeResubmittedResult(args());

        expect(order).toEqual([
          'header.update',
          'header.read',
          'handleLeadCenter',
          'findScope',
          'handleRegions',
          'handleCountries',
          'result.save',
          'handleTocMapping',
          'handleInstitutions',
          'handleEvidence',
          'handleNonPooledProject',
          'runResultTypeHandlers',
          'handleContributingCenters',
          'ensureDerivedContributingCenters',
        ]);
      });

      it('T-4 pointer 1: the replace-safe options are passed to the lead centre and the countries writers (and ONLY there)', async () => {
        const { svc, args } = arrange();
        const payload = args();

        await svc.writeResubmittedResult(payload);

        expect(svc.handleLeadCenter).toHaveBeenCalledWith(
          501,
          payload.bilateralDto.lead_center,
          USER,
          { replacePreviousLead: true },
        );
        expect(svc.handleCountries).toHaveBeenCalledWith(
          expect.objectContaining({ id: 501 }),
          payload.bilateralDto.geo_focus.countries,
          payload.bilateralDto.geo_focus.subnational_areas,
          4,
          USER,
          { writeSubnationalsForAllCountries: true },
        );
      });

      it.each([
        [true, 'the primary changed: role 1 is suppressed'],
        [false, 'the same owner: role 1 is written'],
      ])(
        'DD-5: handleTocMapping gets suppressPrimaryRole=%s (%s)',
        async (suppressPrimaryRole) => {
          const { svc, args } = arrange();
          const payload = args({ suppressPrimaryRole });

          await svc.writeResubmittedResult(payload);

          expect(svc.handleTocMapping).toHaveBeenCalledWith(
            payload.bilateralDto.toc_mapping,
            payload.bilateralDto.contributing_programs,
            USER,
            501,
            ResultTypeEnum.OTHER_OUTPUT,
            { suppressPrimaryRole },
          );
        },
      );

      it('hands the other writers what the create hands them (user, resolved projects, lead centre)', async () => {
        const { svc, args } = arrange();
        const payload = args();
        const body = payload.bilateralDto;

        await svc.writeResubmittedResult(payload);

        expect(svc.handleInstitutions).toHaveBeenCalledWith(
          501,
          body.contributing_partners,
          USER,
          ResultTypeEnum.OTHER_OUTPUT,
        );
        expect(svc.handleEvidence).toHaveBeenCalledWith(
          501,
          body.evidence,
          USER,
        );
        expect(svc.handleNonPooledProject).toHaveBeenCalledWith(
          501,
          USER,
          body.contributing_bilateral_projects,
          ResultTypeEnum.OTHER_OUTPUT,
          payload.resolvedProjects,
        );
        expect(svc.runResultTypeHandlers).toHaveBeenCalledWith({
          resultId: 501,
          userId: USER,
          bilateralDto: body,
          isDuplicateResult: false,
        });
        expect(svc.handleContributingCenters).toHaveBeenCalledWith(
          501,
          body.contributing_center,
          USER,
          body.lead_center,
        );
        expect(svc.ensureDerivedContributingCenters).toHaveBeenCalledWith(
          501,
          USER,
        );
      });

      it('the header is updated IN PLACE: one update of the payload columns, never the status, the id, the code or the creator (keep_editing is ignored)', async () => {
        const { svc, args } = arrange();

        await svc.writeResubmittedResult(args());

        expect(svc._resultRepository.update).toHaveBeenCalledTimes(1);
        const [id, columns] = svc._resultRepository.update.mock.calls[0];
        expect(id).toBe(501);
        expect(columns).toEqual({
          title: 'Corrected title',
          description: 'Corrected description',
          result_level_id: 3,
          external_submitter: SUBMITTER,
          external_submitted_date: '2026-10-05',
          external_submitted_comment: 'second attempt',
          external_platform_id: 12,
          external_platform_code: 'STAR',
          external_reference: 'ext-1',
          last_updated_by: USER,
        });
        for (const forbidden of [
          'id',
          'status_id',
          'result_code',
          'created_by',
          'created_date',
          'version_id',
          'source',
          'creation_method',
        ]) {
          expect(columns).not.toHaveProperty(forbidden);
        }
      });

      it('a description the payload omits replaces the old one with NULL (the payload is the new truth); an absent submitter comment clears the old comment', async () => {
        const { svc, args } = arrange();
        const payload = args();
        delete payload.bilateralDto.description;
        payload.bilateralDto.submitted_by = { email: 's@example.org' };

        await svc.writeResubmittedResult(payload);

        const [, columns] = svc._resultRepository.update.mock.calls[0];
        expect(columns).toMatchObject({
          description: null,
          external_submitted_date: null,
          external_submitted_comment: null,
        });
      });

      it('the geographic scope is saved on the FRESH header (status stays what it was: the flip is not the writers job)', async () => {
        const { svc, args } = arrange();

        await svc.writeResubmittedResult(args());

        expect(svc._resultRepository.save).toHaveBeenCalledWith({
          id: 501,
          status_id: 7,
          result_code: 28565,
          geographic_scope_id: 4,
        });
      });

      // T-4 pointer 3 end to end: the REAL handleLeadCenter -> persistLeadCenter, with the demotion
      // failing. Before this task the error was swallowed and the writers ran on, leaving zero or
      // two lead centres with the result on its way to Pending Review.
      it('T-4 pointer 3: a lead-centre demotion that fails REJECTS the whole write: no geography, no ToC, nothing after it', async () => {
        const { svc, order, args } = arrange();
        (svc.handleLeadCenter as jest.Mock).mockRestore();
        svc._clarisaCenters = {
          findOne: jest.fn(async ({ where }: any) => ({
            code: where.code,
            institutionId: 0,
          })),
        };
        svc._resultRepository.query = jest
          .fn()
          .mockRejectedValue(new Error('demotion failed'));
        const payload = args();
        payload.bilateralDto.lead_center = { acronym: 'Bioversity (Alliance)' };

        await expect(svc.writeResubmittedResult(payload)).rejects.toThrow(
          'demotion failed',
        );

        expect(svc._resultRepository.query).toHaveBeenCalledTimes(1);
        for (const later of [
          'findScope',
          'handleCountries',
          'handleTocMapping',
          'handleInstitutions',
        ]) {
          expect(order).not.toContain(later);
        }
      });

      it('a writer that throws stops the sequence: nothing after it runs (the pipeline then leaves the result Rejected)', async () => {
        const { svc, order, args } = arrange();
        (svc.handleTocMapping as jest.Mock).mockRejectedValue(
          new Error('toc down'),
        );

        await expect(svc.writeResubmittedResult(args())).rejects.toThrow(
          'toc down',
        );

        expect(order).not.toContain('handleInstitutions');
        expect(order).not.toContain('ensureDerivedContributingCenters');
      });
    });

    // @akili-spec bilateral/resubmit-rejected-result — RSB-T-5 attempt 2 (Reviewer A FAIL, decided by
    // Juan David Delgado): the lead-program investment of an OWNERLESS resubmission lives on an
    // INACTIVE role-1 row (the budget row itself is ACTIVE). The REAL writer, the REAL
    // `PrimaryProgramRequestService.accept` / `decline` and the REAL bilateral budget reader run over
    // the same in-memory rows. A MODEL of the database, not MySQL (RSB-T-7).
    describe('lead-program investment on the ownerless branch (T-5 attempt 2)', () => {
      const RESULT = 501;
      const SP06 = 6;
      const USER_ID = 9;
      const PK = new Map<EntityClass, string>([
        [ShareResultRequest, 'share_result_request_id'],
        [ResultInitiativeBudget, 'result_initiative_budget_id'],
        [ResultsTocResult, 'result_toc_result_id'],
      ]);

      const arrange = (seedRoles: Row[] = []) => {
        const db = createInMemoryDb(
          [
            [ResultsByInititiative, seedRoles],
            [ResultInitiativeBudget, []],
            [
              ShareResultRequest,
              [
                {
                  share_result_request_id: 40,
                  result_id: RESULT,
                  request_type: 'primary',
                  request_status_id: 1,
                  shared_inititiative_id: SP06,
                  owner_initiative_id: SP06,
                  is_active: 1,
                },
              ],
            ],
            [Result, [{ id: RESULT, status_id: 5, is_active: 1 }]],
            [ResultReviewHistory, []],
            [ResultsTocResult, []],
          ],
          { writes: true, pk: PK },
        );
        const { service, stubs: typedStubs } = makeService();
        const stubs: any = typedStubs;
        const svc: any = service;
        stubs.clarisaInitiatives.findOne.mockResolvedValue({
          id: SP06,
          official_code: 'SP06',
          active: true,
          name: 'Six',
        });
        svc._resultByInitiativesRepository = db.repositoryOf(
          ResultsByInititiative,
        );
        svc._resultsTocResultsRepository = {
          findOne: jest.fn().mockResolvedValue(null),
          save: jest.fn().mockResolvedValue({ result_toc_result_id: 555 }),
        };
        svc.dataSource = {
          getRepository: (entity: EntityClass) => db.repositoryOf(entity),
        };
        // The budget READER the bilateral GET / list / sync payloads use, over the same model:
        // projects, partners and evidence are empty.
        svc._resultsByProjectsRepository = { find: async () => [] };
        svc._resultByIntitutionsRepository = { find: async () => [] };
        svc._evidencesRepository = { find: async () => [] };

        const ppr = new PrimaryProgramRequestService(
          {
            ...db.repositoryOf(ShareResultRequest),
            manager: {
              transaction: (work: any) => db.dataSource.transaction(work),
            },
          } as any,
          {
            findOne: async ({ where }: any) => ({
              id: where.id,
              official_code: 'SP06',
            }),
          } as any,
          undefined as any,
          undefined as any,
          { isUserAdmin: jest.fn().mockResolvedValue(true) } as any,
          {
            getAllResultsCenterByResultId: jest.fn().mockResolvedValue([]),
          } as any,
          undefined as any,
          undefined as any,
          undefined as any,
          undefined as any,
          undefined as any,
          undefined as any,
          undefined as any,
          undefined as any,
        );
        ['log', 'warn', 'error'].forEach((level) =>
          jest
            .spyOn((ppr as any).logger, level)
            .mockImplementation(() => undefined),
        );

        const write = (toc: Record<string, unknown> = { usd_budget: 1500 }) =>
          svc.handleTocMapping(
            { science_program_id: 'SP06', ...toc },
            [],
            USER_ID,
            RESULT,
            ResultTypeEnum.INNOVATION_DEVELOPMENT,
            { suppressPrimaryRole: true },
          );
        const roleRows = () =>
          db
            .rowsOf(ResultsByInititiative)
            .filter((r) => r.initiative_role_id === 1);
        const activeOwner = () =>
          roleRows().filter((r) => db.isActive(ResultsByInititiative, r.id));
        /** The bilateral read model (GET /:id, /list, /results): budgets of ACTIVE initiative rows. */
        const readBudgets = async () =>
          (await svc.buildInnovationSharedBudgetAndEvidenceExtras(RESULT))
            .initiative_budget;
        return { db, svc, ppr, write, roleRows, activeOwner, readBudgets };
      };

      it('(a) the investment is stored on ONE INACTIVE role-1 row; the budget row is ACTIVE; nothing is visible while it is ownerless', async () => {
        const t = arrange();

        await t.write();

        expect(t.roleRows()).toHaveLength(1);
        expect(t.roleRows()[0]).toMatchObject({
          initiative_id: SP06,
          initiative_role_id: 1,
          is_active: 0,
        });
        const budgets = t.db.rowsOf(ResultInitiativeBudget);
        expect(budgets).toHaveLength(1);
        expect(budgets[0]).toMatchObject({
          result_initiative_id: t.roleRows()[0].id,
          kind_cash: 1500,
          is_active: 1,
        });
        // Ownerless: no active role 1, and the read model shows no amount.
        expect(t.activeOwner()).toEqual([]);
        await expect(t.readBudgets()).resolves.toEqual([]);
      });

      it('(a) writing twice (a retry) finds the SAME role-1 row and the SAME budget: no duplicates', async () => {
        const t = arrange();

        await t.write({ usd_budget: 1500 });
        await t.write({ usd_budget: 2000 });

        expect(t.roleRows()).toHaveLength(1);
        expect(t.db.rowsOf(ResultInitiativeBudget)).toHaveLength(1);
        expect(t.db.rowsOf(ResultInitiativeBudget)[0].kind_cash).toBe(2000);
      });

      it('(b) an existing ACTIVE role-2 row of the same SP is NOT converted: a separate inactive role-1 row carries the budget, and the budget is not on the role-2 row', async () => {
        const t = arrange([
          {
            id: 7,
            result_id: RESULT,
            initiative_id: SP06,
            initiative_role_id: 2,
            is_active: 1,
          },
        ]);

        await t.write();

        const role2 = t.db
          .rowsOf(ResultsByInititiative)
          .find((r) => r.id === 7);
        expect(role2).toMatchObject({ initiative_role_id: 2, is_active: 1 });
        const role1 = t.roleRows();
        expect(role1).toHaveLength(1);
        expect(role1[0].id).not.toBe(7);
        expect(role1[0].is_active).toBe(0);
        expect(
          t.db
            .rowsOf(ResultInitiativeBudget)
            .map((b) => b.result_initiative_id),
        ).toEqual([role1[0].id]);
      });

      it('(b) a FORMER role-1 row of that SP is reused (not duplicated) and stays inactive', async () => {
        const t = arrange([
          {
            id: 8,
            result_id: RESULT,
            initiative_id: SP06,
            initiative_role_id: 1,
            is_active: 0,
          },
        ]);

        await t.write();

        expect(t.roleRows().map((r) => r.id)).toEqual([8]);
        expect(t.roleRows()[0].is_active).toBe(0);
        expect(
          t.db.rowsOf(ResultInitiativeBudget)[0].result_initiative_id,
        ).toBe(8);
      });

      // @akili-spec bilateral/resubmit-followups RSF-T-2 (RSF-R-8): the consumer-facing budget reader
      // must keep filtering the PARENT row. Falsifier: a reader that drops the parent `is_active`
      // filter would surface 777 from the retired owner row.
      it('RSF-R-8: an ACTIVE budget under an INACTIVE parent row never surfaces; the active role-2 row keeps its own', async () => {
        const t = arrange([
          {
            id: 8,
            result_id: RESULT,
            initiative_id: SP06,
            initiative_role_id: 1,
            is_active: 0,
          },
          {
            id: 9,
            result_id: RESULT,
            initiative_id: 11,
            initiative_role_id: 2,
            is_active: 1,
          },
        ]);
        const budgets = t.db.repositoryOf(ResultInitiativeBudget);
        await budgets.save({
          result_initiative_id: 8,
          kind_cash: 777,
          is_active: 1,
        });
        await budgets.save({
          result_initiative_id: 9,
          kind_cash: 55,
          is_active: 1,
        });

        const readback = await t.readBudgets();

        expect(readback).toHaveLength(1);
        expect(readback[0]).toMatchObject({ kind_cash: 55 });
        expect(JSON.stringify(readback)).not.toContain('777');
      });

      it('(c) the REAL accept reactivates that row and the amount appears (usd_budget 1500 on the reactivated owner row)', async () => {
        const t = arrange();
        await t.write();

        const outcome = await t.ppr.accept(40, { id: 55 } as any);

        expect(outcome).toMatchObject({ ok: true, state: 'accepted' });
        // Still ONE role-1 row, now active: accept found it without an is_active filter.
        expect(t.roleRows()).toHaveLength(1);
        expect(t.activeOwner().map((r) => r.initiative_id)).toEqual([SP06]);
        const readback = await t.readBudgets();
        expect(readback).toHaveLength(1);
        expect(readback[0]).toMatchObject({ kind_cash: 1500 });
        expect(t.db.rowsOf(ResultInitiativeBudget)).toHaveLength(1);
      });

      it('(c) with an accepted role-2 row of that SP in the way, accept retires the role-2 row and the budget still lands on the reactivated role-1 row', async () => {
        const t = arrange([
          {
            id: 7,
            result_id: RESULT,
            initiative_id: SP06,
            initiative_role_id: 2,
            is_active: 1,
          },
        ]);
        await t.write();

        await t.ppr.accept(40, { id: 55 } as any);

        expect(t.db.isActive(ResultsByInititiative, 7)).toBe(false);
        const readback = await t.readBudgets();
        expect(readback).toHaveLength(1);
        expect(readback[0]).toMatchObject({ kind_cash: 1500 });
      });

      it('(d) SP06 DECLINES: the REAL decline rejects the result; no role 1 is active anywhere and the amount surfaces in NO reader (budget payloads, owner lookup)', async () => {
        const t = arrange();
        await t.write();

        const outcome = await t.ppr.decline(40, { id: 55 } as any, 'not ours');

        expect(outcome).toMatchObject({ ok: true, state: 'rejected' });
        expect(t.db.rowsOf(Result)[0].status_id).toBe(7);
        // Ownership checks read ACTIVE role 1 (getOwnerInitiativeByResult: `is_active > 0`).
        expect(t.activeOwner()).toEqual([]);
        // The row and its ACTIVE budget are still there, but hidden by the inactive parent.
        expect(t.roleRows()).toHaveLength(1);
        expect(t.db.rowsOf(ResultInitiativeBudget)[0].is_active).toBe(1);
        await expect(t.readBudgets()).resolves.toEqual([]);
        // The filter every other reader applies (the parent's is_active first, then the budget by the
        // surviving parent ids), replayed over the rows.
        const visibleParents = t.db
          .rowsOf(ResultsByInititiative)
          .filter(
            (r) =>
              r.result_id === RESULT &&
              t.db.isActive(ResultsByInititiative, r.id),
          )
          .map((r) => r.id);
        expect(
          t.db
            .rowsOf(ResultInitiativeBudget)
            .filter((b) => visibleParents.includes(b.result_initiative_id)),
        ).toEqual([]);
      });
    });

    describe('the port members', () => {
      it('readOwnerInitiativeId reads the active role-1 owner and answers null when there is none', async () => {
        const { service, stubs: typedStubs } = makeService();
        const stubs: any = typedStubs;
        const svc: any = service;
        stubs.resultByInitiativesRepository.getOwnerInitiativeByResult = jest
          .fn()
          .mockResolvedValueOnce({ id: 6, official_code: 'SP06' })
          .mockResolvedValueOnce(undefined);
        const port = svc.buildResubmissionWritersPort();

        await expect(port.readOwnerInitiativeId(501)).resolves.toBe(6);
        await expect(port.readOwnerInitiativeId(501)).resolves.toBeNull();
        expect(
          stubs.resultByInitiativesRepository.getOwnerInitiativeByResult,
        ).toHaveBeenCalledWith(501);
      });

      it('RRC-T-6: transferPrimary assigns the primary DIRECTLY (releaseContributors:true) THROUGH THE GIVEN TRANSACTION MANAGER, in the name of the audit user, with a NUMERIC id, and returns its outcome untouched; it never sends a request', async () => {
        const { service, stubs } = makeService();
        const svc: any = service;
        const outcome = { outcome: 'transferred', previousInitiativeId: null };
        stubs.primaryProgramRequestService.transferPrimary.mockResolvedValue(
          outcome,
        );
        stubs.primaryProgramRequestService.request.mockClear();
        const port = svc.buildResubmissionWritersPort();

        const manager = { marker: 'tx' };
        // A string id (as an unconverted CLARISA id could be) must reach the core as a number.
        await expect(
          port.transferPrimary(501, '6', USER, manager),
        ).resolves.toBe(outcome);

        expect(
          stubs.primaryProgramRequestService.transferPrimary,
        ).toHaveBeenCalledWith(501, 6, { id: USER }, manager, {
          releaseContributors: true,
        });
        expect(
          stubs.primaryProgramRequestService.request,
        ).not.toHaveBeenCalled();
      });

      it('announcePendingReview delegates to the shared orchestrator (never the emitter directly)', async () => {
        const { service } = makeService();
        const svc: any = service;
        const announce = jest
          .spyOn(svc, 'announcePendingReview')
          .mockResolvedValue(undefined);
        const emit = jest.spyOn(svc, 'emitBilateralSubmittedNotification');
        const port = svc.buildResubmissionWritersPort();

        await port.announcePendingReview(501, SUBMITTER);

        expect(announce).toHaveBeenCalledWith(501, SUBMITTER);
        expect(emit).not.toHaveBeenCalled();
      });
    });

    // T-4 forward pointer 2 (gap a). `handleInstitutions` returns EARLY when none of the sent
    // partners resolves, so it never deactivates the stale PARTNER rows. The reset has to, and it
    // can only know from the partners that RESOLVE, not from the raw payload.
    describe('countResolvablePartners (T-4 pointer 2)', () => {
      const arrange = (resolve: (where: any) => any) => {
        const { service } = makeService({
          _clarisaInstitutionsRepository: {
            findOne: jest.fn(async ({ where }: any) => resolve(where)),
            find: jest.fn(async () => []),
          },
        });
        return service as any;
      };

      it('no partners, or an empty list: 0, without a single CLARISA lookup', async () => {
        const svc = arrange(() => ({ id: 1 }));

        await expect(
          svc.countResolvablePartners({ contributing_partners: undefined }),
        ).resolves.toBe(0);
        await expect(
          svc.countResolvablePartners({ contributing_partners: [] }),
        ).resolves.toBe(0);

        expect(
          svc._clarisaInstitutionsRepository.findOne,
        ).not.toHaveBeenCalled();
        expect(svc._clarisaInstitutionsRepository.find).not.toHaveBeenCalled();
      });

      it('partners SENT but none resolves in CLARISA: 0 (so the reset deactivates the stale ones), while handleInstitutions writes nothing', async () => {
        const svc = arrange(() => null);
        const partners = [{ name: 'Nobody Inc.' }, { institution_id: 999 }];

        await expect(
          svc.countResolvablePartners({
            contributing_partners: partners,
            result_type_id: ResultTypeEnum.OTHER_OUTPUT,
          }),
        ).resolves.toBe(0);

        // The writer's early return is exactly why the reset has to do the deactivation.
        await svc.handleInstitutions(
          501,
          partners,
          USER,
          ResultTypeEnum.OTHER_OUTPUT,
        );
        expect(
          svc._resultByIntitutionsRepository.updateInstitutions,
        ).not.toHaveBeenCalled();
      });

      it('counts each RESOLVED institution once, however many payload entries point at it', async () => {
        const svc = arrange((where) =>
          where.id === 73 || where.id === 74 ? { id: where.id } : null,
        );

        await expect(
          svc.countResolvablePartners({
            contributing_partners: [
              { institution_id: 73 },
              { institution_id: 73 },
              { institution_id: 74 },
              { institution_id: 999 },
            ],
            result_type_id: ResultTypeEnum.OTHER_OUTPUT,
          }),
        ).resolves.toBe(2);
      });
    });

    // T-4 forward pointer 3 (gap c). A failed demotion of the previous lead leaves zero or two
    // leads; on the resubmission it must reject so the result stays Rejected and retryable (DD-3).
    // The create path keeps swallowing exactly as it always did.
    describe('persistLeadCenter: errors (T-4 pointer 3)', () => {
      const center = { code: 'CENTER-02', institutionId: 0 } as any;
      const arrange = () => {
        const { service } = makeService({
          _resultRepository: {
            query: jest.fn().mockRejectedValue(new Error('demotion failed')),
          },
          _resultsCenterRepository: {
            getAllResultsCenterByResultIdAndCenterId: jest
              .fn()
              .mockResolvedValue(null),
            save: jest.fn(async (row: any) => row),
          },
        });
        return service as any;
      };

      it('replacePreviousLead: a failed demotion REJECTS (and nothing is saved after it)', async () => {
        const svc = arrange();

        await expect(
          svc.persistLeadCenter(501, center, USER, {
            replacePreviousLead: true,
          }),
        ).rejects.toThrow('demotion failed');

        expect(svc._resultsCenterRepository.save).not.toHaveBeenCalled();
      });

      it('the create path (no option) keeps swallowing the same failure and logging it', async () => {
        const svc = arrange();
        svc._resultRepository.query.mockRejectedValue(new Error('db hiccup'));
        svc._resultsCenterRepository.getAllResultsCenterByResultIdAndCenterId =
          jest.fn().mockRejectedValue(new Error('db hiccup'));

        await expect(
          svc.persistLeadCenter(501, center, USER),
        ).resolves.toBeUndefined();

        expect(svc.logger.error).toHaveBeenCalledWith(
          expect.stringContaining('Failed to save lead center for result 501'),
          expect.anything(),
        );
      });
    });

    // DD-5 / DD-6. On the ownerless branch the writers do not write role 1 (accept does), but the
    // ToC row and the contributor drafts still hang off the REQUESTED primary.
    describe('handleTocMapping: suppressPrimaryRole (DD-5, DD-6)', () => {
      const arrange = () => {
        const { service, stubs: typedStubs } = makeService();
        const stubs: any = typedStubs;
        const svc: any = service;
        const initiatives: Record<string, any> = {
          SP06: { id: 6, official_code: 'SP06', active: true, name: 'Six' },
          SP01: { id: 1, official_code: 'SP01', active: true, name: 'One' },
        };
        stubs.clarisaInitiatives.findOne.mockImplementation(
          async ({ where }: any) => initiatives[where.official_code] ?? null,
        );
        stubs.resultByInitiativesRepository.findOne.mockResolvedValue(null);
        stubs.resultByInitiativesRepository.update = jest
          .fn()
          .mockResolvedValue(undefined);
        stubs.resultByInitiativesRepository.save = jest
          .fn()
          .mockResolvedValue({});
        stubs.resultsTocResultsRepository.findOne = jest
          .fn()
          .mockResolvedValue(null);
        stubs.resultsTocResultsRepository.save = jest
          .fn()
          .mockResolvedValue({ result_toc_result_id: 555 });
        return { svc, stubs };
      };
      const toc = () => ({ science_program_id: 'SP06' });
      const contributors = () => [{ science_program_id: 'SP01' }];

      it('suppressed: no ACTIVE role 1 is written (an INACTIVE one is), the ToC row is written for the requested primary, and the contributor draft (status 4) is owned by the requested primary', async () => {
        const { svc, stubs } = arrange();

        await svc.handleTocMapping(toc(), contributors(), USER, 501, 8, {
          suppressPrimaryRole: true,
        });

        // Ownership is untouched: nothing is activated, nothing is updated.
        expect(
          stubs.resultByInitiativesRepository.update,
        ).not.toHaveBeenCalled();
        const roleRows =
          stubs.resultByInitiativesRepository.save.mock.calls.map(
            (call: any[]) => call[0],
          );
        expect(roleRows).toEqual([
          expect.objectContaining({
            result_id: 501,
            initiative_id: 6,
            initiative_role_id: 1,
            is_active: false,
          }),
        ]);
        expect(stubs.resultsTocResultsRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            result_id: 501,
            initiative_id: 6,
            initiative_ids: 6,
          }),
        );
        // DD-6: the contributor is a CONTRIBUTION draft (status 4) whose owner is the requested SP.
        expect(svc._shareResultRequestRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            result_id: 501,
            owner_initiative_id: 6,
            shared_inititiative_id: 1,
            approving_inititiative_id: 1,
            request_status_id: 4,
            requested_by: USER,
            is_active: true,
          }),
        );
      });

      it.each([
        ['the option is false', { suppressPrimaryRole: false }],
        ['there is no option (the create path)', undefined],
      ])(
        'role 1 IS written when %s, and the contributor draft is the same one',
        async (_label, options) => {
          const { svc, stubs } = arrange();

          await svc.handleTocMapping(
            toc(),
            contributors(),
            USER,
            501,
            8,
            ...(options ? [options] : []),
          );

          expect(stubs.resultByInitiativesRepository.save).toHaveBeenCalledWith(
            expect.objectContaining({
              result_id: 501,
              initiative_id: 6,
              initiative_role_id: 1,
              is_active: true,
            }),
          );
          expect(svc._shareResultRequestRepository.save).toHaveBeenCalledWith(
            expect.objectContaining({
              owner_initiative_id: 6,
              shared_inititiative_id: 1,
              request_status_id: 4,
            }),
          );
        },
      );
    });
  });
});
