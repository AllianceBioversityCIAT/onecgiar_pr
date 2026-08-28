import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
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
import { InstitutionRoleEnum } from '../../results/results_by_institutions/entities/institution_role.enum';

describe('BilateralCenterService', () => {
  let service: BilateralCenterService;
  let module: TestingModule;
  let versioningService: VersioningService;
  let resultRepository: ResultRepository;
  let resultByLevelRepository: ResultByLevelRepository;
  let yearRepository: YearRepository;
  let bilateralProjectsService: BilateralProjectsService;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        BilateralCenterService,
        {
          provide: BilateralProjectsService,
          useValue: {
            getProjectsByCenter: jest.fn().mockResolvedValue({ projects: [] }),
          },
        },
        {
          provide: BilateralService,
          useValue: {
            handleLeadCenter: jest.fn().mockResolvedValue(undefined),
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
            // P2-3157: submitForReview wraps its writes in a transaction.
            manager: {
              transaction: jest.fn(async (cb: any) =>
                cb({
                  update: jest.fn().mockResolvedValue({}),
                  create: jest.fn((_entity, payload) => payload),
                  save: jest.fn().mockResolvedValue({}),
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
          },
        },
        {
          provide: ResultsTocResultRepository,
          useValue: {
            findOne: jest.fn(),
            query: jest.fn(),
          },
        },
        {
          provide: ResultByInitiativesRepository,
          useValue: {
            getOwnerInitiativeByResult: jest.fn().mockResolvedValue({ id: 1 }),
            save: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: ClarisaInitiativesRepository,
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: ClarisaCentersRepository,
          useValue: {
            find: jest.fn().mockResolvedValue([]),
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
      ],
    }).compile();

    service = module.get<BilateralCenterService>(BilateralCenterService);
    versioningService = module.get<VersioningService>(VersioningService);
    resultRepository = module.get<ResultRepository>(ResultRepository);
    resultByLevelRepository = module.get<ResultByLevelRepository>(
      ResultByLevelRepository,
    );
    yearRepository = module.get<YearRepository>(YearRepository);
    bilateralProjectsService = module.get<BilateralProjectsService>(
      BilateralProjectsService,
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
    );
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

    it('moves an Editing result to PENDING_REVIEW', async () => {
      (resultRepository.findOne as jest.Mock).mockResolvedValue(editingResult);

      const result = await service.submitForReview(user, 77);

      expect((result.response as any).status).toBe(
        ResultStatusData.PendingReview.value,
      );
      expect(resultRepository.manager.transaction).toHaveBeenCalled();
    });

    it('stamps the submission date the review queue shows', async () => {
      (resultRepository.findOne as jest.Mock).mockResolvedValue(editingResult);
      const update = jest.fn().mockResolvedValue({});
      (
        resultRepository.manager.transaction as jest.Mock
      ).mockImplementationOnce(async (cb: any) =>
        cb({
          update,
          create: jest.fn((_entity, payload) => payload),
          save: jest.fn().mockResolvedValue({}),
        }),
      );

      await service.submitForReview(user, 77);

      const [, , patch] = update.mock.calls[0];
      expect(patch.external_submitted_date).toEqual(expect.any(String));
      expect(new Date(patch.external_submitted_date).toString()).not.toBe(
        'Invalid Date',
      );
    });

    it('accepts an AI Draft result too', async () => {
      (resultRepository.findOne as jest.Mock).mockResolvedValue({
        ...editingResult,
        status_id: ResultStatusData.Draft.value,
      });

      const result = await service.submitForReview(user, 77);

      expect((result.response as any).status).toBe(
        ResultStatusData.PendingReview.value,
      );
    });

    it('rejects a result that is already under review', async () => {
      (resultRepository.findOne as jest.Mock).mockResolvedValue({
        ...editingResult,
        status_id: ResultStatusData.PendingReview.value,
      });

      await expect(service.submitForReview(user, 77)).rejects.toThrow(
        /Editing or Draft/,
      );
    });

    it('rejects an unknown bilateral result', async () => {
      (resultRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.submitForReview(user, 77)).rejects.toThrow(
        'Bilateral result not found',
      );
    });

    it('rejects an invalid resultId', async () => {
      await expect(service.submitForReview(user, 0 as any)).rejects.toThrow(
        /valid positive number/,
      );
    });

    it('refuses a user without the Center User role on the lead centre', async () => {
      (resultRepository.findOne as jest.Mock).mockResolvedValue(editingResult);
      const roleByUserRepository =
        module.get<RoleByUserRepository>(RoleByUserRepository);
      (
        roleByUserRepository.validationCenterPermissions as jest.Mock
      ).mockResolvedValue(0);

      await expect(service.submitForReview(user, 77)).rejects.toThrow(
        /do not have permission/,
      );
    });

    it('refuses a result with no lead centre', async () => {
      (resultRepository.findOne as jest.Mock).mockResolvedValue(editingResult);
      const resultsCenterRepository = module.get<ResultsCenterRepository>(
        ResultsCenterRepository,
      );
      (
        resultsCenterRepository.getAllResultsCenterByResultId as jest.Mock
      ).mockResolvedValue([{ code: 'CIAT', is_leading_result: 0 }]);

      await expect(service.submitForReview(user, 77)).rejects.toThrow(
        /no lead center/,
      );
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

      await expect(service.submitForReview(user, 77)).rejects.toThrow(
        /no Science Program assigned/,
      );
    });
  });
});
