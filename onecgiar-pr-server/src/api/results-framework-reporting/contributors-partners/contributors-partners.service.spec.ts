import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultRepository } from '../../results/result.repository';
import { ResultByInitiativesRepository } from '../../results/results_by_inititiatives/resultByInitiatives.repository';
import { ResultsCenterRepository } from '../../results/results-centers/results-centers.repository';
import { ResultsByInstitutionsService } from '../../results/results_by_institutions/results_by_institutions.service';
import { ResultByIntitutionsRepository } from '../../results/results_by_institutions/result_by_intitutions.repository';
import { ResultsTocResultsService } from '../../results/results-toc-results/results-toc-results.service';
import { CreateResultsTocResultV2Dto } from '../../results/results-toc-results/dto/create-results-toc-result-v2.dto';
import { UpdateContributorsPartnersDto } from './dto/update-contributors-partners.dto';
import { ContributorsPartnersService } from './contributors-partners.service';
import { LinkedResultRepository } from '../../results/linked-results/linked-results.repository';
import { LinkedResultsService } from '../../results/linked-results/linked-results.service';
import { ResultsInnovationsDevRepository } from '../../results/summary/repositories/results-innovations-dev.repository';
import { ResultsInnovationsUseRepository } from '../../results/summary/repositories/results-innovations-use.repository';
import { ResultTypeEnum } from '../../../shared/constants/result-type.enum';

describe('ContributorsPartnersService', () => {
  let service: ContributorsPartnersService;
  let resultRepository: jest.Mocked<ResultRepository>;
  let resultByInitiativesRepository: jest.Mocked<ResultByInitiativesRepository>;
  let resultByInstitutionsRepository: jest.Mocked<ResultByIntitutionsRepository>;
  let resultsCenterRepository: jest.Mocked<ResultsCenterRepository>;
  let resultsTocResultsService: jest.Mocked<ResultsTocResultsService>;
  let resultsByInstitutionsService: jest.Mocked<ResultsByInstitutionsService>;
  let linkedResultRepository: jest.Mocked<LinkedResultRepository>;
  let linkedResultsService: jest.Mocked<LinkedResultsService>;
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
          provide: LinkedResultsService,
          useValue: {
            createForInnovationUse: jest.fn(),
          },
        },
        {
          provide: ResultsInnovationsDevRepository,
          useValue: {
            findOne: jest.fn(),
            update: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: ResultsInnovationsUseRepository,
          useValue: {
            findOne: jest.fn(),
            update: jest.fn(),
            save: jest.fn(),
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
    resultRepository.query = jest.fn().mockResolvedValue([]) as any;
    linkedResultsService = module.get(
      LinkedResultsService,
    ) as jest.Mocked<LinkedResultsService>;
    resultByInitiativesRepository = module.get(
      ResultByInitiativesRepository,
    ) as jest.Mocked<ResultByInitiativesRepository>;
    resultByInstitutionsRepository = module.get(
      ResultByIntitutionsRepository,
    ) as jest.Mocked<ResultByIntitutionsRepository>;
    resultsCenterRepository = module.get(
      ResultsCenterRepository,
    ) as jest.Mocked<ResultsCenterRepository>;
    resultsTocResultsService = module.get(
      ResultsTocResultsService,
    ) as jest.Mocked<ResultsTocResultsService>;
    resultsByInstitutionsService = module.get(
      ResultsByInstitutionsService,
    ) as jest.Mocked<ResultsByInstitutionsService>;
    linkedResultRepository = module.get(
      LinkedResultRepository,
    ) as jest.Mocked<LinkedResultRepository>;
    linkedResultsService.createForInnovationUse.mockResolvedValue({
      response: 'Yasta',
      message: 'The data was updated correctly',
      status: HttpStatus.OK,
    } as any);
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
    resultsInnovationsDevRepository.query = jest.fn().mockResolvedValue([]);
    resultsInnovationsUseRepository.query = jest.fn().mockResolvedValue([]);
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
      const institutionsPayload = [
        {
          id: '22853',
          is_active: true,
          is_predicted: false,
          created_date: '2025-11-04T19:33:17.450Z',
          last_updated_date: '2025-11-04T20:50:51.000Z',
          is_leading_result: false,
          result_id: '8387',
          institutions_id: 1,
          institution_roles_id: '2',
          result_kp_mqap_institution_id: null,
          delivery: [],
          obj_institutions: {
            name: 'Wageningen University and Research Centre',
            website_link: 'http://www.wur.nl/en.htm',
            obj_institution_type_code: {
              id: 60,
              name: 'Research organizations and universities National (Universities)',
            },
          },
        },
        {
          id: '22862',
          is_active: true,
          is_predicted: false,
          created_date: '2025-11-04T20:50:50.239Z',
          last_updated_date: '2025-11-04T20:50:50.239Z',
          is_leading_result: false,
          result_id: '8387',
          institutions_id: 3,
          institution_roles_id: '2',
          result_kp_mqap_institution_id: null,
          delivery: [
            {
              id: 26904,
              partner_delivery_type_id: 1,
              result_by_institution_id: '22862',
              is_active: true,
              created_by: 615,
              created_date: '2025-11-04T20:50:52.100Z',
              last_updated_by: 615,
              last_updated_date: '2025-11-04T20:50:52.100Z',
            },
            {
              id: 26905,
              partner_delivery_type_id: 3,
              result_by_institution_id: '22862',
              is_active: true,
              created_by: 615,
              created_date: '2025-11-04T20:50:52.436Z',
              last_updated_by: 615,
              last_updated_date: '2025-11-04T20:50:52.436Z',
            },
          ],
          obj_institutions: {
            name: 'Institut National de Recherche Agricole du Benin',
            website_link: 'http://inrab.org/',
            obj_institution_type_code: {
              id: 68,
              name: 'Government (National)',
            },
          },
        },
      ];
      resultsInnovationsDevRepository.query.mockImplementation(
        async (sql: string, params: any[]) => {
          if (
            sql.includes('SELECT has_innovation_link') &&
            params?.[0] === resultId
          ) {
            return [{ has_innovation_link: 1 }];
          }
          return [];
        },
      );
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
            institutions: institutionsPayload,
            mqap_institutions: [],
            bilateral_projects: [],
            contributing_center: [],
            is_lead_by_partner: true,
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
          institutions: institutionsPayload.map((inst) => ({
            ...inst,
            delivery: inst.delivery.filter((d) => d.is_active),
          })),
          mqap_institutions: [],
          contributing_center: [],
          bilateral_projects: [],
          no_applicable_partner: false,
          is_lead_by_partner: true,
          has_innovation_link: true,
          linked_results: [1001, 1002],
        },
        message: 'Contributors and Partners fetched successfully (P25)',
        status: HttpStatus.OK,
      });

      expect(resultsTocResultsService.getTocByResultV2).toHaveBeenCalledWith(
        resultId,
      );
      expect(resultsInnovationsDevRepository.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT has_innovation_link'),
        [resultId],
      );
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
      linkedResultRepository.find.mockResolvedValue([
        { linked_results_id: 1001 } as any,
      ]);
      const payload: UpdateContributorsPartnersDto = {
        has_innovation_link: true,
        linked_results: [
          { id: '1001', selected: true },
          { id: 1002, selected: true },
          { id: 'invalid', selected: true },
          { id: 9999, selected: false },
        ],
      } as any;
      const user = { id: 9 } as TokenDto;

      linkedResultRepository.getActiveLinkedResultIds.mockResolvedValue([
        1001, 1002,
      ]);

      resultsInnovationsDevRepository.query.mockImplementation(
        async (sql: string) => {
          if (sql.includes('SELECT result_innovation_dev_id')) {
            return [];
          }
          if (sql.includes('INSERT INTO results_innovations_dev')) {
            return [];
          }
          return [];
        },
      );
      (resultRepository.query as jest.Mock).mockImplementation(
        async (sql: string) => {
          if (sql.includes('SELECT id FROM result')) {
            return [{ id: 1001 }, { id: 1002 }];
          }
          return [];
        },
      );

      const result = await service.updateContributorsAndPartners(
        55,
        payload,
        user,
      );

      expect(resultsInnovationsDevRepository.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT result_innovation_dev_id'),
        [55],
      );
      expect(resultsInnovationsDevRepository.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO results_innovations_dev'),
        [55, 1, user.id, user.id],
      );
      expect(resultRepository.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id FROM result'),
        [1001, 1002],
      );
      expect(linkedResultsService.createForInnovationUse).toHaveBeenCalledWith(
        55,
        [1001, 1002],
        user,
      );
      expect(
        linkedResultRepository.getActiveLinkedResultIds,
      ).toHaveBeenCalledWith(55);
      expect(result).toEqual({
        response: {
          has_innovation_link: true,
          linked_results: [1001, 1002],
        },
        message: 'Innovation linkage updated.',
        status: HttpStatus.OK,
      });
    });
  });
});
