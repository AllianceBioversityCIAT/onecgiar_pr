import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultRepository } from '../../results/result.repository';
import { ResultByInitiativesRepository } from '../../results/results_by_inititiatives/resultByInitiatives.repository';
import { ResultsByProjectsRepository } from '../../results/results_by_projects/results_by_projects.repository';
import { ResultsCenterRepository } from '../../results/results-centers/results-centers.repository';
import { ResultsByInstitutionsService } from '../../results/results_by_institutions/results_by_institutions.service';
import { ResultByIntitutionsRepository } from '../../results/results_by_institutions/result_by_intitutions.repository';
import { ResultsTocResultsService } from '../../results/results-toc-results/results-toc-results.service';
import { CreateResultsTocResultV2Dto } from '../../results/results-toc-results/dto/create-results-toc-result-v2.dto';
import { UpdateContributorsPartnersDto } from './dto/update-contributors-partners.dto';
import { ContributorsPartnersService } from './contributors-partners.service';
import { LinkedResultRepository } from '../../results/linked-results/linked-results.repository';
import { ResultsInnovationsDevRepository } from '../../results/summary/repositories/results-innovations-dev.repository';
import { ResultsInnovationsUseRepository } from '../../results/summary/repositories/results-innovations-use.repository';
import { ResultTypeEnum } from '../../../shared/constants/result-type.enum';

describe('ContributorsPartnersService', () => {
  let service: ContributorsPartnersService;
  let resultRepository: jest.Mocked<ResultRepository>;
  let resultByInitiativesRepository: jest.Mocked<ResultByInitiativesRepository>;
  let resultByInstitutionsRepository: jest.Mocked<ResultByIntitutionsRepository>;
  let resultsCenterRepository: jest.Mocked<ResultsCenterRepository>;
  let resultsByProjectsRepository: jest.Mocked<ResultsByProjectsRepository>;
  let resultsTocResultsService: jest.Mocked<ResultsTocResultsService>;
  let resultsByInstitutionsService: jest.Mocked<ResultsByInstitutionsService>;
  let linkedResultRepository: jest.Mocked<LinkedResultRepository>;
  let resultsInnovationsDevRepository: jest.Mocked<ResultsInnovationsDevRepository>;
  let resultsInnovationsUseRepository: jest.Mocked<ResultsInnovationsUseRepository>;
  let handlersError: { returnErrorRes: jest.Mock };

  beforeEach(async () => {
    handlersError = { returnErrorRes: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContributorsPartnersService,
        {
          provide: ResultRepository,
          useValue: {
            getResultById: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: ResultByInitiativesRepository,
          useValue: {
            getOwnerInitiativeByResult: jest.fn(),
            getContributorInitiativeByResult: jest.fn(),
            getPendingInit: jest.fn(),
          },
        },
        {
          provide: ResultByIntitutionsRepository,
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: ResultsCenterRepository,
          useValue: {
            getAllResultsCenterByResultId: jest.fn(),
          },
        },
        {
          provide: ResultsByProjectsRepository,
          useValue: {
            findResultsByProjectsByResultId: jest.fn(),
          },
        },
        {
          provide: ResultsTocResultsService,
          useValue: {
            getTocByResult: jest.fn(),
            getTocByResultV2: jest.fn(),
            createTocMappingV2: jest.fn(),
          },
        },
        {
          provide: ResultsByInstitutionsService,
          useValue: {
            savePartnersInstitutionsByResultV2: jest.fn(),
            getInstitutionsPartnersByResultIdV2: jest.fn(),
          },
        },
        {
          provide: LinkedResultRepository,
          useValue: {
            getActiveLinkedResultIds: jest.fn(),
            updateLink: jest.fn(),
            find: jest.fn(),
            create: jest.fn((entity) => entity),
            save: jest.fn(),
          },
        },
        {
          provide: ResultsInnovationsDevRepository,
          useValue: {
            findOne: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: ResultsInnovationsUseRepository,
          useValue: {
            findOne: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: HandlersError,
          useValue: handlersError,
        },
      ],
    }).compile();

    service = module.get(ContributorsPartnersService);
    resultRepository = module.get(
      ResultRepository,
    ) as jest.Mocked<ResultRepository>;
    resultRepository.find.mockResolvedValue([]);
    resultByInitiativesRepository = module.get(
      ResultByInitiativesRepository,
    ) as jest.Mocked<ResultByInitiativesRepository>;
    resultByInstitutionsRepository = module.get(
      ResultByIntitutionsRepository,
    ) as jest.Mocked<ResultByIntitutionsRepository>;
    resultsCenterRepository = module.get(
      ResultsCenterRepository,
    ) as jest.Mocked<ResultsCenterRepository>;
    resultsByProjectsRepository = module.get(
      ResultsByProjectsRepository,
    ) as jest.Mocked<ResultsByProjectsRepository>;
    resultsTocResultsService = module.get(
      ResultsTocResultsService,
    ) as jest.Mocked<ResultsTocResultsService>;
    resultsByInstitutionsService = module.get(
      ResultsByInstitutionsService,
    ) as jest.Mocked<ResultsByInstitutionsService>;
    linkedResultRepository = module.get(
      LinkedResultRepository,
    ) as jest.Mocked<LinkedResultRepository>;
    resultsInnovationsDevRepository = module.get(
      ResultsInnovationsDevRepository,
    ) as jest.Mocked<ResultsInnovationsDevRepository>;
    resultsInnovationsUseRepository = module.get(
      ResultsInnovationsUseRepository,
    ) as jest.Mocked<ResultsInnovationsUseRepository>;

    linkedResultRepository.find.mockResolvedValue([]);
    linkedResultRepository.updateLink.mockResolvedValue(undefined);
    linkedResultRepository.save.mockResolvedValue(undefined);
    linkedResultRepository.getActiveLinkedResultIds.mockResolvedValue([]);
    resultsInnovationsDevRepository.update.mockResolvedValue({} as any);
    resultsInnovationsUseRepository.update.mockResolvedValue({} as any);
    resultsInnovationsDevRepository.findOne.mockResolvedValue(null);
    resultsInnovationsUseRepository.findOne.mockResolvedValue(null);
  });

  describe('getContributorsPartnersByResultId', () => {
    it('should merge ToC mapping data into the contributors response', async () => {
      const resultId = 8387;
      const mockResult = {
        id: resultId,
        result_code: '6163',
        title: 'Test Innovation',
        result_level_id: 4,
        no_applicable_partner: 0,
        is_lead_by_partner: 1,
        result_type_id: ResultTypeEnum.INNOVATION_DEVELOPMENT,
      } as any;
      resultRepository.getResultById.mockResolvedValue(mockResult);

      const mockInitiative = {
        id: 50,
        official_code: 'SP01',
        initiative_name: 'Breeding for Tomorrow',
        short_name: 'Breeding for Tomorrow',
        initiative_role_id: '1',
        is_active: 1,
      } as any;
      resultByInitiativesRepository.getOwnerInitiativeByResult.mockResolvedValue(
        mockInitiative,
      );
      resultByInitiativesRepository.getContributorInitiativeByResult.mockResolvedValue(
        [],
      );
      resultByInitiativesRepository.getPendingInit.mockResolvedValue([]);

      resultByInstitutionsRepository.find.mockResolvedValue([]);
      resultsCenterRepository.getAllResultsCenterByResultId.mockResolvedValue(
        [],
      );
      const bilateralProjects = [
        {
          id: 15,
          result_id: `${resultId}`,
          project_id: '260',
          is_active: true,
          created_date: '2025-10-26T07:37:05.576Z',
          last_updated_date: '2025-10-26T07:37:05.576Z',
          created_by: '615',
          last_updated_by: '615',
        },
      ] as any[];
      resultsByProjectsRepository.findResultsByProjectsByResultId.mockResolvedValue(
        bilateralProjects as any,
      );
      resultsInnovationsDevRepository.findOne.mockResolvedValue({
        has_innovation_link: true,
      } as any);
      linkedResultRepository.getActiveLinkedResultIds.mockResolvedValue([
        1001, 1002,
      ]);

      const tocResponse = {
        contributing_initiatives: {
          accepted_contributing_initiatives: [],
          pending_contributing_initiatives: [],
        },
        contributing_and_primary_initiative: [mockInitiative],
        result_toc_result: {
          planned_result: null,
          initiative_id: mockInitiative.id,
          official_code: mockInitiative.official_code,
          short_name: mockInitiative.short_name,
          result_toc_results: [],
        },
        contributors_result_toc_result: [],
        impacts: null,
        impactsTarge: null,
        sdgTargets: null,
      };
      resultsTocResultsService.getTocByResultV2.mockResolvedValue({
        response: tocResponse,
        status: HttpStatus.OK,
        message: 'ok',
      });

      resultsByInstitutionsService.getInstitutionsPartnersByResultIdV2.mockResolvedValue(
        {
          response: {
            no_applicable_partner: false,
            institutions: [],
            mqap_institutions: [],
            bilateral_projects: [],
            contributing_center: [],
            is_lead_by_partner: false,
          },
          message: 'Successful response (P25)',
          status: HttpStatus.OK,
        },
      );

      const response =
        await service.getContributorsPartnersByResultId(resultId);

      expect(response).toEqual({
        response: {
          result_id: resultId,
          result_code: mockResult.result_code,
          title: mockResult.title,
          level_id: mockResult.result_level_id,
          owner_initiative: mockInitiative,
          ...tocResponse,
          institutions: [],
          mqap_institutions: [],
          contributing_center: [],
          bilateral_projects: bilateralProjects,
          no_applicable_partner: false,
          is_lead_by_partner: true,
          innovation_link: {
            hasInnovationLink: true,
            linkedResultIds: [1001, 1002],
          },
        },
        message: 'Contributors and Partners fetched successfully (P25)',
        status: HttpStatus.OK,
      });

      expect(resultsTocResultsService.getTocByResultV2).toHaveBeenCalledWith(
        resultId,
      );
      expect(resultsInnovationsDevRepository.findOne).toHaveBeenCalledWith({
        where: { results_id: resultId, is_active: true },
        select: ['has_innovation_link'],
      });
      expect(
        linkedResultRepository.getActiveLinkedResultIds,
      ).toHaveBeenCalledWith(resultId);
    });

    it('should delegate errors to the handler when result is missing', async () => {
      const errorResponse = { message: 'handled error' };
      handlersError.returnErrorRes.mockReturnValue(errorResponse);
      resultRepository.getResultById.mockResolvedValue(null);
      resultByInitiativesRepository.getOwnerInitiativeByResult.mockResolvedValue(
        null,
      );

      const response = await service.getContributorsPartnersByResultId(9999);

      expect(response).toBe(errorResponse);
      expect(handlersError.returnErrorRes).toHaveBeenCalled();
    });
  });

  describe('updateTocMappingV2', () => {
    it('should attach resultId to the dto before delegating', async () => {
      const dto: CreateResultsTocResultV2Dto = {
        changePrimaryInit: 1,
      };
      const user = { id: 1 } as TokenDto;
      const expected = { status: HttpStatus.OK } as any;
      resultsTocResultsService.createTocMappingV2.mockResolvedValue(expected);

      const response = await service.updateTocMappingV2(123, dto, user);

      expect(dto.result_id).toBe(123);
      expect(resultsTocResultsService.createTocMappingV2).toHaveBeenCalledWith(
        dto,
        user,
      );
      expect(response).toBe(expected);
    });
  });

  describe('updateContributorsAndPartners', () => {
    it('should update both toc mapping and partners when payload contains both', async () => {
      resultRepository.getResultById.mockResolvedValue({
        id: 321,
        result_type_id: ResultTypeEnum.POLICY_CHANGE,
      } as any);
      const tocRes = {
        response: { toc: true },
        status: HttpStatus.OK,
        message: 'Toc ok',
      } as any;
      const partnersRes = {
        response: { partners: true },
        status: HttpStatus.CREATED,
        message: 'Partners ok',
      } as any;
      resultsTocResultsService.createTocMappingV2.mockResolvedValue(tocRes);
      resultsByInstitutionsService.savePartnersInstitutionsByResultV2.mockResolvedValue(
        partnersRes,
      );

      const payload: UpdateContributorsPartnersDto = {
        changePrimaryInit: 2,
        result_toc_result: {
          planned_result: true,
          initiative_id: 10,
          result_toc_results: [],
        },
        contributors_result_toc_result: [],
        institutions: [],
        contributing_center: [],
        bilateral_projects: [],
        no_applicable_partner: false,
        is_lead_by_partner: true,
      };
      const user = { id: 5 } as TokenDto;

      const result = await service.updateContributorsAndPartners(
        321,
        payload,
        user,
      );

      expect(resultsTocResultsService.createTocMappingV2).toHaveBeenCalled();
      const tocArg =
        resultsTocResultsService.createTocMappingV2.mock.calls[0][0];
      expect(tocArg).toMatchObject({
        result_id: 321,
        changePrimaryInit: 2,
        result_toc_result: payload.result_toc_result,
        contributors_result_toc_result: payload.contributors_result_toc_result,
      });
      expect(
        resultsByInstitutionsService.savePartnersInstitutionsByResultV2,
      ).toHaveBeenCalled();
      const partnersArg =
        resultsByInstitutionsService.savePartnersInstitutionsByResultV2.mock
          .calls[0][0];
      expect(partnersArg).toMatchObject({
        result_id: 321,
        institutions: payload.institutions,
        contributing_center: payload.contributing_center,
        bilateral_project: [],
        no_applicable_partner: false,
        is_lead_by_partner: true,
      });
      expect(result).toEqual({
        response: {
          toc_mapping: tocRes.response,
          partners: partnersRes.response,
        },
        message: 'Toc ok | Partners ok',
        status: HttpStatus.CREATED,
      });
    });

    it('should manage innovation linkage for innovation development results', async () => {
      resultRepository.getResultById.mockResolvedValue({
        id: 55,
        result_type_id: ResultTypeEnum.INNOVATION_DEVELOPMENT,
      } as any);
      resultRepository.find.mockResolvedValue([
        { id: 1001 },
        { id: 1002 },
      ] as any);

      linkedResultRepository.find.mockResolvedValue([
        { linked_results_id: 1001 } as any,
      ]);
      const payload: UpdateContributorsPartnersDto = {
        has_innovation_link: true,
        linked_results: [1001, '1002', 'invalid'],
      } as any;
      const user = { id: 9 } as TokenDto;

      const result = await service.updateContributorsAndPartners(
        55,
        payload,
        user,
      );

      expect(resultsInnovationsDevRepository.update).toHaveBeenCalledWith(
        { results_id: 55 },
        {
          has_innovation_link: true,
          last_updated_by: user.id,
        },
      );
      expect(resultsInnovationsDevRepository.update).toHaveBeenCalledTimes(1);
      expect(resultRepository.find).toHaveBeenCalledWith({
        where: {
          id: expect.anything(),
          is_active: true,
        },
        select: ['id'],
      });
      expect(resultRepository.find).toHaveBeenCalledTimes(1);
      expect(linkedResultRepository.updateLink).toHaveBeenCalledWith(
        55,
        [1001, 1002],
        [],
        user.id,
        false,
      );
      expect(linkedResultRepository.updateLink).toHaveBeenCalledTimes(1);
      expect(linkedResultRepository.save).toHaveBeenCalledWith([
        expect.objectContaining({
          origin_result_id: 55,
          linked_results_id: 1002,
          created_by: user.id,
          last_updated_by: user.id,
        }),
      ]);
      expect(linkedResultRepository.save).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        response: {
          innovation_link: {
            hasInnovationLink: true,
            linkedResultIds: [1001, 1002],
          },
        },
        message: 'Innovation linkage updated.',
        status: HttpStatus.OK,
      });
    });
  });
});
