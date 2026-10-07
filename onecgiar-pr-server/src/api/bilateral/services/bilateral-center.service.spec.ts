import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BilateralCenterService } from './bilateral-center.service';
import { BilateralProjectsService } from './bilateral-projects.service';
import { BilateralService } from '../bilateral.service';
import { VersioningService } from '../../versioning/versioning.service';
import { ResultRepository } from '../../results/result.repository';
import { ResultByLevelRepository } from '../../results/result-by-level/result-by-level.repository';
import { YearRepository } from '../../results/years/year.repository';
import { ResultsTocResultsService } from '../../results/results-toc-results/results-toc-results.service';
import { ResultsTocResultRepository } from '../../results/results-toc-results/repositories/results-toc-results.repository';
import { ResultByInitiativesRepository } from '../../results/results_by_inititiatives/resultByInitiatives.repository';
import { ClarisaInitiativesRepository } from '../../../clarisa/clarisa-initiatives/ClarisaInitiatives.repository';
import { ClarisaCentersRepository } from '../../../clarisa/clarisa-centers/clarisa-centers.repository';
import { ClarisaInstitutionsRepository } from '../../../clarisa/clarisa-institutions/ClariasaInstitutions.repository';
import { ResultsCenterRepository } from '../../results/results-centers/results-centers.repository';
import { ResultsByProjectsRepository } from '../../results/results_by_projects/results_by_projects.repository';
import { ResultsByProjectsService } from '../../results/results_by_projects/results_by_projects.service';
import { ResultsKnowledgeProductsService } from '../../results/results-knowledge-products/results-knowledge-products.service';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { SourceEnum } from '../../results/entities/result.entity';
import { RoleByUserRepository } from '../../../auth/modules/role-by-user/RoleByUser.repository';
import { ResultStatusData } from '../../../shared/constants/result-status.enum';
import { ResultByIntitutionsRepository } from '../../results/results_by_institutions/result_by_intitutions.repository';
import { ResultsKnowledgeProductsRepository } from '../../results/results-knowledge-products/repositories/results-knowledge-products.repository';
import { ShareResultRequestRepository } from '../../results/share-result-request/share-result-request.repository';
import { InstitutionRoleEnum } from '../../results/results_by_institutions/entities/institution_role.enum';
import { InnovationUseMdsValidator } from './innovation-use-mds-validator.service';
import { BilateralQualityAssessmentService } from './quality-assessment/bilateral-quality-assessment.service';
import { BilateralQualityAssessmentRepository } from '../repositories/bilateral-quality-assessment.repository';
import { ResultTypeEnum } from '../../../shared/constants/result-type.enum';
import { AoWBilateralRepository } from '../../results/results-toc-results/repositories/aow-bilateral.repository';
import { BilateralAccessService } from '../../results/bilateral-access/bilateral-access.service';
import { ResultsInnovationsUseRepository } from '../../results/summary/repositories/results-innovations-use.repository';
import {
  ResultFieldRevision,
  ResultFieldRevisionFieldName,
  ResultFieldRevisionProvenance,
} from '../../ai/entities/result-field-revision.entity';
import {
  PrimaryProgramRequestService,
  PrimaryRequestStateEnum,
} from '../../results/share-result-request/services/primary-program-request.service';
import {
  RequestTypeEnum,
  ShareResultRequest,
} from '../../results/share-result-request/entities/share-result-request.entity';
import { ResultsByInititiative } from '../../results/results_by_inititiatives/entities/results_by_inititiative.entity';
import { ResultsByProjects } from '../../results/results_by_projects/entities/results_by_projects.entity';
import { ResultsTocResult } from '../../results/results-toc-results/entities/results-toc-result.entity';
import {
  ResultReviewHistory,
  ReviewActionEnum,
} from '../../results/result-review-history/entities/result-review-history.entity';
import {
  createInMemoryDb,
  EntityClass,
  Row,
} from '../../../shared/test/in-memory-db.test-helper';

describe('BilateralCenterService', () => {
  let service: BilateralCenterService;
  let module: TestingModule;
  let versioningService: VersioningService;
  let resultRepository: ResultRepository;
  let resultByLevelRepository: ResultByLevelRepository;
  let yearRepository: YearRepository;
  let bilateralProjectsService: BilateralProjectsService;
  let bilateralService: BilateralService;
  let resultsKnowledgeProductsService: ResultsKnowledgeProductsService;
  let bilateralAccessService: BilateralAccessService;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        BilateralCenterService,
        {
          provide: BilateralProjectsService,
          useValue: {
            getProjectsByCenter: jest.fn().mockResolvedValue({ projects: [] }),
            resolveProjectLeadCenter: jest.fn().mockResolvedValue(null),
          },
        },
        {
          provide: BilateralService,
          useValue: {
            handleLeadCenter: jest.fn().mockResolvedValue(undefined),
            // 2026-09-05: submitForReview announces the arrival to the primary SP post-commit.
            emitBilateralSubmittedNotification: jest
              .fn()
              .mockResolvedValue(undefined),
            // BCT-T-5: `submitForReview` now calls the orchestrator instead of the submitted
            // emitter directly. Its own behaviour (submitted → tagging, independent try/catch) is
            // unit-tested against the real `BilateralService` in `bilateral.service.spec.ts`;
            // here it is a no-op stub.
            announcePendingReview: jest.fn().mockResolvedValue(undefined),
            // BCT-T-3: `saveContributors` calls this after the sync* block, only when the DTO
            // touched `contributing_bilateral_projects`. Its own behaviour is unit-tested against
            // the real `BilateralService` in `bilateral.service.spec.ts`; here it is a no-op stub.
            ensureDerivedContributingCenters: jest
              .fn()
              .mockResolvedValue(undefined),
          },
        },
        {
          provide: VersioningService,
          useValue: {
            $_findActivePhase: jest.fn().mockResolvedValue({ id: 1 }),
          },
        },
        {
          provide: ResultRepository,
          useValue: {
            save: jest.fn().mockResolvedValue({
              id: 99,
              result_level_id: 2,
              result_type_id: 6,
              source: SourceEnum.Bilateral,
              status_id: 1,
            }),
            update: jest.fn().mockResolvedValue({}),
            // Re-read after the insert. `result_code` is assigned by the `result_auto_code` trigger,
            // so a realistic row carries a real code here — the 0 passed to save() is a placeholder.
            findOne: jest.fn().mockResolvedValue({
              id: 99,
              result_code: 8852,
              version_id: 1,
            }),
            query: jest.fn().mockResolvedValue([]),
            // P2-3157: submitForReview wraps its writes in a transaction.
            manager: {
              transaction: jest.fn(async (cb: any) =>
                cb({
                  findOne: jest.fn().mockResolvedValue({ id: 99 }),
                  update: jest.fn().mockResolvedValue({}),
                  create: jest.fn((_entity, payload) => payload),
                  save: jest.fn().mockResolvedValue({}),
                  query: jest.fn().mockResolvedValue({}),
                }),
              ),
            },
          },
        },
        {
          provide: ResultByLevelRepository,
          useValue: {
            getByTypeAndLevel: jest.fn().mockResolvedValue({ id: 1 }),
          },
        },
        {
          provide: YearRepository,
          useValue: {
            findOne: jest.fn().mockResolvedValue({ year: 2025 }),
          },
        },
        {
          provide: ResultsTocResultsService,
          useValue: {
            updatePlannedResult: jest.fn().mockResolvedValue({}),
            updateTocResultPartial: jest.fn().mockResolvedValue({}),
            getTocResultTypologyVerdicts: jest
              .fn()
              .mockResolvedValue(new Map()),
          },
        },
        {
          provide: ResultsTocResultRepository,
          useValue: {
            findOne: jest.fn(),
            find: jest.fn().mockResolvedValue([]),
            save: jest.fn().mockResolvedValue({}),
            update: jest.fn().mockResolvedValue({}),
            create: jest.fn().mockImplementation((dto) => ({ ...dto })),
            delete: jest.fn(),
            query: jest.fn(),
          },
        },
        {
          provide: AoWBilateralRepository,
          useValue: {
            findLeadProjectId: jest.fn().mockResolvedValue(null),
            findProjectTocLinkage: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: ResultByInitiativesRepository,
          useValue: {
            getOwnerInitiativeByResult: jest.fn().mockResolvedValue({ id: 1 }),
            save: jest.fn().mockResolvedValue({}),
            find: jest.fn().mockResolvedValue([]),
            update: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: ClarisaInitiativesRepository,
          useValue: {
            findOne: jest.fn(),
          },
        },
        // 2026-09-04: the centre form stages contributing programs as share-request DRAFTS
        // (status 4) so the approval can convert them into the accept/decline request (P2-3187).
        {
          provide: ShareResultRequestRepository,
          useValue: {
            find: jest.fn().mockResolvedValue([]),
            findOne: jest.fn().mockResolvedValue(null),
            save: jest.fn().mockResolvedValue({}),
            update: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: ClarisaCentersRepository,
          useValue: {
            find: jest.fn().mockResolvedValue([]),
          },
        },
        {
          /**
           * P2-3428 added InnovationUseMdsValidator as the service's last constructor dependency
           * without registering it here, so Nest could not build the service at all and every case
           * in this file failed with "can't resolve dependencies … at index [20]".
           *
           * Stubbed rather than provided for real: BilateralCenterService only holds the reference
           * and never calls it, and what the validator does is covered by
           * innovation-use-mds-validator.service.spec.ts. The two methods are mocked so that a
           * future call site fails loudly here instead of hitting undefined.
           */
          provide: InnovationUseMdsValidator,
          useValue: {
            assertExternalCreateMds: jest.fn().mockResolvedValue(undefined),
            assertPersistedMds: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ClarisaInstitutionsRepository,
          useValue: {
            findOne: jest.fn(),
            find: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: ResultsCenterRepository,
          useValue: {
            findOne: jest.fn().mockResolvedValue(null),
            find: jest.fn().mockResolvedValue([]),
            save: jest.fn().mockResolvedValue({}),
            update: jest.fn().mockResolvedValue({}),
            updateCenter: jest.fn().mockResolvedValue({}),
            getAllResultsCenterByResultIdAndCenterId: jest
              .fn()
              .mockResolvedValue(undefined),
            getAllResultsCenterByResultId: jest
              .fn()
              .mockResolvedValue([{ code: 'CIAT', is_leading_result: 1 }]),
          },
        },
        {
          provide: RoleByUserRepository,
          useValue: {
            validationCenterPermissions: jest.fn().mockResolvedValue(1),
            isUserAdmin: jest.fn().mockResolvedValue(false),
          },
        },
        {
          provide: ResultsByProjectsRepository,
          useValue: {
            findOne: jest.fn().mockResolvedValue(null),
            save: jest.fn().mockResolvedValue({}),
            update: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: ResultsByProjectsService,
          useValue: {
            syncBilateralProjects: jest.fn().mockResolvedValue({
              status: 200,
              message: 'ok',
              response: { set_active: [], deactivated: [] },
            }),
          },
        },
        {
          provide: ResultsKnowledgeProductsService,
          useValue: {
            populateKPFromCGSpace: jest.fn().mockResolvedValue({}),
            validateBilateralKPHandle: jest
              .fn()
              .mockResolvedValue({ title: 'KP', description: 'Metadata' }),
            populateBilateralKPFromMetadata: jest.fn().mockResolvedValue({}),
          },
        },
        // P2-3443 — external partners live in `results_by_institution`, same table pool funding uses.
        {
          provide: ResultByIntitutionsRepository,
          useValue: {
            find: jest.fn().mockResolvedValue([]),
            save: jest.fn().mockResolvedValue({}),
            update: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: ResultsKnowledgeProductsRepository,
          useValue: {
            findOne: jest.fn().mockResolvedValue(null),
          },
        },
        // @akili-spec bilateral/qa-ai-traffic-light (BIL-QAI-T-6) — the orchestrator is a
        // collaborator (`BIL-QAI-DD-5`); `BilateralCenterService` only owns the preconditions
        // (`assertSubmittable`) and delegates the actual assessment to it.
        {
          provide: BilateralQualityAssessmentService,
          useValue: {
            assess: jest.fn().mockResolvedValue({
              dto: { id: 1, result_id: 77, status: 'completed' },
              httpStatus: 200,
            }),
            getLatest: jest.fn().mockResolvedValue({ latest: null }),
          },
        },
        {
          provide: BilateralQualityAssessmentRepository,
          useValue: {
            findOne: jest.fn().mockResolvedValue({
              id: 1,
              result_id: 77,
              status: 'completed',
              decision: null,
              overall_verdict: 'green',
              sections: {},
            }),
          },
        },
        // design §5.1, BIL-RTE-T-2 — the Center-write decision consulted by `updatePlannedResult`,
        // `saveTocMapping` and `saveContributors`. Resolves (allow) by default so every existing
        // test below keeps exercising its own scenario; the dedicated Center-write tests override
        // it per case.
        {
          provide: BilateralAccessService,
          useValue: {
            assertCenterWrite: jest.fn().mockResolvedValue(undefined),
          },
        },
        // P2-3368 AC10-AC14 — the NARROW `linked_result` writer. Mocked, never the shared
        // `createForInnovationUse`: the tests below assert exactly which of the two is asked to
        // run, because the wrong one wipes the rows of other sections.
        {
          provide: ResultsInnovationsUseRepository,
          useValue: {
            replaceLinkedResultsByOrigin: jest.fn().mockResolvedValue([]),
          },
        },
        // `BIL-QTS-T-7` — the audit row a drawer field save writes.
        {
          provide: getRepositoryToken(ResultFieldRevision),
          useValue: {
            save: jest.fn().mockResolvedValue({}),
          },
        },
        // `PSR-T-5` — creation/assignment paths request a primary Science Program instead of
        // writing role 1 directly. Default: succeeds, and `stateFor` reports no request yet.
        {
          provide: PrimaryProgramRequestService,
          useValue: {
            request: jest
              .fn()
              .mockResolvedValue({ ok: true, shareResultRequestId: 1 }),
            stateFor: jest.fn().mockResolvedValue({
              state: PrimaryRequestStateEnum.NONE,
              program_code: null,
              declined_by_codes: [],
            }),
            // `PSR-T-6` — no pending round / nothing to release by default; individual tests
            // override these.
            findPendingPrimaryInitiativeId: jest.fn().mockResolvedValue(null),
            // `PNS-T-1` — no saved-but-not-sent draft round by default; individual tests override.
            findDraftPrimaryInitiativeId: jest.fn().mockResolvedValue(null),
            releaseContributors: jest.fn().mockResolvedValue({ released: 0 }),
            // `PNS-T-2` — flips a DRAFT primary round to PENDING inside the submit transaction;
            // individual tests override to simulate a failure.
            sendDraft: jest.fn().mockResolvedValue(undefined),
            // `PRA-T-1` — owner at submit and direct swap go through `transferPrimary`; the swap
            // also checks `isAligned`. Defaults: transferred / aligned; tests override.
            transferPrimary: jest.fn().mockResolvedValue({
              outcome: 'transferred',
              previousInitiativeId: null,
            }),
            isAligned: jest.fn().mockResolvedValue(true),
          },
        },
      ],
    }).compile();

    service = module.get<BilateralCenterService>(BilateralCenterService);
    versioningService = module.get<VersioningService>(VersioningService);
    resultRepository = module.get<ResultRepository>(ResultRepository);
    resultByLevelRepository = module.get<ResultByLevelRepository>(
      ResultByLevelRepository,
    );
    yearRepository = module.get<YearRepository>(YearRepository);
    bilateralService = module.get<BilateralService>(BilateralService);
    bilateralProjectsService = module.get<BilateralProjectsService>(
      BilateralProjectsService,
    );
    resultsKnowledgeProductsService =
      module.get<ResultsKnowledgeProductsService>(
        ResultsKnowledgeProductsService,
      );
    bilateralAccessService = module.get<BilateralAccessService>(
      BilateralAccessService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return projects for a numeric centerId', async () => {
    const result = await service.getProjects(10);
    expect(result).toEqual({ response: { projects: [] } });
    expect(bilateralProjectsService.getProjectsByCenter).toHaveBeenCalledWith(
      10,
      undefined,
      undefined,
    );
  });

  // changes/project-multiselect-filter (PMF-DD-5): the optional `year` rides along to the
  // catalog service, which owns the active-year fallback.
  it('should forward the optional year to the catalog service', async () => {
    await service.getProjects(10, 2025);
    expect(bilateralProjectsService.getProjectsByCenter).toHaveBeenCalledWith(
      10,
      2025,
      undefined,
    );
  });

  // bilateral/project-overview-metrics (BIL-POM-OQ-1 correction): the optional `versionId`
  // rides along too, so the catalog service can scope w1w2ContributorCount to this phase.
  it('should forward the optional versionId to the catalog service', async () => {
    await service.getProjects(10, 2025, 36);
    expect(bilateralProjectsService.getProjectsByCenter).toHaveBeenCalledWith(
      10,
      2025,
      36,
    );
  });

  // BIL-RTE-T-2 — design §5.1: the Center-write decision, before any write. This wiring test
  // covers the arguments the helper is called with and reacts to deny/allow; the decision's own
  // admin/status logic is covered by `bilateral-access.service.spec.ts`.
  describe('updatePlannedResult (BIL-RTE-T-2, design §5.1)', () => {
    const user: TokenDto = {
      id: 42,
      email: 'test@cgiar.org',
      first_name: 'Test',
      last_name: 'User',
    };

    it('falsifier (b): a non-admin denial returns 403 (via HttpException) and no repository write runs', async () => {
      jest.spyOn(resultRepository, 'findOne').mockResolvedValue({
        id: 10,
        status_id: ResultStatusData.PendingReview.value,
      } as any);
      const resultsTocResultsService = module.get<ResultsTocResultsService>(
        ResultsTocResultsService,
      );
      (
        bilateralAccessService.assertCenterWrite as jest.Mock
      ).mockRejectedValueOnce(
        new ForbiddenException(
          'Result 10 is under Science Program review (rule: center).',
        ),
      );

      await expect(
        service.updatePlannedResult(10, { planned_result: true }, user),
      ).rejects.toThrow(ForbiddenException);

      expect(bilateralAccessService.assertCenterWrite).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 10,
          status_id: ResultStatusData.PendingReview.value,
        }),
        'center-planned-result',
        user,
      );
      expect(
        resultsTocResultsService.updatePlannedResult,
      ).not.toHaveBeenCalled();
    });

    it('falsifier (c): an admin at status 5 proceeds to write (allow path)', async () => {
      jest.spyOn(resultRepository, 'findOne').mockResolvedValue({
        id: 10,
        status_id: ResultStatusData.PendingReview.value,
      } as any);
      const resultsTocResultsService = module.get<ResultsTocResultsService>(
        ResultsTocResultsService,
      );

      await service.updatePlannedResult(10, { planned_result: true }, user);

      expect(bilateralAccessService.assertCenterWrite).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 10,
          status_id: ResultStatusData.PendingReview.value,
        }),
        'center-planned-result',
        user,
      );
      expect(resultsTocResultsService.updatePlannedResult).toHaveBeenCalledWith(
        10,
        true,
        user.id,
      );
    });

    it('returns 404 when the bilateral result cannot be found, and never consults the helper', async () => {
      jest.spyOn(resultRepository, 'findOne').mockResolvedValueOnce(null);

      const res = await service.updatePlannedResult(
        999,
        { planned_result: true },
        user,
      );

      expect(res).toMatchObject({ status: 404 });
      expect(bilateralAccessService.assertCenterWrite).not.toHaveBeenCalled();
    });
  });

  describe('createResultHeader', () => {
    const user: TokenDto = {
      id: 42,
      email: 'test@cgiar.org',
      first_name: 'Test',
      last_name: 'User',
    };

    // P2-3166. This flow writes `source = SourceEnum.Bilateral` ('API') but has no API key and so
    // no CLARISA `mis` — so 'API' means "is W3/bilateral", NOT "arrived through the external API".
    // The counterexample matters: anything deciding whether to dispatch a webhook must test
    // `external_platform_id != null`, never `source === 'API'`, or every result a centre creates
    // by hand would queue a delivery with nowhere to send it.
    it('records no external platform for a result the centre creates itself', async () => {
      await service.createResultHeader(user, {
        result_level_id: 2,
        result_type_id: 7,
      });

      const saved = (resultRepository.save as jest.Mock).mock.calls[0][0];
      expect(saved.source).toBe(SourceEnum.Bilateral);
      expect(saved.external_platform_id).toBeUndefined();
      expect(saved.external_platform_code).toBeUndefined();
      expect(saved.external_reference).toBeUndefined();
    });

    /**
     * The client builds `lead_center` from the project's `obj_organization`, a join on
     * `organization_code` — which CLARISA's W3 sync leaves null for the Alliance-descended
     * centres, so it sends nothing at all. The server resolves it from the project instead,
     * rather than trusting the payload to carry it.
     */
    it('resolves the lead centre from the project when the payload omits it', async () => {
      (
        bilateralProjectsService.resolveProjectLeadCenter as jest.Mock
      ).mockResolvedValueOnce({
        name: 'Alliance … Regional Hub',
        acronym: 'CIAT',
      });

      const result = await service.createResultHeader(user, {
        result_level_id: 2,
        result_type_id: 7,
        project_id: 1443,
      } as any);

      expect(
        bilateralProjectsService.resolveProjectLeadCenter,
      ).toHaveBeenCalledWith(1443);
      expect(bilateralService.handleLeadCenter).toHaveBeenCalledWith(
        99,
        { name: 'Alliance … Regional Hub', acronym: 'CIAT' },
        42,
      );
      expect(result.response.lead_center_resolved).toBe(true);
    });

    it('prefers the payload lead_center over the project when both are available', async () => {
      const payloadCenter = {
        name: 'International Potato Center',
        acronym: 'CIP',
      };

      await service.createResultHeader(user, {
        result_level_id: 2,
        result_type_id: 7,
        project_id: 1443,
        lead_center: payloadCenter,
      } as any);

      expect(
        bilateralProjectsService.resolveProjectLeadCenter,
      ).not.toHaveBeenCalled();
      expect(bilateralService.handleLeadCenter).toHaveBeenCalledWith(
        99,
        payloadCenter,
        42,
      );
    });

    // Creation is not blocked — that would be worse — but it must not fail quietly either:
    // with no lead centre the Contributors & Partners green check can never turn green.
    it('reports lead_center_resolved false and warns when no centre can be resolved', async () => {
      const logger = jest
        .spyOn((service as any).logger, 'warn')
        .mockImplementation(() => undefined);

      const result = await service.createResultHeader(user, {
        result_level_id: 2,
        result_type_id: 7,
        project_id: 1443,
      } as any);

      expect(bilateralService.handleLeadCenter).not.toHaveBeenCalled();
      expect(result.response.lead_center_resolved).toBe(false);
      expect(logger).toHaveBeenCalledWith(
        expect.stringContaining('created without a lead centre'),
      );
    });

    it('should create a result header', async () => {
      const result = await service.createResultHeader(user, {
        result_level_id: 2,
        result_type_id: 7,
      });

      expect(result.response.id).toBe(99);
      expect(result.response.source).toBe(SourceEnum.Bilateral);
      expect(result.response.status_id).toBe(1);
      // The trigger-assigned code, not the 0 placeholder handed to save().
      expect(result.response.result_code).toBe(8852);
      expect(resultRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          created_by: 42,
          result_level_id: 2,
          result_type_id: 7,
          result_code: 0,
          source: SourceEnum.Bilateral,
          status_id: 1,
        }),
      );
    });

    // @akili-spec bilateral/manual-create-drawer (BIL-MCD-T-1)
    it('persists a client-supplied title and skips the draft rename', async () => {
      await service.createResultHeader(user, {
        result_level_id: 4,
        result_type_id: 8,
        title: 'My Result',
      });

      expect(resultRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'My Result' }),
      );
      expect(resultRepository.update).not.toHaveBeenCalledWith(99, {
        title: 'Bilateral Draft #99',
      });
    });

    it('assigns a bilateral draft title when title is omitted', async () => {
      await service.createResultHeader(user, {
        result_level_id: 2,
        result_type_id: 7,
      });

      const saved = (resultRepository.save as jest.Mock).mock.calls.at(-1)[0];
      expect(saved.title).toMatch(/^Bilateral Draft \d+$/);
      expect(resultRepository.update).toHaveBeenCalledWith(99, {
        title: 'Bilateral Draft #99',
      });
    });

    it('creates draft share_result_request rows when contributing_programs are supplied', async () => {
      const clarisaRepo = module.get<ClarisaInitiativesRepository>(
        ClarisaInitiativesRepository,
      );
      (clarisaRepo.findOne as jest.Mock).mockImplementation(
        ({ where }: any) => {
          if (where.official_code === 'SP01')
            return Promise.resolve({ id: 10, official_code: 'SP01' });
          if (where.official_code === 'SP02')
            return Promise.resolve({ id: 20, official_code: 'SP02' });
          return Promise.resolve(null);
        },
      );

      const shareRepo = module.get<ShareResultRequestRepository>(
        ShareResultRequestRepository,
      );

      await service.createResultHeader(user, {
        result_level_id: 2,
        result_type_id: 7,
        program_code: 'SP01',
        contributing_programs: [{ science_program_id: 'SP02' }],
      });

      expect(shareRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          result_id: 99,
          shared_inititiative_id: 20,
          request_status_id: 4,
          is_active: true,
        }),
      );
    });

    // `PSR-T-5` falsifier: "after createResultHeader with SP09, an active role-1 row exists →
    // FAIL". design.md DD-2 — the chosen primary SP is sent a pending request, never written as
    // the owner outright.
    describe('PSR-T-5: primary program request instead of role 1', () => {
      let primaryProgramRequestService: PrimaryProgramRequestService;

      beforeEach(() => {
        primaryProgramRequestService = module.get<PrimaryProgramRequestService>(
          PrimaryProgramRequestService,
        );
        const clarisaRepo = module.get<ClarisaInitiativesRepository>(
          ClarisaInitiativesRepository,
        );
        (clarisaRepo.findOne as jest.Mock).mockResolvedValue({
          id: 10,
          official_code: 'SP09',
        });
      });

      it('requests the chosen SP instead of writing an active role-1 row', async () => {
        await service.createResultHeader(user, {
          result_level_id: 2,
          result_type_id: 7,
          program_code: 'SP09',
        });

        // `PNS-T-1`: a brand-new result has no owner — the choice is saved as a DRAFT, not sent.
        expect(primaryProgramRequestService.request).toHaveBeenCalledWith(
          99,
          10,
          user,
          undefined,
          { asDraft: true },
        );
        const resultByInitiativesRepository =
          module.get<ResultByInitiativesRepository>(
            ResultByInitiativesRepository,
          );
        expect(resultByInitiativesRepository.save).not.toHaveBeenCalledWith(
          expect.objectContaining({ initiative_role_id: 1 }),
        );
      });

      // `PSR-T-5` reviewer FAIL (rework attempt 2, discovered issue 1): manual create must write
      // the lead-project row BEFORE `request()` runs — `PrimaryProgramRequestService
      // .findLeadProjectId` resolves the lead project via `results_by_projects`, so calling
      // `request()` first always found no project, returned `not_aligned`, and manual create
      // silently produced no pending request at all.
      it('saves the lead project before requesting the primary SP (manual create with project_id)', async () => {
        const resultsByProjectsRepository =
          module.get<ResultsByProjectsRepository>(ResultsByProjectsRepository);

        await service.createResultHeader(user, {
          result_level_id: 2,
          result_type_id: 7,
          project_id: 1443,
          program_code: 'SP09',
        } as any);

        const projectSaveOrder = (resultsByProjectsRepository.save as jest.Mock)
          .mock.invocationCallOrder[0];
        const requestOrder = (primaryProgramRequestService.request as jest.Mock)
          .mock.invocationCallOrder[0];
        expect(projectSaveOrder).toBeLessThan(requestOrder);
      });

      // requirements.md PSR-R-1 "request step fails": creation still succeeds, logged only.
      it('still succeeds when the primary program request fails (sent back, retry allowed)', async () => {
        (
          primaryProgramRequestService.request as jest.Mock
        ).mockResolvedValueOnce({ ok: false, reason: 'internal_error' });
        const logger = jest
          .spyOn((service as any).logger, 'warn')
          .mockImplementation(() => undefined);

        const result = await service.createResultHeader(user, {
          result_level_id: 2,
          result_type_id: 7,
          program_code: 'SP09',
        });

        expect(result.response.id).toBe(99);
        expect(logger).toHaveBeenCalledWith(
          expect.stringContaining('primary program request failed'),
        );
      });
    });

    it('still populates KP from CGSpace when a client title is provided', async () => {
      const resultsKnowledgeProductsService =
        module.get<ResultsKnowledgeProductsService>(
          ResultsKnowledgeProductsService,
        );

      await service.createResultHeader(user, {
        result_level_id: 2,
        result_type_id: 6,
        handle: '10568/175322',
        title: 'Repository title preview',
      });

      expect(resultRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Repository title preview' }),
      );
      expect(
        resultsKnowledgeProductsService.populateKPFromCGSpace,
      ).toHaveBeenCalledWith(99, '10568/175322', user);
    });

    // A 0 result_code means the `result_auto_code` trigger is missing from the environment. Every
    // bilateral row then shares code 0, and the detail endpoint resolves by result_code whenever a
    // phase is supplied — so the user would silently open somebody else's draft. Logged rather than
    // thrown: throwing would take bilateral creation down entirely in a mis-migrated environment.
    it('logs when the row comes back without a trigger-assigned result_code', async () => {
      const logger = jest
        .spyOn((service as any).logger, 'error')
        .mockImplementation(() => undefined);
      jest.spyOn(resultRepository, 'findOne').mockResolvedValue({
        id: 99,
        result_code: 0,
        version_id: 1,
      } as any);

      const result = await service.createResultHeader(user, {
        result_level_id: 2,
        result_type_id: 7,
      });

      expect(result.response.result_code).toBe(0);
      expect(logger).toHaveBeenCalledWith(
        expect.stringContaining('was created without a result_code'),
      );
    });

    it('should reject CAPACITY_CHANGE type (id=3)', async () => {
      await expect(
        service.createResultHeader(user, {
          result_level_id: 1,
          result_type_id: 3,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid level/type combination', async () => {
      jest
        .spyOn(resultByLevelRepository, 'getByTypeAndLevel')
        .mockResolvedValue(undefined);

      await expect(
        service.createResultHeader(user, {
          result_level_id: 99,
          result_type_id: 99,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject when no active phase exists', async () => {
      jest
        .spyOn(versioningService, '$_findActivePhase')
        .mockResolvedValue(null);

      await expect(
        service.createResultHeader(user, {
          result_level_id: 2,
          result_type_id: 6,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject when no active year exists', async () => {
      jest.spyOn(yearRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.createResultHeader(user, {
          result_level_id: 2,
          result_type_id: 6,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    describe('Knowledge Product via CGSpace handle', () => {
      it('should populate the result from CGSpace when a handle is provided', async () => {
        const resultsKnowledgeProductsService =
          module.get<ResultsKnowledgeProductsService>(
            ResultsKnowledgeProductsService,
          );

        await service.createResultHeader(user, {
          result_level_id: 2,
          result_type_id: 6,
          handle: '10568/175322',
        });

        expect(
          resultsKnowledgeProductsService.populateKPFromCGSpace,
        ).toHaveBeenCalledWith(99, '10568/175322', user);
      });

      it('should soft-delete the result and reject when CGSpace population fails', async () => {
        const resultsKnowledgeProductsService =
          module.get<ResultsKnowledgeProductsService>(
            ResultsKnowledgeProductsService,
          );
        jest
          .spyOn(resultsKnowledgeProductsService, 'populateKPFromCGSpace')
          .mockRejectedValue(new Error('Handle not found on CGSpace'));

        await expect(
          service.createResultHeader(user, {
            result_level_id: 2,
            result_type_id: 6,
            handle: 'bad-handle',
          }),
        ).rejects.toThrow(BadRequestException);

        expect(resultRepository.update).toHaveBeenCalledWith(99, {
          is_active: false,
        });
      });

      it('should not call CGSpace population for non-Knowledge-Product types', async () => {
        const resultsKnowledgeProductsService =
          module.get<ResultsKnowledgeProductsService>(
            ResultsKnowledgeProductsService,
          );

        await service.createResultHeader(user, {
          result_level_id: 2,
          result_type_id: 7,
        });

        expect(
          resultsKnowledgeProductsService.populateKPFromCGSpace,
        ).not.toHaveBeenCalled();
      });
    });
  });

  describe('saveContributors', () => {
    const user: TokenDto = {
      id: 42,
      email: 'test@cgiar.org',
      first_name: 'Test',
      last_name: 'User',
    };

    /*
     * The lead centre must survive a sync that does not mention it. `updateCenter` deactivates
     * every row of the result when handed an empty list, without excluding `is_leading_result`,
     * and the form offers no way to pick the lead centre again — so losing it bricks the submit
     * with "The result has no lead center assigned".
     */
    // Nicoleta Trifa via Ángel Jarrín, 2026-09-03: contributing programs must persist and be pickable
    // whatever the project maps to. Since 2026-09-04 they are staged as share-request DRAFTS
    // (status 4, the ingest shape) — NOT role-2 rows, which meant "already accepted", skipped the
    // contributor's consent and were wiped by the approval's updateResultByInitiative.
    /*
     * P2-3368 AC10-AC14 — "Is this result linked or bundled with another CGIAR-reported result?".
     *
     * Every test here exists because of ONE failure mode: `linked_result` is shared with the P22
     * "Links to results" section, and this endpoint autosaves on every centre or project change.
     * A write that is not narrow deletes other people's rows on a save the user never associated
     * with this question.
     */
    describe('linked/bundled answer', () => {
      const arrangeResult = (overrides: Record<string, unknown> = {}) => {
        jest.spyOn(resultRepository, 'findOne').mockResolvedValue({
          id: 10,
          source: SourceEnum.Bilateral,
          result_type_id: ResultTypeEnum.CAPACITY_SHARING_FOR_DEVELOPMENT,
          has_innovation_link: null,
          ...overrides,
        } as any);
        const linkedRepo = module.get<ResultsInnovationsUseRepository>(
          ResultsInnovationsUseRepository,
        ) as any;
        linkedRepo.replaceLinkedResultsByOrigin = jest
          .fn()
          .mockResolvedValue([]);
        (resultRepository.update as jest.Mock).mockClear();
        // P2-3823 — the active-results filter: every id asked about is active unless the test
        // says otherwise (`inactiveIds`).
        (resultRepository.query as jest.Mock).mockImplementation(
          async (_sql: string, ids: number[] = []) =>
            ids
              .filter((id) => !activeFilter.inactive.has(Number(id)))
              .map((id) => ({ id })),
        );
        activeFilter.inactive = new Set();
        return linkedRepo;
      };
      const activeFilter: { inactive: Set<number> } = { inactive: new Set() };

      it('stores a Yes with its selection through the narrow writer', async () => {
        const linkedRepo = arrangeResult();

        await service.saveContributors(
          10,
          { has_innovation_link: true, linked_results: [11164, 9600] },
          user,
        );

        expect(resultRepository.update).toHaveBeenCalledWith(
          10,
          expect.objectContaining({ has_innovation_link: true }),
        );
        expect(linkedRepo.replaceLinkedResultsByOrigin).toHaveBeenCalledWith(
          10,
          [11164, 9600],
          user.id,
        );
      });

      it('clears the links when a stored Yes is retracted to No (AC12)', async () => {
        const linkedRepo = arrangeResult({ has_innovation_link: true });

        await service.saveContributors(
          10,
          { has_innovation_link: false, linked_results: [] },
          user,
        );

        expect(resultRepository.update).toHaveBeenCalledWith(
          10,
          expect.objectContaining({ has_innovation_link: false }),
        );
        expect(linkedRepo.replaceLinkedResultsByOrigin).toHaveBeenCalledWith(
          10,
          [],
          user.id,
        );
      });

      it('leaves the shared table alone on a No that was never a Yes', async () => {
        const linkedRepo = arrangeResult({ has_innovation_link: null });

        await service.saveContributors(
          10,
          { has_innovation_link: false, linked_results: [] },
          user,
        );

        expect(resultRepository.update).toHaveBeenCalledWith(
          10,
          expect.objectContaining({ has_innovation_link: false }),
        );
        expect(linkedRepo.replaceLinkedResultsByOrigin).not.toHaveBeenCalled();
      });

      it('writes nothing when the question is unanswered (AC10)', async () => {
        const linkedRepo = arrangeResult({ has_innovation_link: true });

        const response = await service.saveContributors(
          10,
          { has_innovation_link: null },
          user,
        );

        expect(response.status).toBeUndefined();
        expect(resultRepository.update).not.toHaveBeenCalled();
        expect(linkedRepo.replaceLinkedResultsByOrigin).not.toHaveBeenCalled();
      });

      it('writes nothing when the key is absent — an autosave of other blocks', async () => {
        const linkedRepo = arrangeResult({ has_innovation_link: true });

        await service.saveContributors(10, { contributing_center: [] }, user);

        expect(linkedRepo.replaceLinkedResultsByOrigin).not.toHaveBeenCalled();
      });

      it.each([
        ['Innovation Use', ResultTypeEnum.INNOVATION_USE],
        ['Innovation Development', ResultTypeEnum.INNOVATION_DEVELOPMENT],
      ])(
        'ignores both keys for %s, whose answer has another owner',
        async (_label, resultTypeId) => {
          const linkedRepo = arrangeResult({ result_type_id: resultTypeId });

          await service.saveContributors(
            10,
            { has_innovation_link: true, linked_results: [11164] },
            user,
          );

          expect(resultRepository.update).not.toHaveBeenCalled();
          expect(
            linkedRepo.replaceLinkedResultsByOrigin,
          ).not.toHaveBeenCalled();
        },
      );

      // ── P2-3823: no ValidationPipe runs on this route, so the service is the only guard ──
      it('ignores a string flag: "false" must not be stored as Yes', async () => {
        const linkedRepo = arrangeResult({ has_innovation_link: false });

        await service.saveContributors(
          10,
          { has_innovation_link: 'false', linked_results: [11164] } as any,
          user,
        );

        expect(resultRepository.update).not.toHaveBeenCalled();
        expect(linkedRepo.replaceLinkedResultsByOrigin).not.toHaveBeenCalled();
      });

      it('treats a null list as absent: a Yes never wipes the stored rows', async () => {
        const linkedRepo = arrangeResult({ has_innovation_link: true });

        await service.saveContributors(
          10,
          { has_innovation_link: true, linked_results: null } as any,
          user,
        );

        expect(resultRepository.update).toHaveBeenCalledWith(
          10,
          expect.objectContaining({ has_innovation_link: true }),
        );
        expect(linkedRepo.replaceLinkedResultsByOrigin).not.toHaveBeenCalled();
      });

      it('drops the result itself, inactive results and junk ids before writing', async () => {
        const linkedRepo = arrangeResult();
        activeFilter.inactive = new Set([555]);

        await service.saveContributors(
          10,
          {
            has_innovation_link: true,
            linked_results: [11164, 10, 555, -3, 'x', 11164, 9600] as any,
          },
          user,
        );

        expect(linkedRepo.replaceLinkedResultsByOrigin).toHaveBeenCalledWith(
          10,
          [11164, 9600],
          user.id,
        );
      });

      it('keeps the stored list when a Yes arrives without linked_results', async () => {
        const linkedRepo = arrangeResult({ has_innovation_link: true });

        await service.saveContributors(10, { has_innovation_link: true }, user);

        expect(resultRepository.update).toHaveBeenCalledWith(
          10,
          expect.objectContaining({ has_innovation_link: true }),
        );
        expect(linkedRepo.replaceLinkedResultsByOrigin).not.toHaveBeenCalled();
      });
    });

    describe('contributing_programs', () => {
      const user2: TokenDto = {
        id: 7,
        email: 'u@cgiar.org',
        first_name: 'U',
        last_name: 'S',
      };

      const arrange = () => {
        jest
          .spyOn(resultRepository, 'findOne')
          .mockResolvedValue({ id: 10, source: SourceEnum.Bilateral } as any);
        const rbi = module.get<ResultByInitiativesRepository>(
          ResultByInitiativesRepository,
        ) as any;
        const clarisa = module.get<ClarisaInitiativesRepository>(
          ClarisaInitiativesRepository,
        ) as any;
        const shareRepo = module.get<ShareResultRequestRepository>(
          ShareResultRequestRepository,
        ) as any;
        rbi.getOwnerInitiativeByResult = jest.fn().mockResolvedValue({ id: 1 });
        // SP03 (id 3) is an already-ACCEPTED contribution (active role-2 row).
        rbi.find = jest.fn().mockResolvedValue([
          {
            id: 501,
            initiative_id: 3,
            initiative_role_id: 2,
            is_active: true,
          },
        ]);
        rbi.findOne = jest.fn().mockResolvedValue(null);
        rbi.update = jest.fn().mockResolvedValue({});
        rbi.save = jest.fn().mockResolvedValue({});
        shareRepo.find = jest.fn().mockResolvedValue([]);
        shareRepo.findOne = jest.fn().mockResolvedValue(null);
        shareRepo.save = jest.fn().mockResolvedValue({});
        shareRepo.update = jest.fn().mockResolvedValue({});
        clarisa.findOne = jest.fn(({ where }) =>
          Promise.resolve(
            (
              {
                SP01: { id: 1 },
                SP02: { id: 2 },
                SP03: { id: 3 },
                SP05: { id: 5 },
              } as any
            )[where.official_code] ?? null,
          ),
        );
        return { rbi, clarisa, shareRepo };
      };

      it('stages a new program as a DRAFT request, never as a role-2 row, and skips the primary', async () => {
        const { rbi, shareRepo } = arrange();

        const response = await service.saveContributors(
          10,
          {
            contributing_programs: [
              { science_program_id: 'sp02' },
              { science_program_id: 'SP01' },
              { science_program_id: 'SP03' },
            ],
          },
          user2,
        );

        // SP02 is new → a draft request, mirroring the ingest shape exactly.
        expect(shareRepo.save).toHaveBeenCalledWith(
          expect.objectContaining({
            result_id: 10,
            owner_initiative_id: 1,
            shared_inititiative_id: 2,
            approving_inititiative_id: 2,
            request_status_id: 4,
            requested_by: 7,
            is_active: true,
          }),
        );
        // No role-2 row is ever written from here — acceptance is the SP's move (P2-3187).
        expect(rbi.save).not.toHaveBeenCalled();
        // SP03 is already accepted and still listed → untouched. SP01 is the owner → skipped.
        expect(rbi.update).not.toHaveBeenCalled();
        expect(response.response).toEqual(
          expect.objectContaining({
            savedPrograms: expect.arrayContaining(['SP02', 'SP03']),
            deactivatedPrograms: [],
            failedPrograms: [],
          }),
        );
      });

      it('deactivates an accepted contribution and cancels a live request when the program is removed', async () => {
        const { rbi, shareRepo } = arrange();
        // SP05 (id 5) has a live draft request; SP03 (id 3) is accepted. The payload lists neither.
        shareRepo.find = jest.fn().mockResolvedValue([
          {
            share_result_request_id: 900,
            shared_inititiative_id: 5,
            request_status_id: 4,
            is_active: true,
          },
        ]);

        const response = await service.saveContributors(
          10,
          { contributing_programs: [] },
          user2,
        );

        expect(rbi.update).toHaveBeenCalledWith(
          { id: 501 },
          expect.objectContaining({ is_active: false, last_updated_by: 7 }),
        );
        expect(shareRepo.update).toHaveBeenCalledWith(
          { share_result_request_id: 900 },
          { is_active: false },
        );
        expect(response.response).toEqual(
          expect.objectContaining({
            deactivatedPrograms: expect.arrayContaining([3, 5]),
          }),
        );
      });

      it('reactivates a dormant draft instead of piling up rows', async () => {
        const { shareRepo } = arrange();
        rbiEmpty();
        shareRepo.findOne = jest.fn().mockResolvedValue({
          share_result_request_id: 901,
          shared_inititiative_id: 2,
          request_status_id: 4,
          is_active: false,
        });

        await service.saveContributors(
          10,
          { contributing_programs: [{ science_program_id: 'SP02' }] },
          user2,
        );

        expect(shareRepo.update).toHaveBeenCalledWith(
          { share_result_request_id: 901 },
          { is_active: true, requested_by: 7 },
        );
        expect(shareRepo.save).not.toHaveBeenCalled();

        function rbiEmpty() {
          const rbi = module.get<ResultByInitiativesRepository>(
            ResultByInitiativesRepository,
          ) as any;
          rbi.find = jest.fn().mockResolvedValue([]);
        }
      });

      it('does not rewrite a program that already has a live request', async () => {
        const { rbi, shareRepo } = arrange();
        rbi.find = jest.fn().mockResolvedValue([]);
        shareRepo.find = jest.fn().mockResolvedValue([
          {
            share_result_request_id: 902,
            shared_inititiative_id: 2,
            request_status_id: 1,
            is_active: true,
          },
        ]);

        const response = await service.saveContributors(
          10,
          { contributing_programs: [{ science_program_id: 'SP02' }] },
          user2,
        );

        expect(shareRepo.save).not.toHaveBeenCalled();
        expect(shareRepo.update).not.toHaveBeenCalled();
        expect(response.response).toEqual(
          expect.objectContaining({ savedPrograms: ['SP02'] }),
        );
      });

      it('reports an unknown code as failed instead of dropping it silently', async () => {
        arrange();
        const response = await service.saveContributors(
          10,
          { contributing_programs: [{ science_program_id: 'NOPE' }] },
          user2,
        );
        expect(response.response).toEqual(
          expect.objectContaining({ failedPrograms: ['NOPE'] }),
        );
        expect(response.message).toContain('1 failed programs');
      });

      it('leaves the stored programs alone when the key is omitted', async () => {
        const { rbi } = arrange();
        await service.saveContributors(10, { contributing_center: [] }, user2);
        expect(rbi.find).not.toHaveBeenCalled();
        expect(rbi.update).not.toHaveBeenCalled();
      });

      // `PSR-T-6` (design.md §5 item 5, "exclude the pending/owner SP") — regression: current
      // code only excludes the OWNER SP; a pending primary SP (no owner yet) was still saveable
      // as a contributor draft.
      it('excludes the pending primary SP from the contributor list (PSR-T-6 regression)', async () => {
        const { shareRepo } = arrange();
        const rbi = module.get<ResultByInitiativesRepository>(
          ResultByInitiativesRepository,
        ) as any;
        rbi.getOwnerInitiativeByResult = jest.fn().mockResolvedValue(null);
        const primaryProgramRequestService =
          module.get<PrimaryProgramRequestService>(
            PrimaryProgramRequestService,
          ) as any;
        // SP02 (id 2) has a pending primary request — the very SP the Center is waiting on.
        primaryProgramRequestService.findPendingPrimaryInitiativeId = jest
          .fn()
          .mockResolvedValue(2);

        const response = await service.saveContributors(
          10,
          { contributing_programs: [{ science_program_id: 'SP02' }] },
          user2,
        );

        expect(shareRepo.save).not.toHaveBeenCalled();
        expect(shareRepo.update).not.toHaveBeenCalled();
        expect(response.response).toEqual(
          expect.objectContaining({ savedPrograms: [], failedPrograms: [] }),
        );
      });

      // `PNS-T-1` (design.md §5 item 5) — same exclusion, but for a saved-but-not-sent DRAFT
      // primary choice (no pending round yet). Must be seen red: today's `syncContributingPrograms`
      // only calls `findPendingPrimaryInitiativeId`, never a draft-aware lookup, so SP02 would be
      // saved as a contributor here on unchanged code.
      it('excludes the draft (not-yet-sent) primary SP from the contributor list (PNS-R-1)', async () => {
        const { shareRepo } = arrange();
        const rbi = module.get<ResultByInitiativesRepository>(
          ResultByInitiativesRepository,
        ) as any;
        rbi.getOwnerInitiativeByResult = jest.fn().mockResolvedValue(null);
        const primaryProgramRequestService =
          module.get<PrimaryProgramRequestService>(
            PrimaryProgramRequestService,
          ) as any;
        primaryProgramRequestService.findPendingPrimaryInitiativeId = jest
          .fn()
          .mockResolvedValue(null);
        // SP02 (id 2) has a saved-but-not-sent DRAFT primary choice.
        primaryProgramRequestService.findDraftPrimaryInitiativeId = jest
          .fn()
          .mockResolvedValue(2);

        const response = await service.saveContributors(
          10,
          { contributing_programs: [{ science_program_id: 'SP02' }] },
          user2,
        );

        expect(shareRepo.save).not.toHaveBeenCalled();
        expect(shareRepo.update).not.toHaveBeenCalled();
        expect(response.response).toEqual(
          expect.objectContaining({ savedPrograms: [], failedPrograms: [] }),
        );
      });

      // Reviewer FAIL (rework attempt 2, issue 1) — `activeRequests` (the "cancel anything not
      // in `wanted`" query) had no `request_type` filter, so it also matched the pending
      // `primary` row (same status 1 / `is_active` true / `is_map_to_toc` false shape), and the
      // cancel loop deactivated it on EVERY contributors save — including the one
      // `createResultHeader` makes right after creating that very request. The mock's `find`
      // ignores `where` entirely, so the regression is pinned on the criteria passed to it, not
      // on a fixture row it would filter for you.
      it('the active-requests cancel query filters on request_type: contribution (ownerless / no swap, PSR-T-6 regression)', async () => {
        const { rbi, shareRepo } = arrange();
        rbi.getOwnerInitiativeByResult = jest.fn().mockResolvedValue(null);

        await service.saveContributors(
          10,
          { contributing_programs: [{ science_program_id: 'SP02' }] },
          user2,
        );

        expect(shareRepo.find).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              request_type: RequestTypeEnum.CONTRIBUTION,
            }),
          }),
        );
      });

      // Same issue, swap case (Reviewer: "Cover the swap case as well (owner present plus a
      // pending primary row)") — an owner already exists AND a swap primary request is pending;
      // the cancel query must still be scoped to contribution rows only.
      it('the active-requests cancel query filters on request_type: contribution (owner present, swap pending, PSR-T-6 regression)', async () => {
        const { shareRepo } = arrange(); // default owner id 1 (SP01)
        const primaryProgramRequestService =
          module.get<PrimaryProgramRequestService>(
            PrimaryProgramRequestService,
          ) as any;
        primaryProgramRequestService.findPendingPrimaryInitiativeId = jest
          .fn()
          .mockResolvedValue(12); // SP12 swap request pending against owner SP01

        await service.saveContributors(
          10,
          { contributing_programs: [{ science_program_id: 'SP02' }] },
          user2,
        );

        expect(shareRepo.find).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              request_type: RequestTypeEnum.CONTRIBUTION,
            }),
          }),
        );
      });

      // Same issue, the dormant-draft lookup must be scoped the same way, or it could reactivate
      // (or, worse, be shadowed by) the pending primary row instead of a genuine dormant draft.
      it('the dormant-draft lookup filters on request_type: contribution (PSR-T-6 regression)', async () => {
        const { shareRepo } = arrange();

        await service.saveContributors(
          10,
          { contributing_programs: [{ science_program_id: 'SP02' }] },
          user2,
        );

        expect(shareRepo.findOne).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              request_type: RequestTypeEnum.CONTRIBUTION,
            }),
          }),
        );
      });

      // Reviewer FAIL (rework attempt 2, issue 2) — the only existing ownerless test asserted
      // solely that `releaseContributors` was not called, which is also true if the save had
      // already crashed before reaching it (`saveContributors` catches everything into a 500).
      // This pins the actual Falsifier: the save must succeed (no 500), and the draft it writes
      // must carry `owner_initiative_id: null` (DD-5), not merely "didn't release".
      it('saving contributors on an ownerless (on-hold) result succeeds and saves a null-owner draft (PSR-T-6 regression, Falsifier)', async () => {
        const { rbi, shareRepo } = arrange();
        rbi.getOwnerInitiativeByResult = jest.fn().mockResolvedValue(null);

        const response = await service.saveContributors(
          10,
          { contributing_programs: [{ science_program_id: 'SP02' }] },
          user2,
        );

        expect(response.status).not.toBe(500);
        expect(response.message).toBe('Contributors saved successfully');
        expect(shareRepo.save).toHaveBeenCalledWith(
          expect.objectContaining({
            owner_initiative_id: null,
            shared_inititiative_id: 2,
            request_status_id: 4,
          }),
        );
        const primaryProgramRequestService =
          module.get<PrimaryProgramRequestService>(
            PrimaryProgramRequestService,
          ) as any;
        expect(
          primaryProgramRequestService.releaseContributors,
        ).not.toHaveBeenCalled();
      });

      // `PSR-T-6` (design.md §5 item 5, `PSR-R-12` "saved after accept") — regression: current
      // code never calls `releaseContributors`, so a draft saved (or reactivated) while the
      // result already has an owner would sit at status 4 forever instead of becoming a live
      // request.
      it('releases contributor drafts once an owner exists (PSR-T-6 regression)', async () => {
        arrange(); // default owner id 1
        const primaryProgramRequestService =
          module.get<PrimaryProgramRequestService>(
            PrimaryProgramRequestService,
          ) as any;

        await service.saveContributors(
          10,
          { contributing_programs: [{ science_program_id: 'SP02' }] },
          user2,
        );

        expect(
          primaryProgramRequestService.releaseContributors,
        ).toHaveBeenCalledWith(10);
      });

      it('does not release contributors while the result is still ownerless (PSR-T-6)', async () => {
        const { rbi } = arrange();
        rbi.getOwnerInitiativeByResult = jest.fn().mockResolvedValue(null);
        const primaryProgramRequestService =
          module.get<PrimaryProgramRequestService>(
            PrimaryProgramRequestService,
          ) as any;

        await service.saveContributors(
          10,
          { contributing_programs: [{ science_program_id: 'SP02' }] },
          user2,
        );

        expect(
          primaryProgramRequestService.releaseContributors,
        ).not.toHaveBeenCalled();
      });

      // `RRC-T-3` (`RRC-R-8`, `RRC-DD-5`) — while the result stays Rejected the contributors are
      // HELD: the drafts are written exactly as today, nothing is released (so no request and no
      // email reaches the Science Program) until the resubmission releases them.
      describe('RRC-T-3: at Rejected the contributors are held until Submit', () => {
        const arrangeAt = (statusId: number) => {
          const arranged = arrange();
          jest.spyOn(resultRepository, 'findOne').mockResolvedValue({
            id: 10,
            source: SourceEnum.Bilateral,
            status_id: statusId,
          } as any);
          return {
            ...arranged,
            primaryProgramRequestService:
              module.get<PrimaryProgramRequestService>(
                PrimaryProgramRequestService,
              ) as any,
          };
        };

        // Falsifier: a contributor save at 7 that calls `releaseContributors` must fail this.
        it('writes the draft but does NOT release it while the result is Rejected, even with an owner', async () => {
          const { shareRepo, primaryProgramRequestService } = arrangeAt(
            ResultStatusData.Rejected.value,
          );

          const response = await service.saveContributors(
            10,
            { contributing_programs: [{ science_program_id: 'SP02' }] },
            user2,
          );

          expect(response.message).toBe('Contributors saved successfully');
          expect(shareRepo.save).toHaveBeenCalledWith(
            expect.objectContaining({
              owner_initiative_id: 1,
              shared_inititiative_id: 2,
              request_status_id: 4,
            }),
          );
          expect(
            primaryProgramRequestService.releaseContributors,
          ).not.toHaveBeenCalled();
        });

        it('reactivates a dormant draft at Rejected without releasing it', async () => {
          const { shareRepo, primaryProgramRequestService } = arrangeAt(
            ResultStatusData.Rejected.value,
          );
          shareRepo.findOne = jest
            .fn()
            .mockResolvedValue({ share_result_request_id: 88 });

          await service.saveContributors(
            10,
            { contributing_programs: [{ science_program_id: 'SP02' }] },
            user2,
          );

          expect(shareRepo.update).toHaveBeenCalledWith(
            { share_result_request_id: 88 },
            { is_active: true, requested_by: user2.id },
          );
          expect(
            primaryProgramRequestService.releaseContributors,
          ).not.toHaveBeenCalled();
        });

        it('sends nothing to the contributor: no email path, no announcement', async () => {
          arrangeAt(ResultStatusData.Rejected.value);

          await service.saveContributors(
            10,
            { contributing_programs: [{ science_program_id: 'SP02' }] },
            user2,
          );

          expect(bilateralService.announcePendingReview).not.toHaveBeenCalled();
        });

        // Unchanged paths: with an owner, Editing (1) and Draft (8) still release on every save.
        it.each([
          [ResultStatusData.Editing.value, 'Editing'],
          [ResultStatusData.Draft.value, 'Draft'],
        ])(
          'at %i (%s) with an owner the save still releases (unchanged)',
          async (statusId) => {
            const { primaryProgramRequestService } = arrangeAt(statusId);

            await service.saveContributors(
              10,
              { contributing_programs: [{ science_program_id: 'SP02' }] },
              user2,
            );

            expect(
              primaryProgramRequestService.releaseContributors,
            ).toHaveBeenCalledWith(10);
          },
        );
      });
    });

    it('keeps the lead centre active even when the payload lists no centres at all', async () => {
      jest.spyOn(resultRepository, 'findOne').mockResolvedValue({
        id: 10,
        source: SourceEnum.Bilateral,
      } as any);
      const resultsCenterRepository = module.get<ResultsCenterRepository>(
        ResultsCenterRepository,
      );
      jest
        .spyOn(resultsCenterRepository, 'find')
        .mockResolvedValue([
          { center_id: 'LEAD', is_leading_result: true },
        ] as any);

      await service.saveContributors(10, { contributing_center: [] }, user);

      expect(resultsCenterRepository.updateCenter).toHaveBeenCalledWith(
        10,
        ['LEAD'],
        42,
      );
    });

    it('does not duplicate the lead centre when the payload already includes it', async () => {
      jest.spyOn(resultRepository, 'findOne').mockResolvedValue({
        id: 10,
        source: SourceEnum.Bilateral,
      } as any);
      const clarisaCentersRepository = module.get<ClarisaCentersRepository>(
        ClarisaCentersRepository,
      );
      const resultsCenterRepository = module.get<ResultsCenterRepository>(
        ResultsCenterRepository,
      );
      jest
        .spyOn(clarisaCentersRepository, 'find')
        .mockResolvedValue([{ institutionId: 501, code: 'LEAD' }] as any);
      jest
        .spyOn(resultsCenterRepository, 'find')
        .mockResolvedValue([
          { center_id: 'LEAD', is_leading_result: true },
        ] as any);

      await service.saveContributors(
        10,
        { contributing_center: [{ institution_id: 501 }] },
        user,
      );

      expect(resultsCenterRepository.updateCenter).toHaveBeenCalledWith(
        10,
        ['LEAD'],
        42,
      );
    });

    it('should sync-replace centers via updateCenter', async () => {
      jest.spyOn(resultRepository, 'findOne').mockResolvedValue({
        id: 10,
        source: SourceEnum.Bilateral,
      } as any);
      const clarisaCentersRepository = module.get<ClarisaCentersRepository>(
        ClarisaCentersRepository,
      );
      const resultsCenterRepository = module.get<ResultsCenterRepository>(
        ResultsCenterRepository,
      );
      jest
        .spyOn(clarisaCentersRepository, 'find')
        .mockResolvedValue([{ institutionId: 501, code: 'ABC' }] as any);

      const result = await service.saveContributors(
        10,
        { contributing_center: [{ institution_id: 501 }] },
        user,
      );

      expect(resultsCenterRepository.updateCenter).toHaveBeenCalledWith(
        10,
        ['ABC'],
        42,
      );
      expect(resultsCenterRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          result_id: 10,
          center_id: 'ABC',
          is_active: true,
        }),
      );
      expect(result.message).toBe('Contributors saved successfully');
    });

    it('should sync-replace projects via syncBilateralProjects and set is_lead', async () => {
      jest.spyOn(resultRepository, 'findOne').mockResolvedValue({
        id: 10,
        source: SourceEnum.Bilateral,
      } as any);
      const resultsByProjectsService = module.get<ResultsByProjectsService>(
        ResultsByProjectsService,
      );
      const resultsByProjectsRepository =
        module.get<ResultsByProjectsRepository>(ResultsByProjectsRepository);
      jest
        .spyOn(resultsByProjectsService, 'syncBilateralProjects')
        .mockResolvedValue({
          status: 200,
          message: 'ok',
          response: {
            set_active: [1, 2],
            deactivated: [3],
          },
        } as any);

      const result = await service.saveContributors(
        10,
        {
          contributing_bilateral_projects: [
            { project_id: 1, is_lead: true },
            { project_id: 2, is_lead: false },
          ],
        },
        user,
      );

      expect(
        resultsByProjectsService.syncBilateralProjects,
      ).toHaveBeenCalledWith(
        10,
        [
          { project_id: 1, is_lead: true },
          { project_id: 2, is_lead: false },
        ],
        42,
      );
      expect(resultsByProjectsRepository.update).toHaveBeenCalled();
      expect((result.response as any).deactivatedProjects).toEqual([3]);
      expect(result.message).toBe('Contributors saved successfully');
    });

    // BCT-T-3 (design §5.2) — the derivation is only worth its lookup cost when this save
    // actually touched the projects list; the guard is `dto.contributing_bilateral_projects
    // !== undefined`, independent of whether centers were also sent.
    describe('ensureDerivedContributingCenters call site', () => {
      beforeEach(() => {
        jest.spyOn(resultRepository, 'findOne').mockResolvedValue({
          id: 10,
          source: SourceEnum.Bilateral,
        } as any);
        (bilateralService as any).ensureDerivedContributingCenters = jest
          .fn()
          .mockResolvedValue(undefined);
      });

      it('is called when contributing_bilateral_projects is in the DTO', async () => {
        const resultsByProjectsService = module.get<ResultsByProjectsService>(
          ResultsByProjectsService,
        );
        jest
          .spyOn(resultsByProjectsService, 'syncBilateralProjects')
          .mockResolvedValue({
            status: 200,
            message: 'ok',
            response: { set_active: [], deactivated: [] },
          } as any);

        await service.saveContributors(
          10,
          { contributing_bilateral_projects: [] },
          user,
        );

        expect(
          bilateralService.ensureDerivedContributingCenters,
        ).toHaveBeenCalledWith(10, 42);
      });

      it('is NOT called when the save never mentions contributing_bilateral_projects', async () => {
        await service.saveContributors(10, { contributing_center: [] }, user);

        expect(
          bilateralService.ensureDerivedContributingCenters,
        ).not.toHaveBeenCalled();
      });

      // Reviewer FAIL (lens: resilience/test), attempt 1: moving the derivation call above
      // `syncContributingCenters` would let that sync undo the very reactivation derivation just
      // performed (R-3's "direct PATCH omitting → still active" scenario), and no test caught it.
      // `syncContributingCenters` is a real, unmocked private method here (spied, not replaced),
      // so this exercises the actual call order `saveContributors` produces, not a stand-in.
      it('runs derivation strictly after syncContributingCenters when both keys are sent', async () => {
        const syncSpy = jest.spyOn(service as any, 'syncContributingCenters');

        await service.saveContributors(
          10,
          { contributing_center: [], contributing_bilateral_projects: [] },
          user,
        );

        expect(syncSpy).toHaveBeenCalled();
        expect(
          bilateralService.ensureDerivedContributingCenters,
        ).toHaveBeenCalled();
        const syncOrder = syncSpy.mock.invocationCallOrder[0];
        const derivedOrder = (
          bilateralService.ensureDerivedContributingCenters as jest.Mock
        ).mock.invocationCallOrder[0];
        expect(derivedOrder).toBeGreaterThan(syncOrder);
      });
    });

    // BCT-T-5 falsifier — the Contributors save must never itself trigger a Pending Review
    // announcement; only `submitForReview` does. A save on an Editing/Draft result (BCT-R-10)
    // must produce no tagging notification either.
    it('never calls announcePendingReview from saveContributors', async () => {
      jest.spyOn(resultRepository, 'findOne').mockResolvedValue({
        id: 10,
        source: SourceEnum.Bilateral,
      } as any);
      const resultsByProjectsService = module.get<ResultsByProjectsService>(
        ResultsByProjectsService,
      );
      jest
        .spyOn(resultsByProjectsService, 'syncBilateralProjects')
        .mockResolvedValue({
          status: 200,
          message: 'ok',
          response: { set_active: [], deactivated: [] },
        } as any);

      await service.saveContributors(
        10,
        { contributing_center: [], contributing_bilateral_projects: [] },
        user,
      );

      expect(bilateralService.announcePendingReview).not.toHaveBeenCalled();
    });

    // P2-3443 — the External partners block. Everything here mirrors what pool funding writes in
    // `ResultsByInstitutionsService.savePartnersInstitutionsByResultV2`, on purpose: same table,
    // same role ids, same two flags on `result`. Diverging would hide bilateral partners from the
    // shared `validation_partners_*` MySQL functions instead of failing loudly.
    describe('external partners (P2-3443)', () => {
      const bilateral = { id: 10, source: SourceEnum.Bilateral } as any;
      let partnersRepository: any;
      let kpRepository: any;
      let clarisaInstitutions: any;

      beforeEach(() => {
        jest.spyOn(resultRepository, 'findOne').mockResolvedValue(bilateral);
        partnersRepository = module.get<ResultByIntitutionsRepository>(
          ResultByIntitutionsRepository,
        );
        kpRepository = module.get<ResultsKnowledgeProductsRepository>(
          ResultsKnowledgeProductsRepository,
        );
        clarisaInstitutions = module.get<ClarisaInstitutionsRepository>(
          ClarisaInstitutionsRepository,
        );
        clarisaInstitutions.find.mockImplementation(async (options: any) => {
          const ids = options?.where?.id?._value ?? [];
          return ids.map((id: number) => ({ id }));
        });
      });

      it('leaves the partner block untouched when none of its keys are sent', async () => {
        await service.saveContributors(10, { contributing_center: [] }, user);

        expect(partnersRepository.save).not.toHaveBeenCalled();
        expect(partnersRepository.update).not.toHaveBeenCalled();
        expect(resultRepository.update).not.toHaveBeenCalled();
      });

      it('creates a partner row with the PARTNER role for a non knowledge-product result', async () => {
        const result = await service.saveContributors(
          10,
          {
            institutions: [{ institutions_id: 3178 }],
            no_external_partners: false,
          },
          user,
        );

        expect(partnersRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            result_id: 10,
            institutions_id: 3178,
            institution_roles_id: InstitutionRoleEnum.PARTNER,
            is_active: true,
            created_by: 42,
          }),
        );
        expect((result.response as any).savedPartners).toEqual([
          { institutions_id: 3178 },
        ]);
        expect(result.message).toBe('Contributors saved successfully');
      });

      // Pool funding files partners of a knowledge product under role 8, not 2. Using 2 here would
      // make them invisible to the KP partners GET, which filters by role.
      it('uses the knowledge-product contributor role when the result has a KP row', async () => {
        kpRepository.findOne.mockResolvedValue({
          result_knowledge_product_id: 5,
        });

        await service.saveContributors(
          10,
          { institutions: [{ institutions_id: 3178 }] },
          user,
        );

        expect(partnersRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            institution_roles_id:
              InstitutionRoleEnum.KNOWLEDGE_PRODUCT_ADDITIONAL_CONTRIBUTORS,
          }),
        );
      });

      it('writes the two flags on the result row, not on a bilateral-only table', async () => {
        await service.saveContributors(
          10,
          {
            institutions: [],
            no_external_partners: true,
            is_lead_by_partner: false,
          },
          user,
        );

        expect(resultRepository.update).toHaveBeenCalledWith(10, {
          no_applicable_partner: true,
          is_lead_by_partner: false,
        });
      });

      it('deactivates every stored partner when "no external partners" is ticked', async () => {
        partnersRepository.find.mockResolvedValue([
          { id: 1, institutions_id: 100, is_active: true },
          { id: 2, institutions_id: 200, is_active: true },
        ]);

        const result = await service.saveContributors(
          10,
          { no_external_partners: true },
          user,
        );

        expect(partnersRepository.update).toHaveBeenCalledWith(
          expect.anything(),
          { is_active: false, last_updated_by: 42 },
        );
        expect((result.response as any).deactivatedPartners).toEqual([1, 2]);
        expect(partnersRepository.save).not.toHaveBeenCalled();
      });

      // The green check reads `institutions_count_leading <> 1 AND lead_by_partner = 1 THEN FALSE`
      // (migration 1762866499786), so hardcoding `false` here would make the Contributors section
      // impossible to complete whenever the result is led by a partner.
      it('honours is_leading_result on insert and on reactivation', async () => {
        await service.saveContributors(
          10,
          {
            is_lead_by_partner: true,
            institutions: [
              { institutions_id: 100, is_leading_result: true },
              { institutions_id: 200 },
            ],
          },
          user,
        );

        expect(partnersRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            institutions_id: 100,
            is_leading_result: true,
          }),
        );
        expect(partnersRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            institutions_id: 200,
            is_leading_result: false,
          }),
        );

        partnersRepository.save.mockClear();
        partnersRepository.find.mockResolvedValue([
          { id: 7, institutions_id: 100, is_active: false },
        ]);

        await service.saveContributors(
          10,
          {
            is_lead_by_partner: true,
            institutions: [{ institutions_id: 100, is_leading_result: true }],
          },
          user,
        );

        expect(partnersRepository.update).toHaveBeenCalledWith(
          { id: 7 },
          expect.objectContaining({ is_leading_result: true }),
        );
      });

      it('reactivates an existing row instead of inserting a duplicate', async () => {
        partnersRepository.find.mockResolvedValue([
          { id: 7, institutions_id: 100, is_active: false },
        ]);

        await service.saveContributors(
          10,
          { institutions: [{ institutions_id: 100 }] },
          user,
        );

        expect(partnersRepository.save).not.toHaveBeenCalled();
        expect(partnersRepository.update).toHaveBeenCalledWith(
          { id: 7 },
          expect.objectContaining({ is_active: true, last_updated_by: 42 }),
        );
      });

      it('deactivates the partners the user removed from the list', async () => {
        partnersRepository.find.mockResolvedValue([
          { id: 1, institutions_id: 100, is_active: true },
          { id: 2, institutions_id: 200, is_active: true },
        ]);

        const result = await service.saveContributors(
          10,
          { institutions: [{ institutions_id: 100 }] },
          user,
        );

        expect((result.response as any).deactivatedPartners).toEqual([2]);
      });

      it('reports an institution that is not in CLARISA instead of writing a dangling id', async () => {
        clarisaInstitutions.find.mockResolvedValue([]);

        const result = await service.saveContributors(
          10,
          { institutions: [{ institutions_id: 999999 }] },
          user,
        );

        expect(partnersRepository.save).not.toHaveBeenCalled();
        expect((result.response as any).failedPartners).toEqual([
          {
            institutions_id: 999999,
            reason: 'Institution not found in CLARISA',
          },
        ]);
        expect(result.message).toContain('1 failed partners');
      });
    });

    // BIL-RTE-T-2 — design §5.1: the Center-write decision, before any write. This wiring test
    // covers the arguments the helper is called with and reacts to deny/allow; the decision's own
    // admin/status logic is covered by `bilateral-access.service.spec.ts`.
    describe('Center-write access rule (BIL-RTE-T-2, design §5.1)', () => {
      it('falsifier (b): a non-admin denial returns 403 (via HttpException) and no repository write runs', async () => {
        jest.spyOn(resultRepository, 'findOne').mockResolvedValue({
          id: 10,
          status_id: ResultStatusData.PendingReview.value,
          source: SourceEnum.Bilateral,
        } as any);
        (
          bilateralAccessService.assertCenterWrite as jest.Mock
        ).mockRejectedValueOnce(
          new ForbiddenException(
            'Result 10 is under Science Program review (rule: center).',
          ),
        );
        const resultsCenterRepository = module.get<ResultsCenterRepository>(
          ResultsCenterRepository,
        );

        await expect(
          service.saveContributors(10, { contributing_center: [] }, user),
        ).rejects.toThrow(ForbiddenException);

        expect(bilateralAccessService.assertCenterWrite).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 10,
            status_id: ResultStatusData.PendingReview.value,
          }),
          'center-contributors',
          user,
        );
        expect(resultsCenterRepository.updateCenter).not.toHaveBeenCalled();
      });

      it('falsifier (c): an admin at status 5 proceeds to write', async () => {
        jest.spyOn(resultRepository, 'findOne').mockResolvedValue({
          id: 10,
          status_id: ResultStatusData.PendingReview.value,
          source: SourceEnum.Bilateral,
        } as any);
        const resultsCenterRepository = module.get<ResultsCenterRepository>(
          ResultsCenterRepository,
        );
        jest
          .spyOn(resultsCenterRepository, 'find')
          .mockResolvedValue([
            { center_id: 'LEAD', is_leading_result: true },
          ] as any);

        await service.saveContributors(10, { contributing_center: [] }, user);

        expect(bilateralAccessService.assertCenterWrite).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 10,
            status_id: ResultStatusData.PendingReview.value,
          }),
          'center-contributors',
          user,
        );
        expect(resultsCenterRepository.updateCenter).toHaveBeenCalled();
      });
    });
  });

  describe('changeResultType', () => {
    const user: TokenDto = {
      id: 42,
      email: 'center@cgiar.org',
      first_name: 'Center',
      last_name: 'User',
    };
    const promotedDraft = {
      id: 77,
      source: SourceEnum.Bilateral,
      is_active: true,
      creation_method: 'AI',
      status_id: ResultStatusData.Editing.value,
      result_level_id: 3,
      result_type_id: 2,
    };

    it('resets only type-specific records, updates the header and records the justification', async () => {
      (resultRepository.findOne as jest.Mock).mockResolvedValue(promotedDraft);

      const response = await service.changeResultType(user, 77, {
        result_level_id: 4,
        result_type_id: 7,
        justification: 'Classification corrected',
      });

      expect(response.response).toEqual({
        resultId: 77,
        result_level_id: 4,
        result_type_id: 7,
      });
      expect(resultRepository.manager.transaction).toHaveBeenCalled();
    });

    it('refuses a manual bilateral result', async () => {
      (resultRepository.findOne as jest.Mock).mockResolvedValue({
        ...promotedDraft,
        creation_method: 'MANUAL',
      });
      await expect(
        service.changeResultType(user, 77, {
          result_level_id: 4,
          result_type_id: 7,
          justification: 'Correction',
        }),
      ).rejects.toThrow('Only a result promoted from an AI draft');
    });

    it('validates and hydrates a Knowledge Product without using the legacy converter', async () => {
      (resultRepository.findOne as jest.Mock).mockResolvedValue(promotedDraft);
      await service.changeResultType(user, 77, {
        result_level_id: 4,
        result_type_id: 6,
        justification: 'It is a repository item',
        handle: '10568/175322',
      });
      expect(
        resultsKnowledgeProductsService.validateBilateralKPHandle,
      ).toHaveBeenCalledWith('10568/175322', user);
      expect(
        resultsKnowledgeProductsService.populateBilateralKPFromMetadata,
      ).toHaveBeenCalledWith(77, expect.any(Object), '10568/175322', user);
    });
  });

  describe('updatePrimaryAssignment', () => {
    const user: TokenDto = {
      id: 42,
      email: 'center@cgiar.org',
      first_name: 'Center',
      last_name: 'User',
    };

    const editingResult = {
      id: 11513,
      source: SourceEnum.Bilateral,
      is_active: true,
      status_id: ResultStatusData.Editing.value,
    };

    const primaryProgram = {
      programId: 701,
      programCode: 'SP04',
      allocation: '100',
      spName: 'Climate Action',
      spShortName: 'Climate Action',
    };

    const configureTransaction = () => {
      const projectRepository = {
        find: jest
          .fn()
          .mockResolvedValue([
            { id: 1, project_id: 10, is_lead: true, is_active: true },
          ]),
        findOne: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue({}),
        save: jest.fn().mockResolvedValue({}),
      };
      const initiativeRepository = {
        find: jest.fn().mockResolvedValue([
          {
            id: 2,
            initiative_id: 100,
            initiative_role_id: 1,
            is_active: true,
          },
        ]),
        findOne: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue({}),
        save: jest.fn().mockResolvedValue({}),
      };
      const historyRepository = { save: jest.fn().mockResolvedValue({}) };
      const requestRepository = {
        find: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue({}),
      };
      const fakeManager = {
        findOne: jest.fn().mockResolvedValue({ id: 11513 }),
        getRepository: jest.fn((entity: any) => {
          if (entity.name === 'ResultsByProjects') return projectRepository;
          if (entity.name === 'ResultsByInititiative')
            return initiativeRepository;
          if (entity.name === 'ShareResultRequest') return requestRepository;
          if (entity.name === 'ResultReviewHistory') return historyRepository;
          throw new Error(`Unexpected repository: ${entity.name}`);
        }),
      };

      (
        resultRepository.manager.transaction as jest.Mock
      ).mockImplementationOnce(async (callback: any) => callback(fakeManager));

      return {
        initiativeRepository,
        projectRepository,
        requestRepository,
        fakeManager,
      };
    };

    // `PSR-T-5` falsifier: "after ... updatePrimaryAssignment, an active role-1 row exists →
    // FAIL". design.md DD-2/DD-4 — a primary change requests the new SP instead of writing role
    // 1 (or deactivating the current owner) directly; role 1 is written only at accept (T-3/T-4).
    describe('PSR-T-5: requests the new SP instead of writing role 1', () => {
      beforeEach(() => {
        (resultRepository.findOne as jest.Mock).mockResolvedValue(
          editingResult,
        );
        (
          bilateralProjectsService.getProjectsByCenter as jest.Mock
        ).mockResolvedValue({
          projects: [{ id: 20, sciencePrograms: [primaryProgram] }],
        });
        (
          module.get<ClarisaInitiativesRepository>(
            ClarisaInitiativesRepository,
          ) as any
        ).findOne.mockResolvedValue({
          id: 404,
          official_code: 'SP04',
          active: true,
        });
      });

      // `PRA-R-2` (primary-review-not-accept): `configureTransaction()`'s default owner (100) makes
      // this a SWAP, which is now a direct transfer, never a request.
      it('resolves the internal CLARISA initiative id and transfers to it on a swap, writing no role-1 row itself', async () => {
        const clarisaInitiatives = module.get<ClarisaInitiativesRepository>(
          ClarisaInitiativesRepository,
        ) as any;
        const primaryProgramRequestService =
          module.get<PrimaryProgramRequestService>(
            PrimaryProgramRequestService,
          );
        const { initiativeRepository, fakeManager } = configureTransaction();

        const response = await service.updatePrimaryAssignment(user, 11513, {
          project_id: 20,
          primary_science_program_id: 701,
        });

        expect(clarisaInitiatives.findOne).toHaveBeenCalledWith({
          where: { official_code: 'SP04', active: true },
        });
        expect(
          primaryProgramRequestService.transferPrimary,
        ).toHaveBeenCalledWith(11513, 404, user, fakeManager, {
          releaseContributors: false,
        });
        expect(primaryProgramRequestService.request).not.toHaveBeenCalled();
        expect(initiativeRepository.save).not.toHaveBeenCalled();
        expect(initiativeRepository.update).not.toHaveBeenCalled();
        expect(response.response).toEqual(
          expect.objectContaining({ primaryScienceProgramId: 701 }),
        );
        expect(response.response).toHaveProperty('primary_request');
        expect(response.response).not.toHaveProperty('tocCleared');
      });

      // `PRA-R-2` supersedes DD-4: the swap is a direct transfer done by `transferPrimary` (mocked
      // here), so `updatePrimaryAssignment` itself never writes the old owner's role-1 row.
      it('does not write the old owner role-1 row itself on a swap (PRA-R-2: transferPrimary owns it)', async () => {
        const { initiativeRepository } = configureTransaction();

        await service.updatePrimaryAssignment(user, 11513, {
          project_id: 20,
          primary_science_program_id: 701,
        });

        expect(initiativeRepository.update).not.toHaveBeenCalledWith(
          2,
          expect.objectContaining({ is_active: false }),
        );
      });

      // `PNS-T-1` (requirements.md PNS-R-1, scope guard): the first pick on an ownerless result
      // (no active role-1 row) is saved as a DRAFT, not sent — distinct from the swap test above,
      // where `configureTransaction()`'s default active role-1 row makes `asDraft: false`. Must
      // be seen red against today's `request()` call, which passes no `opts` at all.
      it('passes asDraft: true for a first pick on an ownerless result (no active role-1 row)', async () => {
        const primaryProgramRequestService =
          module.get<PrimaryProgramRequestService>(
            PrimaryProgramRequestService,
          );
        const { initiativeRepository, fakeManager } = configureTransaction();
        initiativeRepository.find.mockResolvedValue([]);

        await service.updatePrimaryAssignment(user, 11513, {
          project_id: 20,
          primary_science_program_id: 701,
        });

        expect(primaryProgramRequestService.request).toHaveBeenCalledWith(
          11513,
          404,
          user,
          fakeManager,
          { asDraft: true },
        );
      });

      // `PSR-T-5` rework attempt 2 — Reviewer FAIL remediation (b): a result created before this
      // feature existed can be ownerless (no active role-1 row) while ALREADY carrying a sent
      // PENDING primary request (`findPendingPrimaryInitiativeId` resolves it). requirements.md §7
      // Compatibility — such a result "stays pending" and keeps using the old send-immediately
      // path; it must NOT be treated as a first pick / draft just because there is no owner yet.
      // Must be seen red against attempt-1 code, whose `asDraft` only checked
      // `currentPrimaryId === 0`.
      it('passes asDraft: false for an ownerless result that already has a pending primary request', async () => {
        const primaryProgramRequestService =
          module.get<PrimaryProgramRequestService>(
            PrimaryProgramRequestService,
          );
        const { initiativeRepository, fakeManager } = configureTransaction();
        initiativeRepository.find.mockResolvedValue([]);
        (
          primaryProgramRequestService.findPendingPrimaryInitiativeId as jest.Mock
        ).mockResolvedValueOnce(9);

        await service.updatePrimaryAssignment(user, 11513, {
          project_id: 20,
          primary_science_program_id: 701,
        });

        expect(primaryProgramRequestService.request).toHaveBeenCalledWith(
          11513,
          404,
          user,
          fakeManager,
          { asDraft: false },
        );
      });

      // "Also required" (Leader, rework attempt 2, promoted from advisory / binding forward
      // pointer #3): the pessimistic-write lock read must be the transaction's FIRST statement,
      // so a second concurrent pick blocks here instead of taking its snapshot before this one's
      // `request()` insert commits.
      it('locks the Result row first, before any other manager call', async () => {
        const { fakeManager } = configureTransaction();

        await service.updatePrimaryAssignment(user, 11513, {
          project_id: 20,
          primary_science_program_id: 701,
        });

        expect(fakeManager.findOne).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            where: { id: 11513 },
            lock: { mode: 'pessimistic_write' },
          }),
        );
        const lockOrder = (fakeManager.findOne as jest.Mock).mock
          .invocationCallOrder[0];
        const firstGetRepositoryOrder = (fakeManager.getRepository as jest.Mock)
          .mock.invocationCallOrder[0];
        expect(lockOrder).toBeLessThan(firstGetRepositoryOrder);
      });

      it('does not request again when the selected SP is unchanged', async () => {
        const primaryProgramRequestService =
          module.get<PrimaryProgramRequestService>(
            PrimaryProgramRequestService,
          );
        configureTransaction();
        // The already-active role-1 row's initiative_id (100) must resolve to the CLARISA id
        // CLARISA resolves for the chosen program, so `changed` is false.
        (
          module.get<ClarisaInitiativesRepository>(
            ClarisaInitiativesRepository,
          ) as any
        ).findOne.mockResolvedValue({
          id: 100,
          official_code: 'SP04',
          active: true,
        });

        await service.updatePrimaryAssignment(user, 11513, {
          project_id: 20,
          primary_science_program_id: 701,
        });

        expect(primaryProgramRequestService.request).not.toHaveBeenCalled();
      });

      // `PSR-T-5` reviewer FAIL (rework attempt 2, discovered issue 3 / judgment call 1): design.md
      // DD-8 "A Center pick starts a new round" — re-picking the CURRENT owner while a swap
      // request to a different SP is pending must cancel that pending/declined round, or the
      // stale request stays active and its SP could still accept later against the Center's
      // latest choice.
      it('cancels an open pending/declined round when the Center re-picks the current owner', async () => {
        const { requestRepository } = configureTransaction();
        // The already-active role-1 row's initiative_id (100) resolves to the same CLARISA id
        // as the chosen program, so `changed` is false — the Center re-picked its current owner.
        (
          module.get<ClarisaInitiativesRepository>(
            ClarisaInitiativesRepository,
          ) as any
        ).findOne.mockResolvedValue({
          id: 100,
          official_code: 'SP04',
          active: true,
        });
        requestRepository.find.mockResolvedValue([
          { share_result_request_id: 77 },
          { share_result_request_id: 78 },
        ]);

        await service.updatePrimaryAssignment(user, 11513, {
          project_id: 20,
          primary_science_program_id: 701,
        });

        expect(requestRepository.find).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              result_id: 11513,
              request_type: 'primary',
              is_active: true,
            }),
          }),
        );
        expect(requestRepository.update).toHaveBeenCalledWith(
          { share_result_request_id: expect.anything() },
          { is_active: false },
        );
        const [criteria] = requestRepository.update.mock.calls[0];
        expect(criteria.share_result_request_id.value).toEqual([77, 78]);
      });

      // `PRA-R-2` "BUT IT MUST still refuse an SP that is not an alignment of the lead project
      // (same message as today)": a swap to a non-aligned SP is a 400 and transfers nothing.
      it('swap to a non-aligned SP → 400 with the not-aligned message, transferPrimary not called (PRA-R-2)', async () => {
        const primaryProgramRequestService =
          module.get<PrimaryProgramRequestService>(
            PrimaryProgramRequestService,
          );
        (
          primaryProgramRequestService.isAligned as jest.Mock
        ).mockResolvedValueOnce(false);
        const { fakeManager } = configureTransaction();

        await expect(
          service.updatePrimaryAssignment(user, 11513, {
            project_id: 20,
            primary_science_program_id: 701,
          }),
        ).rejects.toThrow(PrimaryProgramRequestService.NOT_ALIGNED_MESSAGE);
        expect(primaryProgramRequestService.isAligned).toHaveBeenCalledWith(
          20,
          404,
          fakeManager,
        );
        expect(
          primaryProgramRequestService.transferPrimary,
        ).not.toHaveBeenCalled();
        expect(primaryProgramRequestService.request).not.toHaveBeenCalled();
      });

      // requirements.md §7 Reliability — an internal error is logged, never fails the save.
      it('still saves the lead project/percentage when the first-pick request fails unexpectedly', async () => {
        const primaryProgramRequestService =
          module.get<PrimaryProgramRequestService>(
            PrimaryProgramRequestService,
          );
        (
          primaryProgramRequestService.request as jest.Mock
        ).mockResolvedValueOnce({ ok: false, reason: 'internal_error' });
        const logger = jest
          .spyOn((service as any).logger, 'warn')
          .mockImplementation(() => undefined);
        // First pick (no owner): the only path that still sends a request (`PRA-R-2` unchanged).
        configureTransaction().initiativeRepository.find.mockResolvedValue([]);

        const response = await service.updatePrimaryAssignment(user, 11513, {
          project_id: 20,
          primary_science_program_id: 701,
        });

        expect(response.response.resultId).toBe(11513);
        expect(logger).toHaveBeenCalledWith(
          expect.stringContaining('primary program request failed'),
        );
      });
    });

    // P2-3760 — the Contribution % the bilateral form now asks for (P2-3352 § 6).
    describe('contribution percentage', () => {
      const withCatalogue = () => {
        (resultRepository.findOne as jest.Mock).mockResolvedValue(
          editingResult,
        );
        (
          bilateralProjectsService.getProjectsByCenter as jest.Mock
        ).mockResolvedValue({
          projects: [{ id: 20, sciencePrograms: [primaryProgram] }],
        });
        (
          module.get<ClarisaInitiativesRepository>(
            ClarisaInitiativesRepository,
          ) as any
        ).findOne.mockResolvedValue({
          id: 404,
          official_code: 'SP04',
          active: true,
        });
      };

      it('persists it on the newly created lead row, with two decimals', async () => {
        withCatalogue();
        const { projectRepository } = configureTransaction();

        await service.updatePrimaryAssignment(user, 11513, {
          project_id: 20,
          primary_science_program_id: 701,
          contribution_percentage: 42.5,
        });

        expect(projectRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            project_id: 20,
            contribution_percentage: '42.50',
          }),
        );
      });

      // An older client does not send the key. If the write went through anyway it would blank a
      // stored percentage on every project change — the compatibility trap this guards.
      it('does not touch the stored value when the client omits it', async () => {
        withCatalogue();
        const { projectRepository } = configureTransaction();

        await service.updatePrimaryAssignment(user, 11513, {
          project_id: 20,
          primary_science_program_id: 701,
        });

        const savedRow = projectRepository.save.mock.calls[0][0];
        expect(savedRow).not.toHaveProperty('contribution_percentage');
        for (const call of projectRepository.update.mock.calls) {
          expect(call[1]).not.toHaveProperty('contribution_percentage');
        }
      });

      it('updates the percentage alone when the lead row is already the selected project', async () => {
        withCatalogue();
        const { projectRepository } = configureTransaction();
        projectRepository.find.mockResolvedValue([
          { id: 9, project_id: 20, is_lead: true, is_active: true },
        ]);
        projectRepository.findOne.mockResolvedValue({
          id: 9,
          project_id: 20,
          is_lead: true,
          is_active: true,
        });

        await service.updatePrimaryAssignment(user, 11513, {
          project_id: 20,
          primary_science_program_id: 701,
          contribution_percentage: 75,
        });

        expect(projectRepository.save).not.toHaveBeenCalled();
        expect(projectRepository.update).toHaveBeenCalledWith(
          9,
          expect.objectContaining({ contribution_percentage: '75.00' }),
        );
      });
    });

    it('fails before opening a transaction when the mapped program is absent from CLARISA', async () => {
      (resultRepository.findOne as jest.Mock).mockResolvedValue(editingResult);
      (
        bilateralProjectsService.getProjectsByCenter as jest.Mock
      ).mockResolvedValue({
        projects: [{ id: 20, sciencePrograms: [primaryProgram] }],
      });
      const clarisaInitiatives = module.get<ClarisaInitiativesRepository>(
        ClarisaInitiativesRepository,
      ) as any;
      clarisaInitiatives.findOne.mockResolvedValue(null);

      await expect(
        service.updatePrimaryAssignment(user, 11513, {
          project_id: 20,
          primary_science_program_id: 701,
        }),
      ).rejects.toThrow('not available in the CLARISA catalogue');
      expect(resultRepository.manager.transaction).not.toHaveBeenCalled();
    });

    // P2-3807 — the form lets an admin edit Project Information; the save must not 403.
    it('lets an admin without the Center User role save the assignment', async () => {
      (resultRepository.findOne as jest.Mock).mockResolvedValue(editingResult);
      const roleByUserRepository =
        module.get<RoleByUserRepository>(RoleByUserRepository);
      (roleByUserRepository.isUserAdmin as jest.Mock).mockResolvedValueOnce(
        true,
      );
      (
        roleByUserRepository.validationCenterPermissions as jest.Mock
      ).mockResolvedValue(0);
      (
        bilateralProjectsService.getProjectsByCenter as jest.Mock
      ).mockResolvedValue({
        projects: [{ id: 20, sciencePrograms: [primaryProgram] }],
      });
      const clarisaInitiatives = module.get<ClarisaInitiativesRepository>(
        ClarisaInitiativesRepository,
      ) as any;
      clarisaInitiatives.findOne.mockResolvedValue({
        id: 404,
        official_code: 'SP04',
        active: true,
      });
      configureTransaction();

      await service.updatePrimaryAssignment(user, 11513, {
        project_id: 20,
        primary_science_program_id: 701,
        contribution_percentage: 42,
      });

      expect(
        roleByUserRepository.validationCenterPermissions,
      ).not.toHaveBeenCalled();
      expect(resultRepository.manager.transaction).toHaveBeenCalled();
    });

    it('still refuses a non-admin without the Center User role on the lead centre', async () => {
      (resultRepository.findOne as jest.Mock).mockResolvedValue(editingResult);
      const roleByUserRepository =
        module.get<RoleByUserRepository>(RoleByUserRepository);
      (
        roleByUserRepository.validationCenterPermissions as jest.Mock
      ).mockResolvedValue(0);

      await expect(
        service.updatePrimaryAssignment(user, 11513, {
          project_id: 20,
          primary_science_program_id: 701,
        }),
      ).rejects.toThrow(ForbiddenException);
      expect(resultRepository.manager.transaction).not.toHaveBeenCalled();
    });

    // `PSR-T-5` reviewer FAIL (rework attempt 2, discovered issue 4 / judgment call 2):
    // `buildPrimaryRequestState` checks the role-1 owner BEFORE `stateFor`, value tests per the
    // Reviewer's matrix.
    describe('primary_request value (buildPrimaryRequestState)', () => {
      const setUp = (
        owner: { id: number; official_code?: string } | null,
        state: {
          state: string;
          program_code: string | null;
          declined_by_codes: string[];
        },
      ) => {
        (resultRepository.findOne as jest.Mock).mockResolvedValue(
          editingResult,
        );
        (
          bilateralProjectsService.getProjectsByCenter as jest.Mock
        ).mockResolvedValue({
          projects: [{ id: 20, sciencePrograms: [primaryProgram] }],
        });
        (
          module.get<ClarisaInitiativesRepository>(
            ClarisaInitiativesRepository,
          ) as any
        ).findOne.mockResolvedValue({
          id: 404,
          official_code: 'SP04',
          active: true,
        });
        const resultByInitiativesRepository =
          module.get<ResultByInitiativesRepository>(
            ResultByInitiativesRepository,
          );
        (
          resultByInitiativesRepository.getOwnerInitiativeByResult as jest.Mock
        ).mockResolvedValueOnce(owner);
        const primaryProgramRequestService =
          module.get<PrimaryProgramRequestService>(
            PrimaryProgramRequestService,
          );
        (
          primaryProgramRequestService.stateFor as jest.Mock
        ).mockResolvedValueOnce(state);
        configureTransaction();
      };

      it('no owner, no primary rows → none', async () => {
        setUp(null, {
          state: 'none',
          program_code: null,
          declined_by_codes: [],
        });

        const response = await service.updatePrimaryAssignment(user, 11513, {
          project_id: 20,
          primary_science_program_id: 701,
        });

        expect(response.response.primary_request).toEqual({
          state: 'none',
          program_code: null,
          declined_by_codes: [],
        });
      });

      it('legacy owner (no primary rows at all) → accepted', async () => {
        setUp(
          { id: 55, official_code: 'SP09' },
          { state: 'none', program_code: null, declined_by_codes: [] },
        );

        const response = await service.updatePrimaryAssignment(user, 11513, {
          project_id: 20,
          primary_science_program_id: 701,
        });

        expect(response.response.primary_request).toEqual({
          state: 'accepted',
          program_code: 'SP09',
          declined_by_codes: [],
        });
      });

      it('legacy owner + pending swap → accepted (owner wins over stateFor)', async () => {
        setUp(
          { id: 55, official_code: 'SP09' },
          { state: 'pending', program_code: 'SP12', declined_by_codes: [] },
        );

        const response = await service.updatePrimaryAssignment(user, 11513, {
          project_id: 20,
          primary_science_program_id: 701,
        });

        expect(response.response.primary_request).toEqual({
          state: 'accepted',
          program_code: 'SP09',
          declined_by_codes: [],
        });
      });

      it('ownerless, pending request → pending', async () => {
        setUp(null, {
          state: 'pending',
          program_code: 'SP12',
          declined_by_codes: [],
        });

        const response = await service.updatePrimaryAssignment(user, 11513, {
          project_id: 20,
          primary_science_program_id: 701,
        });

        expect(response.response.primary_request).toEqual({
          state: 'pending',
          program_code: 'SP12',
          declined_by_codes: [],
        });
      });

      it('ownerless, declined round → sent_back', async () => {
        setUp(null, {
          state: 'sent_back',
          program_code: null,
          declined_by_codes: ['SP09'],
        });

        const response = await service.updatePrimaryAssignment(user, 11513, {
          project_id: 20,
          primary_science_program_id: 701,
        });

        expect(response.response.primary_request).toEqual({
          state: 'sent_back',
          program_code: null,
          declined_by_codes: ['SP09'],
        });
      });
    });

    // `RRC-T-2` (bilateral/rejected-result-correction; `RRC-R-9` / `R-10` / `R-12` / `R-18`,
    // `RRC-DD-3` / `DD-4`). On a Rejected result (status 7) a change of primary SP is a DIRECT
    // transfer — `transferPrimary` (T-1) inside the same transaction, never an ownership request.
    // Editing (1) and Draft (8) keep the request flow, which the `PSR-T-5` tests above pin.
    describe('RRC-T-2: a Rejected result changes its primary SP by direct transfer', () => {
      const GATE_MESSAGE =
        'The lead project and primary Science Program can only be changed while the result is in Editing, Draft or Rejected.';
      const RESULT = 11513;
      let primaryProgramRequestService: any;

      const arrange = (
        statusId: number,
        options: { programs?: any[]; clarisaId?: number | string } = {},
      ) => {
        (resultRepository.findOne as jest.Mock).mockResolvedValue({
          ...editingResult,
          status_id: statusId,
        });
        (
          bilateralProjectsService.getProjectsByCenter as jest.Mock
        ).mockResolvedValue({
          projects: [
            {
              id: 20,
              sciencePrograms: options.programs ?? [primaryProgram],
            },
          ],
        });
        (
          module.get<ClarisaInitiativesRepository>(
            ClarisaInitiativesRepository,
          ) as any
        ).findOne.mockResolvedValue({
          id: options.clarisaId ?? 404,
          official_code: 'SP04',
          active: true,
        });
      };

      const pick = () =>
        service.updatePrimaryAssignment(user, RESULT, {
          project_id: 20,
          primary_science_program_id: 701,
        });

      beforeEach(() => {
        primaryProgramRequestService = module.get<PrimaryProgramRequestService>(
          PrimaryProgramRequestService,
        );
        // `RRC-T-1`'s core. Default: the SP changed (the configured owner is initiative 100).
        primaryProgramRequestService.transferPrimary = jest
          .fn()
          .mockResolvedValue({
            outcome: 'transferred',
            previousInitiativeId: 100,
          });
      });

      // The status gate, all eight statuses: only Editing (1), Draft (8) and Rejected (7) pass.
      it.each([
        [ResultStatusData.Editing.value, 'Editing', true],
        [ResultStatusData.QualityAssessed.value, 'QualityAssessed', false],
        [ResultStatusData.Submitted.value, 'Submitted', false],
        [ResultStatusData.Discontinued.value, 'Discontinued', false],
        [ResultStatusData.PendingReview.value, 'PendingReview', false],
        [ResultStatusData.Approved.value, 'Approved', false],
        [ResultStatusData.Rejected.value, 'Rejected', true],
        [ResultStatusData.Draft.value, 'Draft', true],
      ])(
        'status gate: %i (%s) passes = %s',
        async (statusId, _name, passes) => {
          arrange(statusId);
          if (passes) configureTransaction();

          if (passes) {
            await expect(pick()).resolves.toEqual(
              expect.objectContaining({ status: 200 }),
            );
            expect(resultRepository.manager.transaction).toHaveBeenCalled();
          } else {
            await expect(pick()).rejects.toThrow(GATE_MESSAGE);
            expect(resultRepository.manager.transaction).not.toHaveBeenCalled();
          }
          if (!passes) {
            expect(primaryProgramRequestService.request).not.toHaveBeenCalled();
            expect(
              primaryProgramRequestService.transferPrimary,
            ).not.toHaveBeenCalled();
          }
        },
      );

      // `RRC-R-10` falsifier: at 7 the change must NOT go through the request flow.
      it('at Rejected, a changed primary SP is transferred directly and no ownership request is sent', async () => {
        arrange(ResultStatusData.Rejected.value);
        const { fakeManager, initiativeRepository } = configureTransaction();

        const response = await pick();

        expect(
          primaryProgramRequestService.transferPrimary,
        ).toHaveBeenCalledTimes(1);
        expect(
          primaryProgramRequestService.transferPrimary,
        ).toHaveBeenCalledWith(RESULT, 404, user, fakeManager, {
          releaseContributors: false,
        });
        expect(primaryProgramRequestService.request).not.toHaveBeenCalled();
        // role 1 is written by the core, never here
        expect(initiativeRepository.save).not.toHaveBeenCalled();
        expect(initiativeRepository.update).not.toHaveBeenCalled();
        expect(response.response).toEqual(
          expect.objectContaining({
            resultId: RESULT,
            primaryScienceProgramId: 701,
          }),
        );
      });

      // T-1 forward pointer: a string id would look like a change to the core's strict compare
      // and silently retire the SP's real ToC mapping.
      it('at Rejected, passes the CLARISA initiative id to the core as a number', async () => {
        arrange(ResultStatusData.Rejected.value, { clarisaId: '404' });
        configureTransaction();

        await pick();

        const [, newInitiativeId] =
          primaryProgramRequestService.transferPrimary.mock.calls[0];
        expect(newInitiativeId).toBe(404);
      });

      // T-1 forward pointer: the core does not lock — the Result row lock is the transaction's
      // first statement and happens before the transfer.
      it('at Rejected, locks the Result row before calling the core', async () => {
        arrange(ResultStatusData.Rejected.value);
        const { fakeManager } = configureTransaction();

        await pick();

        expect(fakeManager.findOne).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            where: { id: RESULT },
            lock: { mode: 'pessimistic_write' },
          }),
        );
        const lockOrder = (fakeManager.findOne as jest.Mock).mock
          .invocationCallOrder[0];
        const firstRepositoryOrder = (fakeManager.getRepository as jest.Mock)
          .mock.invocationCallOrder[0];
        const transferOrder =
          primaryProgramRequestService.transferPrimary.mock
            .invocationCallOrder[0];
        expect(lockOrder).toBeLessThan(firstRepositoryOrder);
        expect(lockOrder).toBeLessThan(transferOrder);
      });

      it('at Rejected, still saves the lead project and writes the review-history row', async () => {
        arrange(ResultStatusData.Rejected.value);
        const { projectRepository, fakeManager } = configureTransaction();
        const historyRepository = (fakeManager.getRepository as jest.Mock)({
          name: 'ResultReviewHistory',
        });

        await pick();

        expect(projectRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            result_id: RESULT,
            project_id: 20,
            is_lead: true,
          }),
        );
        expect(historyRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            result_id: RESULT,
            comment: 'Updated lead project and primary Science Program',
          }),
        );
      });

      // `RRC-R-9`: the catalogue allocation check is unchanged and runs before anything is written.
      it('at Rejected, refuses an SP not allocated to the project: existing message, no transfer, no writes', async () => {
        arrange(ResultStatusData.Rejected.value, {
          programs: [{ ...primaryProgram, programId: 999 }],
        });

        await expect(pick()).rejects.toThrow(
          'The selected primary Science Program is not allocated to the selected project.',
        );

        expect(resultRepository.manager.transaction).not.toHaveBeenCalled();
        expect(
          primaryProgramRequestService.transferPrimary,
        ).not.toHaveBeenCalled();
        expect(primaryProgramRequestService.request).not.toHaveBeenCalled();
      });

      // `RRC-R-10` change of mind: SP12 then SP09 again — the core answers `unchanged` for the
      // second pick; nothing is sent, and the Editing/Draft "re-pick starts a new round" branch
      // (which cancels open rounds) does not run on a Rejected result.
      it('at Rejected, re-picking the current SP sends nothing and cancels no round', async () => {
        arrange(ResultStatusData.Rejected.value);
        primaryProgramRequestService.transferPrimary.mockResolvedValue({
          outcome: 'unchanged',
          previousInitiativeId: 404,
        });
        const { requestRepository } = configureTransaction();

        const response = await pick();

        expect(primaryProgramRequestService.request).not.toHaveBeenCalled();
        expect(requestRepository.find).not.toHaveBeenCalled();
        expect(requestRepository.update).not.toHaveBeenCalled();
        expect(response.status).toBe(200);
      });

      // `RRC-R-18`: one log line per transfer — ids only (`.cursorrules`).
      it('at Rejected, logs one line per transfer with the result, old and new initiative and user ids', async () => {
        arrange(ResultStatusData.Rejected.value);
        configureTransaction();
        const log = jest
          .spyOn((service as any).logger, 'log')
          .mockImplementation(() => undefined);

        await pick();

        expect(log).toHaveBeenCalledTimes(1);
        const line = String(log.mock.calls[0][0]);
        expect(line).toContain('11513');
        expect(line).toContain('100');
        expect(line).toContain('404');
        expect(line).toContain('42');
        expect(line).not.toContain(user.email);
      });

      it('at Rejected, logs nothing when the core reports the SP unchanged', async () => {
        arrange(ResultStatusData.Rejected.value);
        primaryProgramRequestService.transferPrimary.mockResolvedValue({
          outcome: 'unchanged',
          previousInitiativeId: 404,
        });
        configureTransaction();
        const log = jest
          .spyOn((service as any).logger, 'log')
          .mockImplementation(() => undefined);

        await pick();

        expect(log).not.toHaveBeenCalled();
      });

      it('at Rejected, a failing transfer propagates so the transaction rolls back, and no history row is written', async () => {
        arrange(ResultStatusData.Rejected.value);
        primaryProgramRequestService.transferPrimary.mockRejectedValue(
          new Error('insert failed'),
        );
        const { fakeManager } = configureTransaction();
        const historyRepository = (fakeManager.getRepository as jest.Mock)({
          name: 'ResultReviewHistory',
        });

        await expect(pick()).rejects.toThrow('insert failed');

        expect(historyRepository.save).not.toHaveBeenCalled();
      });

      // `RRC-R-12` / `RRC-DD-4`: Editing and Draft keep the request flow and never transfer.
      it.each([
        [ResultStatusData.Editing.value, 'Editing'],
        [ResultStatusData.Draft.value, 'Draft'],
      ])(
        // `PRA-R-2` supersedes `RRC-R-12` for a swap: at Editing/Draft with an owner the change is
        // now a direct transfer too (no request); a first pick still drafts a request.
        'at %i (%s), a changed primary SP on an owned result is a direct transfer, no request (PRA-R-2)',
        async (statusId) => {
          arrange(statusId);
          const { fakeManager } = configureTransaction();

          await pick();

          expect(
            primaryProgramRequestService.transferPrimary,
          ).toHaveBeenCalledWith(RESULT, 404, user, fakeManager, {
            releaseContributors: false,
          });
          expect(primaryProgramRequestService.request).not.toHaveBeenCalled();
        },
      );

      // Does the pending-primary block of `assertSubmittable` fire after a transfer at 7?
      // `assertSubmittable` still rejects status 7 by status (`RRC-T-3` widens that set), so the
      // method cannot be driven AT 7 yet. What it reads for the pending block is the real
      // `findPendingPrimaryInitiativeId`, so these tests run the REAL core and the real finder over
      // one in-memory model of the tables (the model of `RRC-T-1`: it proves the code targets the
      // right rows, not that MySQL agrees — `RRC-T-10` checks the real rows) and then call
      // `assertSubmittable` with the result row presented as Editing, i.e. past the status gate it
      // does not own, on exactly the rows the transfer left behind. That stays valid after T-3.
      describe('the pending-primary block of assertSubmittable is not hit after the save', () => {
        const PK = new Map<EntityClass, string>([
          [ShareResultRequest, 'share_result_request_id'],
          [ResultsTocResult, 'result_toc_result_id'],
        ]);
        // A result rejected by review: the rejection deactivated every share request (the accepted
        // `primary` row included — `RRC-P-6`) and left role 1 of the old SP untouched (`RRC-P-10`).
        const rejectedByReview = (): Array<[EntityClass, Row[]]> => [
          [
            ResultsByProjects,
            [
              {
                id: 1,
                result_id: RESULT,
                project_id: 20,
                is_lead: true,
                is_active: 1,
              },
            ],
          ],
          [
            ResultsByInititiative,
            [
              {
                id: 2,
                result_id: RESULT,
                initiative_id: 100,
                initiative_role_id: 1,
                is_active: 1,
              },
            ],
          ],
          [
            ShareResultRequest,
            [
              {
                share_result_request_id: 10,
                result_id: RESULT,
                request_type: 'primary',
                shared_inititiative_id: 100,
                request_status_id: 2,
                is_active: 0,
              },
            ],
          ],
          [
            ResultsTocResult,
            [
              {
                result_toc_result_id: 1,
                result_id: RESULT,
                initiative_ids: 100,
                toc_result_id: 555,
                is_active: 1,
              },
            ],
          ],
          [ResultReviewHistory, []],
        ];

        const arrangeRealCore = (ownerAfterSave: number) => {
          const db = createInMemoryDb(rejectedByReview(), {
            writes: true,
            pk: PK,
          });
          const requests = db.repositoryOf(ShareResultRequest);
          const real = new (PrimaryProgramRequestService as any)(requests, {
            findOne: async ({ where }: any) => ({
              id: where.id,
              official_code: `SP-${where.id}`,
            }),
          }) as PrimaryProgramRequestService;
          (service as any).primaryProgramRequestService = real;
          (
            resultRepository.manager.transaction as jest.Mock
          ).mockImplementationOnce(async (callback: any) =>
            db.dataSource.transaction((manager: any) =>
              callback(
                new Proxy(manager, {
                  get: (target, prop) =>
                    prop === 'findOne'
                      ? jest.fn().mockResolvedValue({ id: RESULT })
                      : target[prop],
                }),
              ),
            ),
          );
          (
            module.get<ResultByInitiativesRepository>(
              ResultByInitiativesRepository,
            ).getOwnerInitiativeByResult as jest.Mock
          ).mockResolvedValue({ id: ownerAfterSave, official_code: 'SP04' });
          (
            module.get<RoleByUserRepository>(RoleByUserRepository)
              .isUserAdmin as jest.Mock
          ).mockResolvedValue(true);
          return { db, real };
        };

        const activePrimaryRequests = (
          db: ReturnType<typeof createInMemoryDb>,
        ) =>
          db
            .rowsOf(ShareResultRequest)
            .filter(
              (row) => row.request_type === 'primary' && row.is_active === 1,
            )
            .map((row) => ({
              sp: row.shared_inititiative_id,
              status: row.request_status_id,
            }));

        const submitGateAsEditing = () => {
          (resultRepository.findOne as jest.Mock).mockResolvedValue({
            ...editingResult,
            id: RESULT,
            status_id: ResultStatusData.Editing.value,
          });
          return (service as any).assertSubmittable(user, RESULT);
        };

        it('after a transfer: one ACCEPTED primary row, no pending round, and the owner is the new SP', async () => {
          arrange(ResultStatusData.Rejected.value, { clarisaId: 404 });
          const { db, real } = arrangeRealCore(404);

          await pick();

          expect(
            db
              .rowsOf(ResultsByInititiative)
              .filter(
                (row) => row.initiative_role_id === 1 && row.is_active === 1,
              )
              .map((row) => row.initiative_id),
          ).toEqual([404]);
          expect(activePrimaryRequests(db)).toEqual([{ sp: 404, status: 2 }]);
          await expect(
            real.findPendingPrimaryInitiativeId(RESULT),
          ).resolves.toBeNull();
          await expect(submitGateAsEditing()).resolves.toEqual(
            expect.objectContaining({ id: RESULT }),
          );
          expect(db.rowsOf(ResultReviewHistory)).toHaveLength(1);
          expect(db.world.violations).toEqual([]);
        });

        it('after a re-pick of the current SP (stateFor none, role-1 owner present): nothing written to requests, no pending round', async () => {
          arrange(ResultStatusData.Rejected.value, { clarisaId: 100 });
          const { db, real } = arrangeRealCore(100);

          await pick();

          expect(
            db.updated.filter((u) => u.entity === 'ShareResultRequest'),
          ).toEqual([]);
          expect(
            db.inserted.filter((i) => i.entity === 'ShareResultRequest'),
          ).toEqual([]);
          expect(activePrimaryRequests(db)).toEqual([]);
          await expect(real.stateFor(RESULT)).resolves.toEqual({
            state: PrimaryRequestStateEnum.NONE,
            program_code: null,
            declined_by_codes: [],
          });
          await expect(
            real.findPendingPrimaryInitiativeId(RESULT),
          ).resolves.toBeNull();
          await expect(submitGateAsEditing()).resolves.toEqual(
            expect.objectContaining({ id: RESULT }),
          );
          expect(db.world.violations).toEqual([]);
        });

        // `RRC-T-3` forward pointer (from T-2): `assertSubmittable` now admits status 7, so the
        // same two scenarios run with the row at a REAL status 7 — the status gate is exercised,
        // not presented as Editing — and the pending-primary block must still not fire.
        const submitGateAtRejected = () => {
          (resultRepository.findOne as jest.Mock).mockResolvedValue({
            ...editingResult,
            id: RESULT,
            status_id: ResultStatusData.Rejected.value,
          });
          return (service as any).assertSubmittable(user, RESULT);
        };

        it('at a real status 7, after a transfer: the pending-primary block does not fire', async () => {
          arrange(ResultStatusData.Rejected.value, { clarisaId: 404 });
          const { db, real } = arrangeRealCore(404);

          await pick();

          await expect(
            real.findPendingPrimaryInitiativeId(RESULT),
          ).resolves.toBeNull();
          await expect(submitGateAtRejected()).resolves.toEqual(
            expect.objectContaining({
              id: RESULT,
              status_id: ResultStatusData.Rejected.value,
            }),
          );
          expect(db.world.violations).toEqual([]);
        });

        it('at a real status 7, after a re-pick of the current SP (stateFor none, role-1 owner present): the pending-primary block does not fire', async () => {
          arrange(ResultStatusData.Rejected.value, { clarisaId: 100 });
          const { db, real } = arrangeRealCore(100);

          await pick();

          await expect(real.stateFor(RESULT)).resolves.toEqual({
            state: PrimaryRequestStateEnum.NONE,
            program_code: null,
            declined_by_codes: [],
          });
          await expect(
            real.findPendingPrimaryInitiativeId(RESULT),
          ).resolves.toBeNull();
          await expect(submitGateAtRejected()).resolves.toEqual(
            expect.objectContaining({
              id: RESULT,
              status_id: ResultStatusData.Rejected.value,
            }),
          );
          expect(db.world.violations).toEqual([]);
        });
      });
    });
  });

  // `PSR-T-6` (design.md §4 "Bilateral center result initiative/header read … Gains
  // `primary_request`") — regression: current `getResultInitiativeId` response has no
  // `primary_request` key at all.
  describe('getResultInitiativeId — primary_request (PSR-T-6 regression)', () => {
    it('includes primary_request built from the owner + stateFor', async () => {
      const resultByInitiativesRepository =
        module.get<ResultByInitiativesRepository>(
          ResultByInitiativesRepository,
        );
      (
        resultByInitiativesRepository.getOwnerInitiativeByResult as jest.Mock
      ).mockResolvedValue({
        id: 9,
        official_code: 'SP09',
        initiative_name: 'Science Program 09',
      });

      const response = await service.getResultInitiativeId(11513);

      expect(response.response).toEqual(
        expect.objectContaining({
          initiativeId: 9,
          officialCode: 'SP09',
          primary_request: {
            state: 'accepted',
            program_code: 'SP09',
            declined_by_codes: [],
          },
        }),
      );
    });

    it('degrades to none instead of throwing when the lookup fails', async () => {
      const resultByInitiativesRepository =
        module.get<ResultByInitiativesRepository>(
          ResultByInitiativesRepository,
        );
      (
        resultByInitiativesRepository.getOwnerInitiativeByResult as jest.Mock
      ).mockResolvedValue(null);
      const primaryProgramRequestService =
        module.get<PrimaryProgramRequestService>(
          PrimaryProgramRequestService,
        ) as any;
      primaryProgramRequestService.stateFor.mockRejectedValue(
        new Error('boom'),
      );

      const response = await service.getResultInitiativeId(11513);

      expect(response.response.primary_request).toEqual({
        state: 'none',
        program_code: null,
        declined_by_codes: [],
      });
    });
  });

  // P2-3157 — the transition that makes the Science Program review loop reachable.
  describe('submitForReview', () => {
    const user: TokenDto = {
      id: 42,
      email: 'center@cgiar.org',
      first_name: 'Center',
      last_name: 'User',
    };

    const editingResult = {
      id: 77,
      source: SourceEnum.Bilateral,
      is_active: true,
      status_id: ResultStatusData.Editing.value,
    };
    const decisionDto = {
      assessment_id: 1,
      decision: 'submitted_anyway' as const,
    };

    beforeEach(() => {
      const assessmentService = module.get<BilateralQualityAssessmentService>(
        BilateralQualityAssessmentService,
      ) as any;
      assessmentService.getLatest.mockResolvedValue({
        id: 1,
        is_current: true,
      });
    });

    it('moves an Editing result to PENDING_REVIEW', async () => {
      (resultRepository.findOne as jest.Mock).mockResolvedValue(editingResult);

      const result = await service.submitForReview(user, 77, decisionDto);

      expect((result.response as any).status).toBe(
        ResultStatusData.PendingReview.value,
      );
      expect(resultRepository.manager.transaction).toHaveBeenCalled();
    });

    it('refuses the old empty submit request before changing status', async () => {
      (resultRepository.findOne as jest.Mock).mockResolvedValue(editingResult);

      await expect(
        service.submitForReview(user, 77, undefined as any),
      ).rejects.toThrow(/Run the quality assessment/);
      expect(resultRepository.manager.transaction).not.toHaveBeenCalled();
    });

    // `PSR-T-6` (design.md DD-4, requirements.md `PSR-R-2` swap "MUST block Submit for review
    // while the swap request is pending") — regression: current `assertSubmittable` only checks
    // the owner, never the pending-swap round, so submit currently succeeds with a pending swap.
    it('blocks submit while a swap primary request is pending (PSR-T-6 regression)', async () => {
      (resultRepository.findOne as jest.Mock).mockResolvedValue(editingResult);
      const primaryProgramRequestService =
        module.get<PrimaryProgramRequestService>(
          PrimaryProgramRequestService,
        ) as any;
      primaryProgramRequestService.findPendingPrimaryInitiativeId = jest
        .fn()
        .mockResolvedValue(12); // SP12 swap request pending against the current owner

      await expect(
        service.submitForReview(user, 77, decisionDto),
      ).rejects.toThrow(/pending/i);
      expect(resultRepository.manager.transaction).not.toHaveBeenCalled();
    });

    it('refuses an assessment owned by another result', async () => {
      (resultRepository.findOne as jest.Mock).mockResolvedValue(editingResult);
      const assessments = module.get<BilateralQualityAssessmentRepository>(
        BilateralQualityAssessmentRepository,
      );
      (assessments.findOne as jest.Mock).mockResolvedValueOnce(null);

      await expect(
        service.submitForReview(user, 77, decisionDto),
      ).rejects.toThrow(/does not belong/);
    });

    it('requires submitted_without_check for an unavailable assessment', async () => {
      (resultRepository.findOne as jest.Mock).mockResolvedValue(editingResult);
      const assessments = module.get<BilateralQualityAssessmentRepository>(
        BilateralQualityAssessmentRepository,
      );
      (assessments.findOne as jest.Mock).mockResolvedValueOnce({
        id: 1,
        result_id: 77,
        status: 'unavailable',
        decision: null,
        overall_verdict: null,
        sections: {},
      });

      await expect(
        service.submitForReview(user, 77, decisionDto),
      ).rejects.toThrow(/does not match/);
    });

    // 2026-09-05 — the primary SP's members are told the result is waiting for them, post-commit.
    // BCT-T-5: this now goes through the shared orchestrator, not the submitted emitter directly.
    it('announces Pending Review (submitted + tagging) to the orchestrator after the transaction', async () => {
      (resultRepository.findOne as jest.Mock).mockResolvedValue(editingResult);
      const bilateral = module.get<BilateralService>(BilateralService) as any;

      await service.submitForReview(user, 77, decisionDto);

      expect(bilateral.announcePendingReview).toHaveBeenCalledWith(77, user.id);
      // Falsifier: `submitForReview` must no longer emit the submitted notification directly —
      // that call now lives inside `announcePendingReview` (proved on the real service in
      // `bilateral.service.spec.ts`).
      expect(
        bilateral.emitBilateralSubmittedNotification,
      ).not.toHaveBeenCalled();
      // The title's "after the transaction" claim, actually asserted: the transaction call is
      // always registered on the mock before `announcePendingReview` can be, because the second
      // line only runs once the `await` on the first resolves.
      const transactionOrder = (
        resultRepository.manager.transaction as jest.Mock
      ).mock.invocationCallOrder[0];
      const announceOrder = (bilateral.announcePendingReview as jest.Mock).mock
        .invocationCallOrder[0];
      expect(announceOrder).toBeGreaterThan(transactionOrder);
    });

    it('stamps the submission date the review queue shows', async () => {
      (resultRepository.findOne as jest.Mock).mockResolvedValue(editingResult);
      const update = jest.fn().mockResolvedValue({});
      (
        resultRepository.manager.transaction as jest.Mock
      ).mockImplementationOnce(async (cb: any) =>
        cb({
          findOne: jest.fn().mockResolvedValue({ id: 77 }),
          query: jest.fn().mockResolvedValue({ affectedRows: 1 }),
          update,
          create: jest.fn((_entity, payload) => payload),
          save: jest.fn().mockResolvedValue({}),
        }),
      );

      await service.submitForReview(user, 77, decisionDto);

      const [, , patch] = update.mock.calls[0];
      expect(patch.external_submitted_date).toEqual(expect.any(String));
      expect(new Date(patch.external_submitted_date).toString()).not.toBe(
        'Invalid Date',
      );
    });

    // P2-3522 (second half) — the review drawer renders `submitter_name`, built from
    // `LEFT JOIN users u ON r.external_submitter = u.id`. Leaving the column null showed the
    // reviewer an empty "Submitted by", so they could not tell who sent the result.
    it('stamps the submitting user the review drawer shows', async () => {
      (resultRepository.findOne as jest.Mock).mockResolvedValue(editingResult);
      const update = jest.fn().mockResolvedValue({});
      (
        resultRepository.manager.transaction as jest.Mock
      ).mockImplementationOnce(async (cb: any) =>
        cb({
          findOne: jest.fn().mockResolvedValue({ id: 77 }),
          query: jest.fn().mockResolvedValue({ affectedRows: 1 }),
          update,
          create: jest.fn((_entity, payload) => payload),
          save: jest.fn().mockResolvedValue({}),
        }),
      );

      await service.submitForReview(user, 77, decisionDto);

      const [, , patch] = update.mock.calls[0];
      expect(patch.external_submitter).toBe(user.id);
    });

    it('accepts an AI Draft result too', async () => {
      (resultRepository.findOne as jest.Mock).mockResolvedValue({
        ...editingResult,
        status_id: ResultStatusData.Draft.value,
      });

      const result = await service.submitForReview(user, 77, decisionDto);

      expect((result.response as any).status).toBe(
        ResultStatusData.PendingReview.value,
      );
    });

    it('rejects a result that is already under review', async () => {
      (resultRepository.findOne as jest.Mock).mockResolvedValue({
        ...editingResult,
        status_id: ResultStatusData.PendingReview.value,
      });

      await expect(
        service.submitForReview(user, 77, decisionDto),
      ).rejects.toThrow(/Editing, Draft or Rejected/);
    });

    it('rejects an unknown bilateral result', async () => {
      (resultRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.submitForReview(user, 77, decisionDto),
      ).rejects.toThrow('Bilateral result not found');
    });

    it('rejects an invalid resultId', async () => {
      await expect(
        service.submitForReview(user, 0 as any, decisionDto),
      ).rejects.toThrow(/valid positive number/);
    });

    // ASC-AC-19 — this is the non-admin, non-member case: `isUserAdmin` stays at the
    // suite's default (false), so the bypass added for ASC-T-7 never applies here.
    it('refuses a user without the Center User role on the lead centre', async () => {
      (resultRepository.findOne as jest.Mock).mockResolvedValue(editingResult);
      const roleByUserRepository =
        module.get<RoleByUserRepository>(RoleByUserRepository);
      (
        roleByUserRepository.validationCenterPermissions as jest.Mock
      ).mockResolvedValue(0);

      await expect(
        service.submitForReview(user, 77, decisionDto),
      ).rejects.toThrow(/do not have permission/);
    });

    // ASC-T-7 / ASC-R-18 — an admin runs submit-for-review on a result whose lead centre they
    // are not a Center User of. `validationCenterPermissions` is stubbed at 0 (would 403 a
    // non-admin) precisely so this proves the admin bypass, not a permissive default.
    it('ASC-AC-18: lets an admin without the Center User role submit for review', async () => {
      (resultRepository.findOne as jest.Mock).mockResolvedValue(editingResult);
      const roleByUserRepository =
        module.get<RoleByUserRepository>(RoleByUserRepository);
      (roleByUserRepository.isUserAdmin as jest.Mock).mockResolvedValueOnce(
        true,
      );
      (
        roleByUserRepository.validationCenterPermissions as jest.Mock
      ).mockResolvedValue(0);

      const result = await service.submitForReview(user, 77, decisionDto);

      expect((result.response as any).status).toBe(
        ResultStatusData.PendingReview.value,
      );
      expect(
        roleByUserRepository.validationCenterPermissions,
      ).not.toHaveBeenCalled();
    });

    // ASC-T-7 — the status gate (`:2367`) runs before `isUserAdmin` (`:2376`), so
    // `isUserAdmin` is never reached on this path and this test proves nothing about the
    // bypass itself. It only proves the status precondition still exists on an admin call —
    // the bypass proof for the owner-SP precondition is the test below.
    it('an admin still gets BadRequestException on a result already under review (status gate, not bypass-proving)', async () => {
      (resultRepository.findOne as jest.Mock).mockResolvedValue({
        ...editingResult,
        status_id: ResultStatusData.PendingReview.value,
      });
      const roleByUserRepository =
        module.get<RoleByUserRepository>(RoleByUserRepository);
      (roleByUserRepository.isUserAdmin as jest.Mock).mockResolvedValueOnce(
        true,
      );

      let caught: unknown;
      try {
        await service.submitForReview(user, 77, decisionDto);
      } catch (error) {
        caught = error;
      }
      expect(caught).toBeInstanceOf(BadRequestException);
      expect((caught as BadRequestException).message).toMatch(
        /Editing, Draft or Rejected/,
      );
    });

    // ASC-T-7 / ASC-DD-9 (Reviewer finding, attempt 1) — the status gate runs before the
    // bypass, so it cannot prove the bypass path skips only `assertCenterPermission`. The
    // owner-SP gate runs AFTER the bypass, so this is the case a bug like `return result`
    // right after the admin branch (skipping owner-SP and MDS for admins) would actually
    // break. `isUserAdmin` is asserted called so a fixture with the wrong stub can't pass by
    // accident.
    it('ASC-AC-18 preconditions: an admin with no Science Program assigned still gets BadRequestException (proves the bypass path, not just the status gate)', async () => {
      (resultRepository.findOne as jest.Mock).mockResolvedValue(editingResult);
      const roleByUserRepository =
        module.get<RoleByUserRepository>(RoleByUserRepository);
      (roleByUserRepository.isUserAdmin as jest.Mock).mockResolvedValueOnce(
        true,
      );
      (
        roleByUserRepository.validationCenterPermissions as jest.Mock
      ).mockResolvedValue(0);
      const resultByInitiativesRepository =
        module.get<ResultByInitiativesRepository>(
          ResultByInitiativesRepository,
        );
      (
        resultByInitiativesRepository.getOwnerInitiativeByResult as jest.Mock
      ).mockResolvedValue(null);

      await expect(
        service.submitForReview(user, 77, decisionDto),
      ).rejects.toThrow(/no Science Program assigned/);
      expect(roleByUserRepository.isUserAdmin).toHaveBeenCalledWith(user.id);
    });

    it('refuses a result with no lead centre', async () => {
      (resultRepository.findOne as jest.Mock).mockResolvedValue(editingResult);
      const resultsCenterRepository = module.get<ResultsCenterRepository>(
        ResultsCenterRepository,
      );
      (
        resultsCenterRepository.getAllResultsCenterByResultId as jest.Mock
      ).mockResolvedValue([{ code: 'CIAT', is_leading_result: 0 }]);

      await expect(
        service.submitForReview(user, 77, decisionDto),
      ).rejects.toThrow(/no lead center/);
    });

    /**
     * The owner-initiative row is what makes the resulting notification visible in the bell and what
     * `_updateTocMapping` dereferences on approval, so a draft without one must not get through.
     */
    it('refuses a result with no Science Program assigned', async () => {
      (resultRepository.findOne as jest.Mock).mockResolvedValue(editingResult);
      const resultByInitiativesRepository =
        module.get<ResultByInitiativesRepository>(
          ResultByInitiativesRepository,
        );
      (
        resultByInitiativesRepository.getOwnerInitiativeByResult as jest.Mock
      ).mockResolvedValue(null);

      await expect(
        service.submitForReview(user, 77, decisionDto),
      ).rejects.toThrow(/no Science Program assigned/);
    });

    // `PRA-T-1` (notifications/primary-review-not-accept; supersedes `PNS-R-2`'s `sendDraft`):
    // an ownerless submit makes the saved (DRAFT) or legacy PENDING choice the OWNER, in the same
    // transaction, and never sends an "Accept as primary" request.
    describe('PRA-R-1 — ownerless submit makes the chosen SP the owner', () => {
      let primaryProgramRequestService: any;
      let resultByInitiativesRepository: ResultByInitiativesRepository;
      let bilateralService: any;

      beforeEach(() => {
        primaryProgramRequestService = module.get<PrimaryProgramRequestService>(
          PrimaryProgramRequestService,
        );
        bilateralService = module.get<BilateralService>(BilateralService);
        resultByInitiativesRepository =
          module.get<ResultByInitiativesRepository>(
            ResultByInitiativesRepository,
          );
        (resultRepository.findOne as jest.Mock).mockResolvedValue(
          editingResult,
        );
        // Ownerless for this whole describe block; each test sets the lookups it needs.
        (
          resultByInitiativesRepository.getOwnerInitiativeByResult as jest.Mock
        ).mockResolvedValue(null);
      });

      // Transaction with one observable manager (so the arguments `transferPrimary` got can be
      // asserted) and a marker that fires once the transaction COMMITTED.
      const arrangeTx = () => {
        const manager = {
          findOne: jest.fn().mockResolvedValue({ id: 77 }),
          update: jest.fn().mockResolvedValue({}),
          create: jest.fn((_entity, payload) => payload),
          save: jest.fn().mockResolvedValue({}),
          query: jest.fn().mockResolvedValue({}),
        };
        const committed = jest.fn();
        (
          resultRepository.manager.transaction as jest.Mock
        ).mockImplementationOnce(async (cb: any) => {
          const out = await cb(manager);
          committed();
          return out;
        });
        return { manager, committed };
      };

      it('saved DRAFT choice → Pending Review, transferPrimary(choice, releaseContributors:false) on the tx manager; no sendDraft, no request, no releaseContributors', async () => {
        primaryProgramRequestService.findDraftPrimaryInitiativeId.mockResolvedValue(
          9,
        );
        const { manager } = arrangeTx();

        const result = await service.submitForReview(user, 77, decisionDto);

        expect((result.response as any).status).toBe(
          ResultStatusData.PendingReview.value,
        );
        expect(
          primaryProgramRequestService.transferPrimary,
        ).toHaveBeenCalledTimes(1);
        expect(
          primaryProgramRequestService.transferPrimary,
        ).toHaveBeenCalledWith(77, 9, user, manager, {
          releaseContributors: false,
        });
        expect(primaryProgramRequestService.sendDraft).not.toHaveBeenCalled();
        expect(primaryProgramRequestService.request).not.toHaveBeenCalled();
        expect(
          primaryProgramRequestService.releaseContributors,
        ).not.toHaveBeenCalled();
      });

      it('locks the Result row before any other write in the submit transaction', async () => {
        primaryProgramRequestService.findDraftPrimaryInitiativeId.mockResolvedValue(
          9,
        );
        const { manager } = arrangeTx();

        await service.submitForReview(user, 77, decisionDto);

        expect(manager.findOne).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            where: { id: 77 },
            lock: { mode: 'pessimistic_write' },
          }),
        );
        const lock = manager.findOne.mock.invocationCallOrder[0];
        expect(lock).toBeLessThan(manager.query.mock.invocationCallOrder[0]);
        expect(lock).toBeLessThan(manager.update.mock.invocationCallOrder[0]);
        expect(lock).toBeLessThan(
          primaryProgramRequestService.transferPrimary.mock
            .invocationCallOrder[0],
        );
      });

      it('announcePendingReview is called once, after the commit, for an ownerless submit', async () => {
        primaryProgramRequestService.findDraftPrimaryInitiativeId.mockResolvedValue(
          9,
        );
        const { committed } = arrangeTx();

        await service.submitForReview(user, 77, decisionDto);

        expect(bilateralService.announcePendingReview).toHaveBeenCalledTimes(1);
        expect(bilateralService.announcePendingReview).toHaveBeenCalledWith(
          77,
          user.id,
        );
        expect(
          bilateralService.announcePendingReview.mock.invocationCallOrder[0],
        ).toBeGreaterThan(committed.mock.invocationCallOrder[0]);
      });

      it('legacy PENDING primary request, no draft → submit passes and transferPrimary gets the pending SP (prod 9737 / 9738), no "pending" 400', async () => {
        primaryProgramRequestService.findDraftPrimaryInitiativeId.mockResolvedValue(
          null,
        );
        primaryProgramRequestService.findPendingPrimaryInitiativeId.mockResolvedValue(
          12,
        );
        const { manager } = arrangeTx();

        const result = await service.submitForReview(user, 77, decisionDto);

        expect((result.response as any).status).toBe(
          ResultStatusData.PendingReview.value,
        );
        expect(
          primaryProgramRequestService.transferPrimary,
        ).toHaveBeenCalledWith(77, 12, user, manager, {
          releaseContributors: false,
        });
      });

      it('ownerless, no draft and no pending → refused with "no Science Program assigned", nothing runs', async () => {
        primaryProgramRequestService.findDraftPrimaryInitiativeId.mockResolvedValue(
          null,
        );
        primaryProgramRequestService.findPendingPrimaryInitiativeId.mockResolvedValue(
          null,
        );

        await expect(
          service.submitForReview(user, 77, decisionDto),
        ).rejects.toThrow(/no Science Program assigned/);
        expect(resultRepository.manager.transaction).not.toHaveBeenCalled();
        expect(
          primaryProgramRequestService.transferPrimary,
        ).not.toHaveBeenCalled();
      });

      it('choice vanishes between the guard and the transaction → throws inside the tx (rolls back), no transfer, no announce', async () => {
        primaryProgramRequestService.findDraftPrimaryInitiativeId
          .mockResolvedValueOnce(9) // assertSubmittable
          .mockResolvedValueOnce(null); // inside the transaction
        primaryProgramRequestService.findPendingPrimaryInitiativeId.mockResolvedValue(
          null,
        );

        await expect(
          service.submitForReview(user, 77, decisionDto),
        ).rejects.toThrow(/no Science Program assigned/);
        expect(
          primaryProgramRequestService.transferPrimary,
        ).not.toHaveBeenCalled();
        expect(bilateralService.announcePendingReview).not.toHaveBeenCalled();
      });

      it('transferPrimary rejects → submit rejects and announcePendingReview is not called', async () => {
        primaryProgramRequestService.findDraftPrimaryInitiativeId.mockResolvedValue(
          9,
        );
        primaryProgramRequestService.transferPrimary.mockRejectedValue(
          new Error('owner write failed'),
        );

        await expect(
          service.submitForReview(user, 77, decisionDto),
        ).rejects.toThrow('owner write failed');
        expect(bilateralService.announcePendingReview).not.toHaveBeenCalled();
      });
    });

    // `PRA-R-1` "submit with an owner (unchanged)": no owner write, the announce still runs.
    it('owner exists → announcePendingReview is called, transferPrimary and sendDraft are NOT called (PRA-R-1 unchanged)', async () => {
      (resultRepository.findOne as jest.Mock).mockResolvedValue(editingResult);
      const bilateral = module.get<BilateralService>(BilateralService) as any;
      const primaryProgramRequestService =
        module.get<PrimaryProgramRequestService>(
          PrimaryProgramRequestService,
        ) as any;

      await service.submitForReview(user, 77, decisionDto);

      expect(bilateral.announcePendingReview).toHaveBeenCalledWith(77, user.id);
      expect(
        primaryProgramRequestService.transferPrimary,
      ).not.toHaveBeenCalled();
      expect(primaryProgramRequestService.sendDraft).not.toHaveBeenCalled();
    });

    // `PRA-R-1` safety net: owner + a PENDING primary row (never created by new code) still blocks.
    it('owner + a PENDING primary request still blocks submit with the "pending" 400 (PRA-R-1 safety net)', async () => {
      (resultRepository.findOne as jest.Mock).mockResolvedValue(editingResult);
      const primaryProgramRequestService =
        module.get<PrimaryProgramRequestService>(
          PrimaryProgramRequestService,
        ) as any;
      primaryProgramRequestService.findPendingPrimaryInitiativeId.mockResolvedValue(
        12,
      );

      await expect(
        service.submitForReview(user, 77, decisionDto),
      ).rejects.toThrow(/A new primary Science Program request is pending/);
      expect(resultRepository.manager.transaction).not.toHaveBeenCalled();
    });
  });

  // `RRC-T-3` (bilateral/rejected-result-correction; `RRC-R-5` / `R-6` / `R-7` / `R-8` / `R-18`,
  // `RRC-DD-5`). A Rejected result (7) is submittable: the flip to Pending Review is a
  // `RESUBMIT` history row naming the owner SP, and the contributors held while at 7 are released
  // in the same transaction. Editing (1) and Draft (8) keep today's ordinary submit.
  describe('RRC-T-3: Submit from Rejected', () => {
    const user: TokenDto = {
      id: 42,
      email: 'center@cgiar.org',
      first_name: 'Center',
      last_name: 'User',
    };
    const RESULT = 77;
    const OWNER_SP = 9;
    const decisionDto = {
      assessment_id: 1,
      decision: 'submitted_anyway' as const,
    };
    const GATE = /Editing, Draft or Rejected/;
    const ALL_STATUSES: Array<[number, string, boolean]> = [
      [ResultStatusData.Editing.value, 'Editing', true],
      [ResultStatusData.QualityAssessed.value, 'QualityAssessed', false],
      [ResultStatusData.Submitted.value, 'Submitted', false],
      [ResultStatusData.Discontinued.value, 'Discontinued', false],
      [ResultStatusData.PendingReview.value, 'PendingReview', false],
      [ResultStatusData.Approved.value, 'Approved', false],
      [ResultStatusData.Rejected.value, 'Rejected', true],
      [ResultStatusData.Draft.value, 'Draft', true],
    ];

    let primaryProgramRequestService: any;
    let bilateral: any;
    let resultByInitiativesRepository: any;

    const resultAt = (statusId: number) => ({
      id: RESULT,
      source: SourceEnum.Bilateral,
      is_active: true,
      status_id: statusId,
      result_type_id: ResultTypeEnum.INNOVATION_DEVELOPMENT,
    });

    /** One manager for the whole transaction, plus a marker that fires once it has COMMITTED. */
    const arrangeTransaction = () => {
      const manager = {
        findOne: jest.fn().mockResolvedValue({ id: RESULT }),
        update: jest.fn().mockResolvedValue({}),
        create: jest.fn((_entity, payload) => payload),
        save: jest.fn().mockResolvedValue({}),
        query: jest.fn().mockResolvedValue({}),
      };
      const committed = jest.fn();
      (
        resultRepository.manager.transaction as jest.Mock
      ).mockImplementationOnce(async (callback: any) => {
        const outcome = await callback(manager);
        committed();
        return outcome;
      });
      return { manager, committed };
    };

    const historyRowsOf = (manager: { save: jest.Mock }) =>
      manager.save.mock.calls
        .filter(([entity]) => entity === ResultReviewHistory)
        .map(([, row]) => row);

    beforeEach(() => {
      (
        module.get<BilateralQualityAssessmentService>(
          BilateralQualityAssessmentService,
        ) as any
      ).getLatest.mockResolvedValue({ id: 1, is_current: true });
      primaryProgramRequestService = module.get<PrimaryProgramRequestService>(
        PrimaryProgramRequestService,
      );
      bilateral = module.get<BilateralService>(BilateralService);
      resultByInitiativesRepository = module.get<ResultByInitiativesRepository>(
        ResultByInitiativesRepository,
      );
      resultByInitiativesRepository.getOwnerInitiativeByResult.mockResolvedValue(
        { id: OWNER_SP },
      );
    });

    // The status gate, all eight statuses, on the three callers that share `assertSubmittable`.
    describe('the status gate: only Editing (1), Draft (8) and Rejected (7) pass', () => {
      it.each(ALL_STATUSES)(
        'submitForReview at %i (%s) passes = %s',
        async (statusId, _name, passes) => {
          (resultRepository.findOne as jest.Mock).mockResolvedValue(
            resultAt(statusId),
          );

          if (passes) {
            const outcome = await service.submitForReview(
              user,
              RESULT,
              decisionDto,
            );
            expect((outcome.response as any).status).toBe(
              ResultStatusData.PendingReview.value,
            );
          } else {
            await expect(
              service.submitForReview(user, RESULT, decisionDto),
            ).rejects.toThrow(GATE);
            expect(resultRepository.manager.transaction).not.toHaveBeenCalled();
          }
        },
      );

      it.each(ALL_STATUSES)(
        'assess at %i (%s) passes = %s',
        async (statusId, _name, passes) => {
          (resultRepository.findOne as jest.Mock).mockResolvedValue(
            resultAt(statusId),
          );

          if (passes) {
            await expect(service.assess(user, RESULT)).resolves.toEqual(
              expect.objectContaining({ status: 200 }),
            );
          } else {
            await expect(service.assess(user, RESULT)).rejects.toThrow(GATE);
          }
        },
      );

      it.each(ALL_STATUSES)(
        'recordFieldRevision at %i (%s) passes = %s',
        async (statusId, _name, passes) => {
          (resultRepository.findOne as jest.Mock).mockResolvedValue({
            ...resultAt(statusId),
            title: 'A perfectly good title',
          });
          (
            module.get<BilateralQualityAssessmentRepository>(
              BilateralQualityAssessmentRepository,
            ).findOne as jest.Mock
          ).mockResolvedValueOnce({
            id: 5,
            result_id: RESULT,
            sections: {
              general_information: {
                verdict: 'amber',
                suggestions: { title: 'A different suggested title' },
              },
            },
          });
          const revise = () =>
            service.recordFieldRevision(user, RESULT, {
              field: ResultFieldRevisionFieldName.TITLE,
              assessment_id: 5,
              old_value: 'An old title',
            });

          if (passes) {
            await expect(revise()).resolves.toBeDefined();
          } else {
            await expect(revise()).rejects.toThrow(GATE);
          }
        },
      );

      it('the refusal names the status, with the three admitted statuses in the message', async () => {
        (resultRepository.findOne as jest.Mock).mockResolvedValue(
          resultAt(ResultStatusData.PendingReview.value),
        );

        await expect(
          service.submitForReview(user, RESULT, decisionDto),
        ).rejects.toThrow(
          'Only a result in Editing, Draft or Rejected can be submitted for review (status_id: 5)',
        );
      });
    });

    describe('Submit from Rejected (RRC-R-5, R-8, R-18)', () => {
      const submitFromRejected = async () => {
        (resultRepository.findOne as jest.Mock).mockResolvedValue(
          resultAt(ResultStatusData.Rejected.value),
        );
        const tx = arrangeTransaction();
        const outcome = await service.submitForReview(
          user,
          RESULT,
          decisionDto,
        );
        return { ...tx, outcome };
      };

      it('writes Pending Review (5), never Editing (1), and answers with status 5', async () => {
        (resultRepository.findOne as jest.Mock).mockResolvedValue(
          resultAt(ResultStatusData.Rejected.value),
        );
        const { manager } = arrangeTransaction();

        const outcome = await service.submitForReview(
          user,
          RESULT,
          decisionDto,
        );

        expect(manager.update).toHaveBeenCalledWith(
          expect.anything(),
          { id: RESULT },
          expect.objectContaining({
            status_id: ResultStatusData.PendingReview.value,
            last_updated_by: user.id,
          }),
        );
        for (const [, , patch] of manager.update.mock.calls) {
          expect(patch.status_id).not.toBe(ResultStatusData.Editing.value);
        }
        expect((outcome.response as any).status).toBe(
          ResultStatusData.PendingReview.value,
        );
      });

      it('writes ONE RESUBMIT history row naming the owner SP, and not the ordinary submit row', async () => {
        const { manager } = await submitFromRejected();

        const rows = historyRowsOf(manager);
        expect(rows).toHaveLength(1);
        expect(rows[0]).toEqual(
          expect.objectContaining({
            result_id: RESULT,
            action: ReviewActionEnum.RESUBMIT,
            initiative_id: OWNER_SP,
            created_by: user.id,
          }),
        );
        expect(rows.some((row) => row.action === ReviewActionEnum.UPDATE)).toBe(
          false,
        );
      });

      it('releases the held contributors inside the same transaction, with the same manager', async () => {
        const { manager, committed } = await submitFromRejected();

        expect(
          primaryProgramRequestService.releaseContributors,
        ).toHaveBeenCalledTimes(1);
        expect(
          primaryProgramRequestService.releaseContributors,
        ).toHaveBeenCalledWith(RESULT, manager);
        const releaseOrder =
          primaryProgramRequestService.releaseContributors.mock
            .invocationCallOrder[0];
        expect(releaseOrder).toBeLessThan(
          committed.mock.invocationCallOrder[0],
        );
      });

      it('announces Pending Review exactly once, after the commit', async () => {
        const { committed } = await submitFromRejected();

        expect(bilateral.announcePendingReview).toHaveBeenCalledTimes(1);
        expect(bilateral.announcePendingReview).toHaveBeenCalledWith(
          RESULT,
          user.id,
        );
        expect(
          bilateral.announcePendingReview.mock.invocationCallOrder[0],
        ).toBeGreaterThan(committed.mock.invocationCallOrder[0]);
      });

      it('never takes the ownerless branch (the owner exists at 7): no sendDraft, no transferPrimary', async () => {
        await submitFromRejected();

        expect(primaryProgramRequestService.sendDraft).not.toHaveBeenCalled();
        expect(
          primaryProgramRequestService.transferPrimary,
        ).not.toHaveBeenCalled();
      });

      // `RRC-R-18`: one line, AFTER the transaction resolved, ids only (`.cursorrules`).
      it('logs one resubmission line after the commit: result, owner initiative and user ids only', async () => {
        const log = jest
          .spyOn((service as any).logger, 'log')
          .mockImplementation(() => undefined);

        const { committed } = await submitFromRejected();

        expect(log).toHaveBeenCalledTimes(1);
        const line = String(log.mock.calls[0][0]);
        expect(line).toContain(String(RESULT));
        expect(line).toContain(String(OWNER_SP));
        expect(line).toContain(String(user.id));
        expect(line).not.toContain(user.email);
        expect(log.mock.invocationCallOrder[0]).toBeGreaterThan(
          committed.mock.invocationCallOrder[0],
        );
      });

      it('a failing release rolls the submit back: no announcement, no log line', async () => {
        (resultRepository.findOne as jest.Mock).mockResolvedValue(
          resultAt(ResultStatusData.Rejected.value),
        );
        arrangeTransaction();
        primaryProgramRequestService.releaseContributors.mockRejectedValueOnce(
          new Error('release failed'),
        );
        const log = jest
          .spyOn((service as any).logger, 'log')
          .mockImplementation(() => undefined);

        await expect(
          service.submitForReview(user, RESULT, decisionDto),
        ).rejects.toThrow('release failed');

        expect(bilateral.announcePendingReview).not.toHaveBeenCalled();
        expect(log).not.toHaveBeenCalled();
      });

      // `RRC-R-7` — today's refusal, and before any write.
      it("a Rejected result with no primary SP is refused with today's message and nothing is written", async () => {
        (resultRepository.findOne as jest.Mock).mockResolvedValue(
          resultAt(ResultStatusData.Rejected.value),
        );
        resultByInitiativesRepository.getOwnerInitiativeByResult.mockResolvedValue(
          null,
        );

        await expect(
          service.submitForReview(user, RESULT, decisionDto),
        ).rejects.toThrow(
          'The result has no Science Program assigned. Select a Science Program before submitting for review.',
        );
        expect(resultRepository.manager.transaction).not.toHaveBeenCalled();
        expect(
          primaryProgramRequestService.releaseContributors,
        ).not.toHaveBeenCalled();
      });

      // `RRC-R-6` — the stale guard is untouched: a check run before the latest edit is refused.
      it("a Rejected result with a stale quality check is refused with today's stale message and nothing is written", async () => {
        (resultRepository.findOne as jest.Mock).mockResolvedValue(
          resultAt(ResultStatusData.Rejected.value),
        );
        (
          module.get<BilateralQualityAssessmentService>(
            BilateralQualityAssessmentService,
          ) as any
        ).getLatest.mockResolvedValue({ id: 1, is_current: false });

        await expect(
          service.submitForReview(user, RESULT, decisionDto),
        ).rejects.toThrow(
          'The quality assessment is stale. Run it again after changing the result.',
        );
        expect(resultRepository.manager.transaction).not.toHaveBeenCalled();
        expect(
          primaryProgramRequestService.releaseContributors,
        ).not.toHaveBeenCalled();
      });

      it('a pending primary round still blocks the submit at Rejected', async () => {
        (resultRepository.findOne as jest.Mock).mockResolvedValue(
          resultAt(ResultStatusData.Rejected.value),
        );
        primaryProgramRequestService.findPendingPrimaryInitiativeId.mockResolvedValue(
          12,
        );

        await expect(
          service.submitForReview(user, RESULT, decisionDto),
        ).rejects.toThrow(/pending/i);
        expect(resultRepository.manager.transaction).not.toHaveBeenCalled();
      });
    });

    // `RRC-R-3` / AC30 — Editing and Draft are untouched: the ordinary history row, no RESUBMIT,
    // and the release is not this path's job (a contributor save with an owner already sent them).
    describe.each([
      [ResultStatusData.Editing.value, 'Editing'],
      [ResultStatusData.Draft.value, 'Draft'],
    ])('Submit from %i (%s) is unchanged', (statusId) => {
      it('writes the ordinary UPDATE history row, no RESUBMIT, no release, no resubmission log', async () => {
        (resultRepository.findOne as jest.Mock).mockResolvedValue(
          resultAt(statusId),
        );
        const { manager } = arrangeTransaction();
        const log = jest
          .spyOn((service as any).logger, 'log')
          .mockImplementation(() => undefined);

        await service.submitForReview(user, RESULT, decisionDto);

        const rows = historyRowsOf(manager);
        expect(rows).toHaveLength(1);
        expect(rows[0]).toEqual(
          expect.objectContaining({
            result_id: RESULT,
            action: ReviewActionEnum.UPDATE,
            comment: 'Submitted for review by the reporting center',
            created_by: user.id,
          }),
        );
        expect(rows[0].action).not.toBe(ReviewActionEnum.RESUBMIT);
        expect(
          primaryProgramRequestService.releaseContributors,
        ).not.toHaveBeenCalled();
        expect(log).not.toHaveBeenCalled();
        expect(bilateral.announcePendingReview).toHaveBeenCalledTimes(1);
      });
    });
  });

  // @akili-spec bilateral/qa-ai-traffic-light (BIL-QAI-T-6)
  describe('assess', () => {
    const user: TokenDto = {
      id: 42,
      email: 'center@cgiar.org',
      first_name: 'Center',
      last_name: 'User',
    };

    const editingResult = {
      id: 77,
      source: SourceEnum.Bilateral,
      is_active: true,
      status_id: ResultStatusData.Editing.value,
      result_type_id: ResultTypeEnum.INNOVATION_DEVELOPMENT,
    };

    let qualityAssessmentService: BilateralQualityAssessmentService;

    beforeEach(() => {
      qualityAssessmentService = module.get<BilateralQualityAssessmentService>(
        BilateralQualityAssessmentService,
      );
    });

    it('delegates to the orchestrator with the validated result once the guards pass', async () => {
      (resultRepository.findOne as jest.Mock).mockResolvedValue(editingResult);

      const result = await service.assess(user, 77);

      expect(qualityAssessmentService.assess).toHaveBeenCalledWith(
        user,
        editingResult,
      );
      expect(result).toEqual({
        response: { id: 1, result_id: 77, status: 'completed' },
        message: 'Quality assessment completed',
        status: 200,
      });
    });

    it('never transitions the result, writes review history, or fires the submitted notification', async () => {
      (resultRepository.findOne as jest.Mock).mockResolvedValue(editingResult);
      const bilateral = module.get<BilateralService>(BilateralService) as any;

      await service.assess(user, 77);

      expect(resultRepository.manager.transaction).not.toHaveBeenCalled();
      expect(
        bilateral.emitBilateralSubmittedNotification,
      ).not.toHaveBeenCalled();
    });

    it('maps a 202 (already running) outcome to the 202 envelope', async () => {
      (resultRepository.findOne as jest.Mock).mockResolvedValue(editingResult);
      (qualityAssessmentService.assess as jest.Mock).mockResolvedValueOnce({
        dto: { id: 5, result_id: 77, status: 'running', is_current: true },
        httpStatus: 202,
      });

      const result = await service.assess(user, 77);

      expect(result.status).toBe(202);
      expect(result.message).toMatch(/already running/);
    });

    /**
     * Disqualifier (BIL-QAI-T-6 brief): a test that stubs `assertSubmittable` when testing
     * `assess` proves nothing about gate parity. `assertSubmittable` is private and is never
     * mocked here — every case below drives the exact same `resultRepository` /
     * `roleByUserRepository` / `resultsCenterRepository` / `resultByInitiativesRepository`
     * mocks, and the exact same `editingResult` shape, that the 11 `submitForReview` cases
     * above use. A rejection message that matches `submitForReview`'s is proof both methods
     * run through the one shared guard, not two hand-written copies that happen to agree today.
     */
    it('gate parity: rejects a result that is already under review, same message as submitForReview', async () => {
      (resultRepository.findOne as jest.Mock).mockResolvedValue({
        ...editingResult,
        status_id: ResultStatusData.PendingReview.value,
      });

      await expect(service.assess(user, 77)).rejects.toThrow(
        /Editing, Draft or Rejected/,
      );
    });

    it('gate parity: rejects an unknown bilateral result, same message as submitForReview', async () => {
      (resultRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.assess(user, 77)).rejects.toThrow(
        'Bilateral result not found',
      );
    });

    it('gate parity: rejects an invalid resultId, same message as submitForReview', async () => {
      await expect(service.assess(user, 0 as any)).rejects.toThrow(
        /valid positive number/,
      );
    });

    // ASC-AC-19 — non-admin, non-member: `isUserAdmin` stays at the suite's default (false).
    it('gate parity: refuses a user without the Center User role, same message as submitForReview', async () => {
      (resultRepository.findOne as jest.Mock).mockResolvedValue(editingResult);
      const roleByUserRepository =
        module.get<RoleByUserRepository>(RoleByUserRepository);
      (
        roleByUserRepository.validationCenterPermissions as jest.Mock
      ).mockResolvedValue(0);

      await expect(service.assess(user, 77)).rejects.toThrow(
        /do not have permission/,
      );
      expect(qualityAssessmentService.assess).not.toHaveBeenCalled();
    });

    // ASC-T-7 / ASC-R-18 — the button runs `assess` first, so this half of ASC-AC-18 matters as
    // much as the submit half: an admin who is not a Center User of the result's lead centre must
    // still get past the shared `assertSubmittable` guard here too.
    it('ASC-AC-18: lets an admin without the Center User role run the quality assessment', async () => {
      (resultRepository.findOne as jest.Mock).mockResolvedValue(editingResult);
      const roleByUserRepository =
        module.get<RoleByUserRepository>(RoleByUserRepository);
      (roleByUserRepository.isUserAdmin as jest.Mock).mockResolvedValueOnce(
        true,
      );
      (
        roleByUserRepository.validationCenterPermissions as jest.Mock
      ).mockResolvedValue(0);

      const result = await service.assess(user, 77);

      expect(qualityAssessmentService.assess).toHaveBeenCalledWith(
        user,
        editingResult,
      );
      expect(result.status).toBe(200);
      expect(
        roleByUserRepository.validationCenterPermissions,
      ).not.toHaveBeenCalled();
    });

    it('gate parity: refuses a result with no Science Program assigned, same message as submitForReview', async () => {
      (resultRepository.findOne as jest.Mock).mockResolvedValue(editingResult);
      const resultByInitiativesRepository =
        module.get<ResultByInitiativesRepository>(
          ResultByInitiativesRepository,
        );
      (
        resultByInitiativesRepository.getOwnerInitiativeByResult as jest.Mock
      ).mockResolvedValue(null);

      await expect(service.assess(user, 77)).rejects.toThrow(
        /no Science Program assigned/,
      );
      expect(qualityAssessmentService.assess).not.toHaveBeenCalled();
    });

    /**
     * Falsifying input (BIL-QAI-T-6 brief): an Innovation Use result lacking MDS must make
     * `assess` throw exactly like `submitForReview` — the MDS gate is part of the shared
     * `assertSubmittable`, so no path may bypass it (`innovation-use-mds-validator.service.ts`
     * header comment).
     */
    it('falsifying input: an Innovation Use result lacking MDS makes assess throw, and the orchestrator is never called', async () => {
      (resultRepository.findOne as jest.Mock).mockResolvedValue({
        ...editingResult,
        result_type_id: ResultTypeEnum.INNOVATION_USE,
      });
      const innovationUseMdsValidator = module.get<InnovationUseMdsValidator>(
        InnovationUseMdsValidator,
      );
      (
        innovationUseMdsValidator.assertPersistedMds as jest.Mock
      ).mockRejectedValueOnce(new BadRequestException('MDS incomplete'));

      await expect(service.assess(user, 77)).rejects.toThrow('MDS incomplete');
      expect(qualityAssessmentService.assess).not.toHaveBeenCalled();
    });
  });

  // @akili-spec bilateral/qa-ai-traffic-light (BIL-QAI-T-6)
  describe('getLatest', () => {
    const user: TokenDto = {
      id: 42,
      email: 'center@cgiar.org',
      first_name: 'Center',
      last_name: 'User',
    };

    it('delegates to the orchestrator after only the centre-permission check', async () => {
      const qualityAssessmentService =
        module.get<BilateralQualityAssessmentService>(
          BilateralQualityAssessmentService,
        );

      const result = await service.getLatest(user, 77);

      expect(qualityAssessmentService.getLatest).toHaveBeenCalledWith(77);
      expect(result).toEqual({
        response: { latest: null },
        message: 'Latest quality assessment retrieved successfully',
        status: 200,
      });
    });

    it('does not require Editing/Draft status — a reviewer can reopen a Pending Review result', async () => {
      // No `resultRepository.findOne` stub is asserted here: `getLatest` never calls
      // `assertSubmittable`, so the result's status_id is never inspected. Only
      // `assertCenterPermission` (via `getAllResultsCenterByResultId` + role validation) runs.
      const qualityAssessmentService =
        module.get<BilateralQualityAssessmentService>(
          BilateralQualityAssessmentService,
        );

      await expect(service.getLatest(user, 77)).resolves.toBeDefined();
      expect(qualityAssessmentService.getLatest).toHaveBeenCalledWith(77);
    });

    // ASC-AC-19 — non-admin, non-member: `isUserAdmin` stays at the suite's default (false).
    it('still refuses a user without the Center User role on the lead centre', async () => {
      const roleByUserRepository =
        module.get<RoleByUserRepository>(RoleByUserRepository);
      (
        roleByUserRepository.validationCenterPermissions as jest.Mock
      ).mockResolvedValue(0);

      await expect(service.getLatest(user, 77)).rejects.toThrow(
        /do not have permission/,
      );
    });

    // ASC-T-7 / ASC-DD-9 (amended 2026-09-28) — the client polls `getLatest` while `assess`
    // runs and loads it on open, so an admin non-member needs the same bypass.
    // `validationCenterPermissions` is stubbed at 0 (would 403 a non-admin) so this proves the
    // admin bypass, not a permissive default.
    it('ASC-AC-18: lets an admin without the Center User role read the latest quality assessment', async () => {
      const roleByUserRepository =
        module.get<RoleByUserRepository>(RoleByUserRepository);
      (roleByUserRepository.isUserAdmin as jest.Mock).mockResolvedValueOnce(
        true,
      );
      (
        roleByUserRepository.validationCenterPermissions as jest.Mock
      ).mockResolvedValue(0);
      const qualityAssessmentService =
        module.get<BilateralQualityAssessmentService>(
          BilateralQualityAssessmentService,
        );

      await expect(service.getLatest(user, 77)).resolves.toBeDefined();
      expect(qualityAssessmentService.getLatest).toHaveBeenCalledWith(77);
      expect(
        roleByUserRepository.validationCenterPermissions,
      ).not.toHaveBeenCalled();
    });

    it('rejects an invalid resultId', async () => {
      await expect(service.getLatest(user, 0 as any)).rejects.toThrow(
        /valid positive number/,
      );
    });
  });

  // @akili-spec bilateral/qa-ai-text-suggestions (BIL-QTS-T-7)
  describe('recordFieldRevision', () => {
    const user: TokenDto = {
      id: 42,
      email: 'center@cgiar.org',
      first_name: 'Center',
      last_name: 'User',
    };

    const editingResult = {
      id: 77,
      source: SourceEnum.Bilateral,
      is_active: true,
      status_id: ResultStatusData.Editing.value,
      result_type_id: ResultTypeEnum.INNOVATION_DEVELOPMENT,
      title: 'A perfectly good title',
      description: 'A perfectly good description',
    };

    /** `n` space-separated words — enough to trip the 30-word title / 300-word description limit. */
    const words = (n: number) => Array.from({ length: n }, () => 'w').join(' ');

    let resultFieldRevisionRepository: {
      save: jest.Mock;
    };

    beforeEach(() => {
      (resultRepository.findOne as jest.Mock).mockResolvedValue(editingResult);
      resultFieldRevisionRepository = module.get(
        getRepositoryToken(ResultFieldRevision),
      );
      resultFieldRevisionRepository.save.mockClear();
    });

    // Falsifier (a): saved value equals the stored suggestion after trim → AI_SUGGESTED. The
    // stored title carries padding whitespace the suggestion does not, so a correct
    // implementation only matches because of `.trim()` — removing it would go red here.
    it('falsifier (a): records AI_SUGGESTED when the saved value equals the kept suggestion after trim', async () => {
      (resultRepository.findOne as jest.Mock).mockResolvedValue({
        ...editingResult,
        title: '  A perfectly good title  ',
      });
      const qualityAssessmentRepository =
        module.get<BilateralQualityAssessmentRepository>(
          BilateralQualityAssessmentRepository,
        );
      (qualityAssessmentRepository.findOne as jest.Mock).mockResolvedValueOnce({
        id: 5,
        result_id: 77,
        sections: {
          general_information: {
            verdict: 'amber',
            suggestions: { title: 'A perfectly good title' },
          },
        },
      });

      const result = await service.recordFieldRevision(user, 77, {
        field: ResultFieldRevisionFieldName.TITLE,
        assessment_id: 5,
        old_value: 'An old title',
      });

      expect(result.response.provenance).toBe(
        ResultFieldRevisionProvenance.AI_SUGGESTED,
      );
      expect(resultFieldRevisionRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          result_id: 77,
          user_id: 42,
          field_name: ResultFieldRevisionFieldName.TITLE,
          old_value: 'An old title',
          new_value: '  A perfectly good title  ',
          change_reason: 'bilateral_qa_drawer:assessment=5',
          provenance: ResultFieldRevisionProvenance.AI_SUGGESTED,
          proposal_id: null,
        }),
      );
    });

    // Falsifier (b): saved value differs from the suggestion → USER_EDIT.
    it('falsifier (b): records USER_EDIT when the saved value differs from the kept suggestion', async () => {
      const qualityAssessmentRepository =
        module.get<BilateralQualityAssessmentRepository>(
          BilateralQualityAssessmentRepository,
        );
      (qualityAssessmentRepository.findOne as jest.Mock).mockResolvedValueOnce({
        id: 5,
        result_id: 77,
        sections: {
          general_information: {
            verdict: 'amber',
            suggestions: { title: 'A different suggested title' },
          },
        },
      });

      const result = await service.recordFieldRevision(user, 77, {
        field: ResultFieldRevisionFieldName.TITLE,
        assessment_id: 5,
        old_value: 'An old title',
      });

      expect(result.response.provenance).toBe(
        ResultFieldRevisionProvenance.USER_EDIT,
      );
    });

    // Falsifier (c): a client-sent `provenance` never overrides the server's own comparison —
    // the DTO declares no such property, and even handed a wider object the service never
    // reads it.
    it('falsifier (c): ignores a client-sent provenance and decides USER_EDIT on its own comparison', async () => {
      const qualityAssessmentRepository =
        module.get<BilateralQualityAssessmentRepository>(
          BilateralQualityAssessmentRepository,
        );
      (qualityAssessmentRepository.findOne as jest.Mock).mockResolvedValueOnce({
        id: 5,
        result_id: 77,
        sections: {
          general_information: {
            verdict: 'amber',
            suggestions: { title: 'A different suggested title' },
          },
        },
      });

      const forgedDto = {
        field: ResultFieldRevisionFieldName.TITLE,
        assessment_id: 5,
        old_value: 'An old title',
        provenance: ResultFieldRevisionProvenance.AI_SUGGESTED,
      } as any;

      const result = await service.recordFieldRevision(user, 77, forgedDto);

      expect(result.response.provenance).toBe(
        ResultFieldRevisionProvenance.USER_EDIT,
      );
      expect(resultFieldRevisionRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          provenance: ResultFieldRevisionProvenance.USER_EDIT,
        }),
      );
    });

    // Falsifier (d): an assessment that belongs to another result → 404, no row written. The
    // mock behaves like a real WHERE clause — it emulates matching each key of the `where`
    // object independently, only treating a key as satisfied when it is either absent from the
    // query or equal to the row's own value. Assessment 999 is a REAL row, but it belongs to
    // result 88, never to 77. So dropping `result_id` from the service's `where` clause (attempt
    // 1's bug) would make this mock incorrectly return the row instead of 404ing — the exact
    // regression this falsifier exists to catch (attempt 1's mock returned null unconditionally,
    // which could not tell the two apart).
    it('falsifier (d): 404s on an assessment that does not belong to this result, and writes no row', async () => {
      const qualityAssessmentRepository =
        module.get<BilateralQualityAssessmentRepository>(
          BilateralQualityAssessmentRepository,
        );
      const foreignAssessment = { id: 999, result_id: 88, sections: {} };
      (qualityAssessmentRepository.findOne as jest.Mock).mockImplementationOnce(
        ({ where }: any) => {
          const idOk =
            where?.id === undefined || where.id === foreignAssessment.id;
          const resultIdOk =
            where?.result_id === undefined ||
            where.result_id === foreignAssessment.result_id;
          return Promise.resolve(idOk && resultIdOk ? foreignAssessment : null);
        },
      );

      await expect(
        service.recordFieldRevision(user, 77, {
          field: ResultFieldRevisionFieldName.TITLE,
          assessment_id: 999,
          old_value: null,
        }),
      ).rejects.toThrow(NotFoundException);
      expect(qualityAssessmentRepository.findOne).toHaveBeenCalledWith({
        where: { id: 999, result_id: 77 },
      });
      expect(resultFieldRevisionRepository.save).not.toHaveBeenCalled();
    });

    // Falsifier (e): a stored suggestion the read-side normalizer would drop (over the 30-word
    // title limit) can never be claimed as AI_SUGGESTED, even when the value matches it verbatim.
    it('falsifier (e): a suggestion the read-side normalizer drops still records USER_EDIT', async () => {
      const longTitle = words(31);
      (resultRepository.findOne as jest.Mock).mockResolvedValue({
        ...editingResult,
        title: longTitle,
      });
      const qualityAssessmentRepository =
        module.get<BilateralQualityAssessmentRepository>(
          BilateralQualityAssessmentRepository,
        );
      (qualityAssessmentRepository.findOne as jest.Mock).mockResolvedValueOnce({
        id: 5,
        result_id: 77,
        sections: {
          general_information: {
            verdict: 'amber',
            suggestions: { title: longTitle },
          },
        },
      });

      const result = await service.recordFieldRevision(user, 77, {
        field: ResultFieldRevisionFieldName.TITLE,
        assessment_id: 5,
        old_value: 'An old title',
      });

      expect(result.response.provenance).toBe(
        ResultFieldRevisionProvenance.USER_EDIT,
      );
    });

    // Falsifier (f): no log line carries the field text.
    it('falsifier (f): no logged argument contains the field text', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
      const qualityAssessmentRepository =
        module.get<BilateralQualityAssessmentRepository>(
          BilateralQualityAssessmentRepository,
        );
      const secretTitle = 'Do not log this exact secret title text';
      (resultRepository.findOne as jest.Mock).mockResolvedValue({
        ...editingResult,
        title: secretTitle,
      });
      (qualityAssessmentRepository.findOne as jest.Mock).mockResolvedValueOnce({
        id: 5,
        result_id: 77,
        sections: {
          general_information: {
            verdict: 'amber',
            suggestions: { title: secretTitle },
          },
        },
      });

      try {
        await service.recordFieldRevision(user, 77, {
          field: ResultFieldRevisionFieldName.TITLE,
          assessment_id: 5,
          old_value: 'An old title',
        });

        for (const call of logSpy.mock.calls) {
          for (const arg of call) {
            expect(String(arg)).not.toContain(secretTitle);
          }
        }
      } finally {
        logSpy.mockRestore();
      }
    });

    // Falsifier (g): a user without edit rights gets the same refusal as `assess`, and no row
    // is written.
    it('falsifier (g): refuses a user without the Center User role, same as assess, and writes no row', async () => {
      const roleByUserRepository =
        module.get<RoleByUserRepository>(RoleByUserRepository);
      (
        roleByUserRepository.validationCenterPermissions as jest.Mock
      ).mockResolvedValueOnce(0);

      await expect(
        service.recordFieldRevision(user, 77, {
          field: ResultFieldRevisionFieldName.TITLE,
          assessment_id: 5,
          old_value: null,
        }),
      ).rejects.toThrow(/do not have permission/);
      expect(resultFieldRevisionRepository.save).not.toHaveBeenCalled();
    });

    // Advisory: a TypeORM write failure (e.g. a utf8mb3 "Incorrect string value" QueryFailedError
    // on an emoji, whose `parameters` carry the field text) must never reach the caller verbatim —
    // only a generic message, per .cursorrules. Also proves the log line moved after the
    // `await save`: a save that throws must never have already logged success.
    it('advisory: wraps a repository save failure in a generic InternalServerErrorException, and never logs first', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
      try {
        const qualityAssessmentRepository =
          module.get<BilateralQualityAssessmentRepository>(
            BilateralQualityAssessmentRepository,
          );
        (
          qualityAssessmentRepository.findOne as jest.Mock
        ).mockResolvedValueOnce({
          id: 5,
          result_id: 77,
          sections: {
            general_information: {
              verdict: 'amber',
              suggestions: { title: 'A different suggested title' },
            },
          },
        });
        resultFieldRevisionRepository.save.mockRejectedValueOnce(
          new Error(
            "QueryFailedError: Incorrect string value: '\\xF0\\x9F\\x98\\x80' for column 'new_value'",
          ),
        );

        await expect(
          service.recordFieldRevision(user, 77, {
            field: ResultFieldRevisionFieldName.TITLE,
            assessment_id: 5,
            old_value: 'An old title',
          }),
        ).rejects.toThrow('Could not record the field revision');
        expect(logSpy).not.toHaveBeenCalled();
      } finally {
        logSpy.mockRestore();
      }
    });
  });

  describe('getTocState (BIL-TOC-T-3)', () => {
    let aowBilateralRepository: AoWBilateralRepository;
    let resultsTocResultRepository: ResultsTocResultRepository;
    let resultByInitiativesRepository: ResultByInitiativesRepository;
    let resultsTocResultsService: ResultsTocResultsService;

    beforeEach(() => {
      aowBilateralRepository = module.get<AoWBilateralRepository>(
        AoWBilateralRepository,
      );
      resultsTocResultRepository = module.get<ResultsTocResultRepository>(
        ResultsTocResultRepository,
      );
      resultByInitiativesRepository = module.get<ResultByInitiativesRepository>(
        ResultByInitiativesRepository,
      );
      resultsTocResultsService = module.get<ResultsTocResultsService>(
        ResultsTocResultsService,
      );

      (resultRepository.findOne as jest.Mock).mockResolvedValue({
        id: 10,
        version_id: 1,
        obj_version: {
          id: 1,
          phase_year: 2026,
          toc_pahse_id: 'phase-uuid-2026',
        },
      });

      (
        resultByInitiativesRepository.getOwnerInitiativeByResult as jest.Mock
      ).mockResolvedValue({
        id: 100,
        official_code: 'SP06',
        name: 'Science Program 6',
      });
    });

    it('1. default-node rows with no indicator rows -> project_default', async () => {
      (aowBilateralRepository.findLeadProjectId as jest.Mock).mockResolvedValue(
        501,
      );
      (
        aowBilateralRepository.findProjectTocLinkage as jest.Mock
      ).mockResolvedValue([
        {
          toc_result_id: 1001,
          category: 'OUTPUT',
          result_title: 'Output 1',
          related_node_id: 'node-1',
          indicator_id: null,
          indicator_description: null,
          indicator_type: null,
          target_value: null,
        },
        {
          toc_result_id: 1002,
          category: 'OUTCOME',
          result_title: 'Outcome 1',
          related_node_id: 'node-2',
          indicator_id: null,
          indicator_description: null,
          indicator_type: null,
          target_value: null,
        },
      ]);
      (resultRepository.query as jest.Mock).mockResolvedValue([
        { project_name: 'Lead Project Alpha' },
      ]);

      (resultsTocResultRepository.find as jest.Mock).mockResolvedValue([
        {
          result_toc_result_id: 1,
          result_id: 10,
          initiative_ids: 100,
          toc_result_id: 1001,
          planned_result: true,
          toc_level_id: 1,
          is_active: true,
        },
        {
          result_toc_result_id: 2,
          result_id: 10,
          initiative_ids: 100,
          toc_result_id: 1002,
          planned_result: true,
          toc_level_id: 2,
          is_active: true,
        },
      ]);
      (resultsTocResultRepository.query as jest.Mock).mockResolvedValue([]);

      const res = await service.getTocState(10);
      expect(res.response.toc_linkage_mode).toBe('project_default');
      expect(res.response.project_default).toEqual({
        project_id: 501,
        project_name: 'Lead Project Alpha',
        nodes: [
          expect.objectContaining({
            toc_result_id: 1001,
            toc_level_id: 1,
            title: 'Output 1',
          }),
          expect.objectContaining({
            toc_result_id: 1002,
            toc_level_id: 2,
            title: 'Outcome 1',
          }),
        ],
      });
    });

    it('1b. one indicator with several per-center target rows -> one target entry per toc_indicator_target_id, center ids aggregated (post-implementation audit, 2026-09-18)', async () => {
      (aowBilateralRepository.findLeadProjectId as jest.Mock).mockResolvedValue(
        501,
      );
      (
        aowBilateralRepository.findProjectTocLinkage as jest.Mock
      ).mockResolvedValue([
        // Same target row (toc_indicator_target_id: 9001), fanned out by two centers.
        {
          toc_result_id: 1001,
          category: 'OUTPUT',
          result_title: 'Output 1',
          related_node_id: 'node-1',
          indicator_id: 8385,
          indicator_description: 'Indicator 8385',
          indicator_type: 'Other Outputs',
          toc_indicator_target_id: 9001,
          target_value: 5,
          center_id: 1,
        },
        {
          toc_result_id: 1001,
          category: 'OUTPUT',
          result_title: 'Output 1',
          related_node_id: 'node-1',
          indicator_id: 8385,
          indicator_description: 'Indicator 8385',
          indicator_type: 'Other Outputs',
          toc_indicator_target_id: 9001,
          target_value: 5,
          center_id: 2,
        },
        // A distinct target row for the same indicator/year (toc_indicator_target_id: 9002).
        {
          toc_result_id: 1001,
          category: 'OUTPUT',
          result_title: 'Output 1',
          related_node_id: 'node-1',
          indicator_id: 8385,
          indicator_description: 'Indicator 8385',
          indicator_type: 'Other Outputs',
          toc_indicator_target_id: 9002,
          target_value: 6,
          center_id: 3,
        },
      ]);
      (resultRepository.query as jest.Mock).mockResolvedValue([
        { project_name: 'Lead Project Alpha' },
      ]);
      (resultsTocResultRepository.find as jest.Mock).mockResolvedValue([
        {
          result_toc_result_id: 1,
          result_id: 10,
          initiative_ids: 100,
          toc_result_id: 1001,
          planned_result: true,
          toc_level_id: 1,
          is_active: true,
        },
      ]);
      (resultsTocResultRepository.query as jest.Mock).mockResolvedValue([]);

      const res = await service.getTocState(10);

      const indicators = res.response.project_default.nodes[0].indicators;
      expect(indicators).toHaveLength(1);
      expect(indicators[0].targets).toEqual([
        expect.objectContaining({
          toc_indicator_target_id: 9001,
          value: 5,
          center_ids: [1, 2],
        }),
        expect.objectContaining({
          toc_indicator_target_id: 9002,
          value: 6,
          center_ids: [3],
        }),
      ]);
    });

    it('1c. node level_name uses the canonical PRMS naming, never "Work package Output/Outcome" (user-reported, 2026-09-18)', async () => {
      (aowBilateralRepository.findLeadProjectId as jest.Mock).mockResolvedValue(
        501,
      );
      (
        aowBilateralRepository.findProjectTocLinkage as jest.Mock
      ).mockResolvedValue([
        {
          toc_result_id: 1001,
          category: 'OUTPUT',
          result_title: 'Output 1',
          related_node_id: 'node-1',
          indicator_id: null,
          indicator_description: null,
          indicator_type: null,
          target_value: null,
        },
        {
          toc_result_id: 1002,
          category: 'OUTCOME',
          result_title: 'Outcome 1',
          related_node_id: 'node-2',
          indicator_id: null,
          indicator_description: null,
          indicator_type: null,
          target_value: null,
        },
        {
          toc_result_id: 1003,
          category: 'EOI',
          result_title: 'EOI 1',
          related_node_id: 'node-3',
          indicator_id: null,
          indicator_description: null,
          indicator_type: null,
          target_value: null,
        },
      ]);
      (resultRepository.query as jest.Mock).mockResolvedValue([
        { project_name: 'Lead Project Alpha' },
      ]);
      (resultsTocResultRepository.find as jest.Mock).mockResolvedValue([
        {
          result_toc_result_id: 1,
          result_id: 10,
          initiative_ids: 100,
          toc_result_id: 1001,
          planned_result: true,
          toc_level_id: 1,
          is_active: true,
        },
        {
          result_toc_result_id: 2,
          result_id: 10,
          initiative_ids: 100,
          toc_result_id: 1002,
          planned_result: true,
          toc_level_id: 2,
          is_active: true,
        },
        {
          result_toc_result_id: 3,
          result_id: 10,
          initiative_ids: 100,
          toc_result_id: 1003,
          planned_result: true,
          toc_level_id: 3,
          is_active: true,
        },
      ]);
      (resultsTocResultRepository.query as jest.Mock).mockResolvedValue([]);

      const res = await service.getTocState(10);

      const levelNames = res.response.project_default.nodes.map(
        (n: any) => n.level_name,
      );
      expect(levelNames).toEqual([
        'High Level Output',
        'Intermediate Outcome',
        'End of Initiative Outcome',
      ]);
      expect(levelNames).not.toContain('Work package Output');
      expect(levelNames).not.toContain('Work package Outcome');
    });

    it('2. A row with an indicator link -> custom', async () => {
      (aowBilateralRepository.findLeadProjectId as jest.Mock).mockResolvedValue(
        501,
      );
      (
        aowBilateralRepository.findProjectTocLinkage as jest.Mock
      ).mockResolvedValue([
        {
          toc_result_id: 1001,
          category: 'OUTPUT',
          result_title: 'Output 1',
          related_node_id: 'node-1',
          indicator_id: null,
          indicator_description: null,
          indicator_type: null,
          target_value: null,
        },
      ]);

      (resultsTocResultRepository.find as jest.Mock).mockResolvedValue([
        {
          result_toc_result_id: 1,
          result_id: 10,
          initiative_ids: 100,
          toc_result_id: 1001,
          planned_result: true,
          toc_level_id: 1,
          is_active: true,
        },
      ]);
      (resultsTocResultRepository.query as jest.Mock).mockImplementation(
        (query: string) => {
          if (query.includes('results_toc_result_indicators')) {
            return Promise.resolve([{ id: 'ind-123', rtri_id: 77 }]);
          }
          if (query.includes('result_indicators_targets')) {
            return Promise.resolve([{ contributing_indicator: 42 }]);
          }
          return Promise.resolve([]);
        },
      );

      const res = await service.getTocState(10);
      expect(res.response.toc_linkage_mode).toBe('custom');
      expect(res.response.indicator_id).toBe('ind-123');
      expect(res.response.contributing_indicator).toBe(42);
    });

    it('3. A row whose node is outside the default set -> custom', async () => {
      (aowBilateralRepository.findLeadProjectId as jest.Mock).mockResolvedValue(
        501,
      );
      (
        aowBilateralRepository.findProjectTocLinkage as jest.Mock
      ).mockResolvedValue([
        {
          toc_result_id: 1001,
          category: 'OUTPUT',
          result_title: 'Output 1',
          related_node_id: 'node-1',
          indicator_id: null,
          indicator_description: null,
          indicator_type: null,
          target_value: null,
        },
      ]);

      (resultsTocResultRepository.find as jest.Mock).mockResolvedValue([
        {
          result_toc_result_id: 1,
          result_id: 10,
          initiative_ids: 100,
          toc_result_id: 9999,
          planned_result: true,
          toc_level_id: 1,
          is_active: true,
        },
      ]);
      (resultsTocResultRepository.query as jest.Mock).mockResolvedValue([]);

      const res = await service.getTocState(10);
      expect(res.response.toc_linkage_mode).toBe('custom');
    });

    it('4. Legacy planned_result=false row -> custom and text preserved', async () => {
      (aowBilateralRepository.findLeadProjectId as jest.Mock).mockResolvedValue(
        null,
      );

      (resultsTocResultRepository.find as jest.Mock).mockResolvedValue([
        {
          result_toc_result_id: 1,
          result_id: 10,
          initiative_ids: 100,
          toc_result_id: null,
          planned_result: false,
          toc_progressive_narrative: 'Reason why result was not planned',
          toc_level_id: 3,
          is_active: true,
        },
      ]);
      (resultsTocResultRepository.query as jest.Mock).mockResolvedValue([]);

      const res = await service.getTocState(10);
      expect(res.response.toc_linkage_mode).toBe('custom');
      expect(res.response.planned_result).toBe(false);
      expect(res.response.toc_progressive_narrative).toBe(
        'Reason why result was not planned',
      );
    });

    it('5. No rows -> null', async () => {
      (aowBilateralRepository.findLeadProjectId as jest.Mock).mockResolvedValue(
        501,
      );
      (
        aowBilateralRepository.findProjectTocLinkage as jest.Mock
      ).mockResolvedValue([
        {
          toc_result_id: 1001,
          category: 'OUTPUT',
          result_title: 'Output 1',
          related_node_id: 'node-1',
          indicator_id: null,
          indicator_description: null,
          indicator_type: null,
          target_value: null,
        },
      ]);

      (resultsTocResultRepository.find as jest.Mock).mockResolvedValue([]);

      const res = await service.getTocState(10);
      expect(res.response.toc_linkage_mode).toBeNull();
      expect(res.response.planned_result).toBeNull();
      expect(res.response.project_default).not.toBeNull();
    });

    it('6. No owner initiative -> all nulls (existing behaviour)', async () => {
      (
        resultByInitiativesRepository.getOwnerInitiativeByResult as jest.Mock
      ).mockResolvedValue(null);

      const res = await service.getTocState(10);
      expect(res.response).toEqual({
        planned_result: null,
        toc_level_id: null,
        toc_result_id: null,
        indicator_id: null,
        contributing_indicator: null,
        toc_progressive_narrative: null,
        toc_linkage_mode: null,
        project_default: null,
      });
    });

    it('7. linkage query rejects -> project_default: null, no throw', async () => {
      (aowBilateralRepository.findLeadProjectId as jest.Mock).mockResolvedValue(
        501,
      );
      (
        aowBilateralRepository.findProjectTocLinkage as jest.Mock
      ).mockRejectedValue(
        new Error('Connection failure to Integration_information'),
      );

      (resultsTocResultRepository.find as jest.Mock).mockResolvedValue([]);

      const res = await service.getTocState(10);
      expect(res.response.project_default).toBeNull();
      expect(res.response.toc_linkage_mode).toBeNull();
    });

    it('8. GET never calls a write method', async () => {
      const saveTocMappingSpy = jest
        .spyOn(service, 'saveTocMapping')
        .mockImplementation(() => Promise.resolve({} as any));
      const updateTocResultPartialSpy = jest.spyOn(
        resultsTocResultsService,
        'updateTocResultPartial',
      );

      (aowBilateralRepository.findLeadProjectId as jest.Mock).mockResolvedValue(
        501,
      );
      (
        aowBilateralRepository.findProjectTocLinkage as jest.Mock
      ).mockResolvedValue([]);
      (resultsTocResultRepository.find as jest.Mock).mockResolvedValue([]);

      await service.getTocState(10);

      expect(saveTocMappingSpy).not.toHaveBeenCalled();
      expect(updateTocResultPartialSpy).not.toHaveBeenCalled();
      expect(resultRepository.save).not.toHaveBeenCalled();
      expect(resultRepository.update).not.toHaveBeenCalled();
      expect(resultsTocResultRepository.save).not.toHaveBeenCalled();
      expect(resultsTocResultRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('saveTocMapping (BIL-TOC-T-4)', () => {
    let aowBilateralRepository: AoWBilateralRepository;
    let resultsTocResultRepository: ResultsTocResultRepository;
    let resultByInitiativesRepository: ResultByInitiativesRepository;
    let resultsTocResultsService: ResultsTocResultsService;

    const user: TokenDto = {
      id: 42,
      email: 'test@cgiar.org',
      first_name: 'Test',
      last_name: 'User',
    };

    beforeEach(() => {
      aowBilateralRepository = module.get<AoWBilateralRepository>(
        AoWBilateralRepository,
      );
      resultsTocResultRepository = module.get<ResultsTocResultRepository>(
        ResultsTocResultRepository,
      );
      resultByInitiativesRepository = module.get<ResultByInitiativesRepository>(
        ResultByInitiativesRepository,
      );
      resultsTocResultsService = module.get<ResultsTocResultsService>(
        ResultsTocResultsService,
      );

      (resultRepository.findOne as jest.Mock).mockResolvedValue({
        id: 10,
        result_type_id: 1,
        version_id: 1,
        obj_version: {
          id: 1,
          phase_year: 2026,
          toc_pahse_id: 'phase-uuid-2026',
        },
      });

      (
        resultByInitiativesRepository.getOwnerInitiativeByResult as jest.Mock
      ).mockResolvedValue({
        id: 100,
        official_code: 'SP06',
        name: 'Science Program 6',
      });
    });

    it('1. YES payload carrying a forged node ID persists only re-derived default nodes, ignoring forged IDs', async () => {
      (aowBilateralRepository.findLeadProjectId as jest.Mock).mockResolvedValue(
        501,
      );
      (
        aowBilateralRepository.findProjectTocLinkage as jest.Mock
      ).mockResolvedValue([
        {
          toc_result_id: 1001,
          category: 'OUTPUT',
          result_title: 'Output 1',
          related_node_id: 'node-1',
          indicator_id: null,
          indicator_description: null,
          indicator_type: null,
          target_value: null,
        },
      ]);
      (resultsTocResultRepository.find as jest.Mock).mockResolvedValue([]);
      (resultsTocResultRepository.findOne as jest.Mock).mockResolvedValue(null);

      const dto = {
        toc_linkage_mode: 'project_default' as const,
        result_toc_result: {
          result_toc_results: [{ toc_result_id: 9999 }],
        },
      };

      const res = await service.saveTocMapping(10, dto as any, user);
      expect(res.status).toBe(200);

      expect(resultsTocResultRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          result_id: 10,
          initiative_ids: 100,
          toc_result_id: 1001,
          planned_result: true,
          toc_level_id: 1,
          is_active: true,
        }),
      );
      expect(resultsTocResultRepository.create).not.toHaveBeenCalledWith(
        expect.objectContaining({
          toc_result_id: 9999,
        }),
      );
    });

    it('2. YES mode materializes node rows with planned_result=true, indicators not handled', async () => {
      (aowBilateralRepository.findLeadProjectId as jest.Mock).mockResolvedValue(
        501,
      );
      (
        aowBilateralRepository.findProjectTocLinkage as jest.Mock
      ).mockResolvedValue([
        {
          toc_result_id: 1001,
          category: 'OUTPUT',
          result_title: 'Output 1',
          related_node_id: 'node-1',
          indicator_id: null,
          indicator_description: null,
          indicator_type: null,
          target_value: null,
        },
      ]);
      (resultsTocResultRepository.find as jest.Mock).mockResolvedValue([]);
      (resultsTocResultRepository.findOne as jest.Mock).mockResolvedValue(null);

      const dto = {
        toc_linkage_mode: 'project_default' as const,
      };

      const res = await service.saveTocMapping(10, dto as any, user);
      expect(res.status).toBe(200);
      expect(
        resultsTocResultsService.updateTocResultPartial,
      ).not.toHaveBeenCalled();
      expect(resultsTocResultRepository.save).toHaveBeenCalled();
    });

    it('3. NO/custom mode with failing typology verdict throws BadRequestException (400) and writes nothing', async () => {
      (
        resultsTocResultsService.getTocResultTypologyVerdicts as jest.Mock
      ).mockResolvedValue(new Map([[2001, false]]));

      const dto = {
        toc_linkage_mode: 'custom' as const,
        result_toc_result: {
          result_toc_results: [{ toc_result_id: 2001 }],
        },
      };

      await expect(
        service.saveTocMapping(10, dto as any, user),
      ).rejects.toThrow(
        new BadRequestException(
          'Selected ToC node is incompatible with the result type',
        ),
      );

      expect(
        resultsTocResultsService.updateTocResultPartial,
      ).not.toHaveBeenCalled();
      expect(resultsTocResultRepository.save).not.toHaveBeenCalled();
      expect(resultsTocResultRepository.update).not.toHaveBeenCalled();
    });

    it('4. NO/custom mode with passing typology verdict delegates to updateTocResultPartial', async () => {
      (
        resultsTocResultsService.getTocResultTypologyVerdicts as jest.Mock
      ).mockResolvedValue(new Map([[2001, true]]));
      (
        resultsTocResultsService.updateTocResultPartial as jest.Mock
      ).mockResolvedValue({
        status: 200,
        response: { result_id: 10 },
      });

      const dto = {
        toc_linkage_mode: 'custom' as const,
        result_toc_result: {
          result_toc_results: [{ toc_result_id: 2001 }],
        },
      };

      const res = await service.saveTocMapping(10, dto as any, user);
      expect(res).toEqual({
        status: 200,
        response: { result_id: 10 },
      });
      expect(
        resultsTocResultsService.updateTocResultPartial,
      ).toHaveBeenCalledWith(
        10,
        expect.objectContaining({
          initiative_id: 100,
          result_toc_results: [{ toc_result_id: 2001 }],
        }),
        user,
      );
    });

    it('5. Switch custom -> YES deactivates prior custom rows and indicators softly (is_active=false, NO delete call)', async () => {
      (aowBilateralRepository.findLeadProjectId as jest.Mock).mockResolvedValue(
        501,
      );
      (
        aowBilateralRepository.findProjectTocLinkage as jest.Mock
      ).mockResolvedValue([
        {
          toc_result_id: 1001,
          category: 'OUTPUT',
          result_title: 'Output 1',
          related_node_id: 'node-1',
          indicator_id: null,
          indicator_description: null,
          indicator_type: null,
          target_value: null,
        },
      ]);

      (resultsTocResultRepository.find as jest.Mock).mockResolvedValue([
        {
          result_toc_result_id: 88,
          result_id: 10,
          initiative_ids: 100,
          toc_result_id: 2001,
          is_active: true,
        },
      ]);
      (resultsTocResultRepository.findOne as jest.Mock).mockResolvedValue(null);

      const dto = {
        toc_linkage_mode: 'project_default' as const,
      };

      await service.saveTocMapping(10, dto as any, user);

      expect(resultsTocResultRepository.update).toHaveBeenCalledWith(
        { result_toc_result_id: 88 },
        { is_active: false, last_updated_by: user.id },
      );

      expect(resultsTocResultRepository.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE results_toc_result_indicators'),
        [user.id, [88]],
      );

      expect(resultsTocResultRepository.delete).not.toHaveBeenCalled();
    });

    it('6. YES mode with no default linkage found throws BadRequestException (400)', async () => {
      (aowBilateralRepository.findLeadProjectId as jest.Mock).mockResolvedValue(
        null,
      );

      const dto = {
        toc_linkage_mode: 'project_default' as const,
      };

      await expect(
        service.saveTocMapping(10, dto as any, user),
      ).rejects.toThrow(
        new BadRequestException('No default ToC linkage found for this result'),
      );

      expect(resultsTocResultRepository.save).not.toHaveBeenCalled();
    });

    // BIL-RTE-T-2 — design §5.1: the Center-write decision, before any write.
    describe('Center-write access rule (BIL-RTE-T-2, design §5.1)', () => {
      it('falsifier (b): a non-admin denial returns 403 (via HttpException) and no repository write runs', async () => {
        (
          bilateralAccessService.assertCenterWrite as jest.Mock
        ).mockRejectedValueOnce(
          new ForbiddenException(
            'Result 10 is under Science Program review (rule: center).',
          ),
        );

        const dto = { toc_linkage_mode: 'project_default' as const };

        await expect(
          service.saveTocMapping(10, dto as any, user),
        ).rejects.toThrow(ForbiddenException);

        expect(bilateralAccessService.assertCenterWrite).toHaveBeenCalledWith(
          expect.objectContaining({ id: 10 }),
          'center-toc-mapping',
          user,
        );
        expect(resultsTocResultRepository.save).not.toHaveBeenCalled();
        expect(resultsTocResultRepository.update).not.toHaveBeenCalled();
        expect(
          resultsTocResultsService.updateTocResultPartial,
        ).not.toHaveBeenCalled();
      });

      it('falsifier (c): an admin at status 5 proceeds to write (allow path)', async () => {
        (
          resultsTocResultsService.getTocResultTypologyVerdicts as jest.Mock
        ).mockResolvedValue(new Map([[2001, true]]));
        (
          resultsTocResultsService.updateTocResultPartial as jest.Mock
        ).mockResolvedValue({ status: 200, response: { result_id: 10 } });

        const dto = {
          toc_linkage_mode: 'custom' as const,
          result_toc_result: { result_toc_results: [{ toc_result_id: 2001 }] },
        };

        const res = await service.saveTocMapping(10, dto as any, user);

        expect(res.status).toBe(200);
        expect(bilateralAccessService.assertCenterWrite).toHaveBeenCalledWith(
          expect.objectContaining({ id: 10 }),
          'center-toc-mapping',
          user,
        );
        expect(
          resultsTocResultsService.updateTocResultPartial,
        ).toHaveBeenCalled();
      });
    });
  });
});
