import { Test, TestingModule } from '@nestjs/testing';
import { InnovationPathwayStepFourService } from '../innovation-pathway-step-four.service';
import { ResultRepository } from '../../../results/result.repository';
import { HandlersError } from '../../../../shared/handlers/error.utils';
import { ResultInnovationPackageRepository } from '../../result-innovation-package/repositories/result-innovation-package.repository';
import { VersionsService } from '../../../results/versions/versions.service';
import { EvidencesRepository } from '../../../results/evidences/evidences.repository';
import { IpsrRepository } from '../../ipsr.repository';
import { ResultByInitiativesRepository } from '../../../results/results_by_inititiatives/resultByInitiatives.repository';
import { ResultInitiativeBudgetRepository } from '../../../results/result_budget/repositories/result_initiative_budget.repository';
import { NonPooledProjectRepository } from '../../../results/non-pooled-projects/non-pooled-projects.repository';
import { NonPooledProjectBudgetRepository } from '../../../results/result_budget/repositories/non_pooled_proyect_budget.repository';
import { ResultByIntitutionsRepository } from '../../../results/results_by_institutions/result_by_intitutions.repository';
import { ResultInstitutionsBudgetRepository } from '../../../results/result_budget/repositories/result_institutions_budget.repository';
import { ResultByInstitutionsByDeliveriesTypeRepository } from '../../../results/result-by-institutions-by-deliveries-type/result-by-institutions-by-deliveries-type.repository';
import { VersioningService } from '../../../versioning/versioning.service';
import { HttpStatus } from '@nestjs/common';
import { SaveStepFour } from '../dto/save-step-four.dto';
import { TokenDto } from '../../../../shared/globalInterfaces/token.dto';
import { Version } from '../../../versioning/entities/version.entity';

import { UpdateResult } from 'typeorm';

interface InstitutionsInterface {
  institutions_id: number;
  deliveries: number[];
}

describe('InnovationPathwayStepFourService', () => {
  let service: InnovationPathwayStepFourService;
  let resultRepository: ResultRepository;
  let evidenceRepository: EvidencesRepository;
  let resultInnovationPackageRepository: ResultInnovationPackageRepository;

  const mockResultRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockEvidenceRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    getMaterials: jest.fn(),
    Logger: jest.fn(),
    ReturnResponse: jest.fn(),
  };

  const mockResultInnovationPackageRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockVersionsService = {
    findOne: jest.fn(),
  };

  const mockIpsrRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockResultByInitiativesRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockResultInitiativeBudgetRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockNonPooledProjectRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockNonPooledProjectBudgetRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockResultByIntitutionsRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockResultInstitutionsBudgetRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockResultByInstitutionsByDeliveriesTypeRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    inactiveResultDeLivery: jest.fn(),
    getDeliveryByTypeAndResultByInstitution: jest.fn(),
  };

  const mockVersioningService = {
    $_findActivePhase: jest.fn(),
  };

  const mockHandlersError = {
    returnErrorRes: jest.fn(),
  };

  const mockEvidenceSaveResponse = {
    id: 1,
    link: 'http://example.com',
    description: 'Test material',
    gender_related: false,
    youth_related: false,
    nutrition_related: false,
    environmental_biodiversity_related: false,
    poverty_related: false,
    is_supplementary: false,
    knowledge_product_related: 0,
    is_sharepoint: 0,
    innovation_readiness_related: false,
    innovation_use_related: false,
    result_id: null,
    evidence_type_id: 2,
    is_active: 1,
    created_by: null,
    creation_date: new Date(),
    last_updated_by: null,
    last_updated_date: null,
    obj_result: null,
    evidence_type: null,
    evidenceSharepointArray: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InnovationPathwayStepFourService,
        {
          provide: ResultRepository,
          useValue: mockResultRepository,
        },
        {
          provide: EvidencesRepository,
          useValue: mockEvidenceRepository,
        },
        {
          provide: ResultInnovationPackageRepository,
          useValue: mockResultInnovationPackageRepository,
        },
        {
          provide: VersionsService,
          useValue: mockVersionsService,
        },
        {
          provide: IpsrRepository,
          useValue: mockIpsrRepository,
        },
        {
          provide: ResultByInitiativesRepository,
          useValue: mockResultByInitiativesRepository,
        },
        {
          provide: ResultInitiativeBudgetRepository,
          useValue: mockResultInitiativeBudgetRepository,
        },
        {
          provide: NonPooledProjectRepository,
          useValue: mockNonPooledProjectRepository,
        },
        {
          provide: NonPooledProjectBudgetRepository,
          useValue: mockNonPooledProjectBudgetRepository,
        },
        {
          provide: ResultByIntitutionsRepository,
          useValue: mockResultByIntitutionsRepository,
        },
        {
          provide: ResultInstitutionsBudgetRepository,
          useValue: mockResultInstitutionsBudgetRepository,
        },
        {
          provide: ResultByInstitutionsByDeliveriesTypeRepository,
          useValue: mockResultByInstitutionsByDeliveriesTypeRepository,
        },
        {
          provide: VersioningService,
          useValue: mockVersioningService,
        },
        {
          provide: HandlersError,
          useValue: mockHandlersError,
        },
      ],
    }).compile();

    service = module.get<InnovationPathwayStepFourService>(
      InnovationPathwayStepFourService,
    );
    resultRepository = module.get<ResultRepository>(ResultRepository);
    evidenceRepository = module.get<EvidencesRepository>(EvidencesRepository);
    resultInnovationPackageRepository =
      module.get<ResultInnovationPackageRepository>(
        ResultInnovationPackageRepository,
      );
  });

  describe('saveMain', () => {
    it('should save step four data successfully', async () => {
      const resultId = 1;
      const user: TokenDto = {
        id: 1,
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
      };
      const saveStepFourDto: SaveStepFour = {
        initiative_unit_time_id: 1,
        initiative_expected_time: '12',
        bilateral_unit_time_id: 1,
        bilateral_expected_time: '12',
        partner_unit_time_id: 1,
        partner_expected_time: '12',
        ipsr_materials: [{ link: 'http://example.com' }],
        ipsr_pictures: [{ link: 'http://example.com' }],
        initiative_expected_investment: [
          {
            result_initiative_id: 1,
            current_year: 1000,
            next_year: 1200,
            is_determined: true,
            initiative_id: 1,
          },
        ],
        bilateral_expected_investment: [
          {
            non_pooled_projetct_id: 1,
            in_cash: 500,
            in_kind: 100,
            is_determined: true,
            is_active: true,
          },
        ],
        institutions_expected_investment: [
          {
            result_institutions_budget_id: 1,
            result_institution_id: 1,
            in_cash: 200,
            in_kind: 50,
            kind_cash: 0,
            is_determined: true,
            is_active: true,
            created_date: new Date(),
            last_updated_date: new Date(),
            created_by: 1,
            last_updated_by: 1,
            obj_result_institution: {
              id: 1,
              is_active: true,
              is_predicted: false,
              result_id: 1,
              institutions_id: 1,
              institution_roles_id: 2,
              result_kp_mqap_institution_id: null,
              is_leading_result: false,
              created_by: 1,
              created_date: new Date(),
              last_updated_by: 1,
              last_updated_date: new Date(),
              obj_institutions: {
                id: 1,
                name: 'Test Institution',
                acronym: 'TI',
                website_link: 'http://example.com',
                institution_type_code: 1,
                is_active: true,
                last_updated_date: new Date(),
                clarisa_center: null,
                headquarter_country_iso2: null,
                obj_headquarter_country_iso2: null,
                result_knowledge_product_institution_array: [],
                obj_institution_type_code: {
                  code: 1,
                  name: 'Test Type',
                  id_parent: null,
                  is_legacy: false,
                  children: [],
                  obj_parent: null,
                },
              },
              obj_institution_roles: {
                id: 2,
                name: 'Partner',
              },
              obj_result: null,
              result_kp_mqap_institution_object: null,
              delivery: [],
              result_institution_budget_array: [],
            },
          },
        ],
      };

      const mockResult = {
        id: resultId,
        result_code: 12345,
        title: 'Test Result',
        description: 'Test Description',
        result_type_id: 1,
        result_level_id: 1,
        gender_tag_level_id: 1,
        climate_change_tag_level_id: 1,
        nutrition_tag_level_id: 1,
        environmental_biodiversity_tag_level_id: 1,
        poverty_tag_level_id: 1,
        is_active: true,
        in_qa: false,
        version_id: 1,
        created_by: 1,
        created_date: new Date(),
        last_updated_by: 1,
        last_updated_date: new Date(),
        status: 0,
        status_id: 1,
        reported_year_id: 2023,
        legacy_id: null,
        krs_url: null,
        is_krs: false,
        no_applicable_partner: false,
        geographic_scope_id: 1,
        has_regions: false,
        lead_contact_person: 'Test Contact',
        has_countries: false,
        is_discontinued: false,
        is_replicated: false,
        last_action_type: null,
        justification_action_type: null,
        is_lead_by_partner: false,
        initiative_id: 1,
        obj_result_type: null,
        obj_result_level: null,
        obj_gender_tag_level: null,
        obj_climate_change_tag_level: null,
        obj_nutrition_tag_level: null,
        obj_environmental_biodiversity_tag_level: null,
        obj_poverty_tag_level_id: null,
        obj_version: null,
        obj_created: null,
        obj_last_updated: null,
        obj_legacy: null,
        obj_geographic_scope: null,
        obj_status: null,
        result_knowledge_product_array: [],
        result_region_array: [],
        result_country_array: [],
        obj_result: [],
        obj_result_actor: [],
        result_by_institution_array: [],
        obj_result_by_initiatives: [],
        result_center_array: [],
        obj_result_expert_workshop: [],
        obj_result_id: [],
        obj_share_result: [],
        obj_results_toc_result: [],
        obj_result_notification: [],
        contribution_to_indicator_result_array: [],
        obj_result_qaed: [],
      };
      const mockVersion: Version = {
        id: 1,
        phase_name: 'Test Phase',
        start_date: new Date().toISOString(),
        end_date: new Date().toISOString(),
        toc_pahse_id: 1,
        is_active: true,
        created_by: 1,
        created_date: new Date(),
        last_updated_by: 1,
        last_updated_date: new Date(),
        cgspace_year: 2023,
        phase_year: 2023,
        status: true,
        previous_phase: null,
        app_module_id: null,
        reporting_phase: null,
        obj_reporting_phase: null,
        obj_app_module: null,
        obj_previous_phase: null,
      };

      const mockUpdateResult: UpdateResult = {
        affected: 1,
        raw: {},
        generatedMaps: [],
      };

      jest.spyOn(resultRepository, 'findOne').mockResolvedValue(mockResult);
      jest
        .spyOn(mockVersioningService, '$_findActivePhase')
        .mockResolvedValue(mockVersion);
      jest.spyOn(evidenceRepository, 'getMaterials').mockResolvedValue([]);
      jest.spyOn(evidenceRepository, 'save').mockResolvedValue({
        ...mockEvidenceSaveResponse,
        result_id: resultId,
        created_by: user.id,
      });
      jest
        .spyOn(resultInnovationPackageRepository, 'update')
        .mockResolvedValue(mockUpdateResult);
      jest
        .spyOn(mockResultByInitiativesRepository, 'findOne')
        .mockResolvedValue({ id: 1 });
      jest
        .spyOn(mockResultInitiativeBudgetRepository, 'findOne')
        .mockResolvedValue(null);
      jest
        .spyOn(mockResultInitiativeBudgetRepository, 'create')
        .mockReturnValue({ result_initiative_id: 1 });
      jest
        .spyOn(mockResultInitiativeBudgetRepository, 'save')
        .mockResolvedValue({ id: 1 });
      jest
        .spyOn(mockNonPooledProjectRepository, 'findOne')
        .mockResolvedValue({ id: 1 });
      jest
        .spyOn(mockNonPooledProjectBudgetRepository, 'findOne')
        .mockResolvedValue(null);
      jest
        .spyOn(mockNonPooledProjectBudgetRepository, 'save')
        .mockResolvedValue({ id: 1 });
      jest
        .spyOn(mockResultByIntitutionsRepository, 'findOne')
        .mockResolvedValue({ id: 1 });
      jest
        .spyOn(mockResultInstitutionsBudgetRepository, 'findOne')
        .mockResolvedValue(null);
      jest
        .spyOn(mockResultInstitutionsBudgetRepository, 'save')
        .mockResolvedValue({ id: 1 });

      const result = await service.saveMain(resultId, user, saveStepFourDto);

      expect(result.status).toBe(HttpStatus.OK);
      expect(result.response).toEqual(
        expect.objectContaining({
          materials: expect.any(Object),
          initiativeInvestment: expect.any(Object),
          billateralInvestment: expect.any(Object),
          partnertInvestment: expect.any(Object),
          investment: expect.any(Object),
        }),
      );
    });

    it('should throw error if result not found', async () => {
      jest.spyOn(resultRepository, 'findOne').mockResolvedValue(null);

      const emptyDto: SaveStepFour = {
        initiative_unit_time_id: null,
        initiative_expected_time: null,
        bilateral_unit_time_id: null,
        bilateral_expected_time: null,
        partner_unit_time_id: null,
        partner_expected_time: null,
        ipsr_pictures: [],
        ipsr_materials: [],
        initiative_expected_investment: [],
        bilateral_expected_investment: [],
        institutions_expected_investment: [],
      };

      const mockUser: TokenDto = {
        id: 1,
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
      };

      const result = await service.saveMain(1, mockUser, emptyDto);
      expect(result).toBe(undefined);
    });
  });

  describe('saveMaterials', () => {
    it('should save materials successfully', async () => {
      const resultId = 1;
      const user: TokenDto = {
        id: 1,
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
      };
      const saveStepFourDto: SaveStepFour = {
        ipsr_materials: [{ link: 'http://example.com' }],
        initiative_unit_time_id: null,
        initiative_expected_time: null,
        bilateral_unit_time_id: null,
        bilateral_expected_time: null,
        partner_unit_time_id: null,
        partner_expected_time: null,
        ipsr_pictures: [],
        initiative_expected_investment: [],
        bilateral_expected_investment: [],
        institutions_expected_investment: [],
      };

      jest.spyOn(evidenceRepository, 'getMaterials').mockResolvedValue([]);
      jest.spyOn(evidenceRepository, 'save').mockResolvedValue({
        ...mockEvidenceSaveResponse,
        result_id: resultId,
        created_by: user.id,
      });

      const result = await service.saveMaterials(
        resultId,
        user,
        saveStepFourDto,
      );

      expect(result.saveMaterial).toHaveLength(1);
      expect(evidenceRepository.save).toHaveBeenCalled();
    });

    it('should return error for invalid material link', async () => {
      const saveStepFourDto: SaveStepFour = {
        ipsr_materials: [{ link: '' }],
        initiative_unit_time_id: null,
        initiative_expected_time: null,
        bilateral_unit_time_id: null,
        bilateral_expected_time: null,
        partner_unit_time_id: null,
        partner_expected_time: null,
        ipsr_pictures: [],
        initiative_expected_investment: [],
        bilateral_expected_investment: [],
        institutions_expected_investment: [],
      };

      const mockUser: TokenDto = {
        id: 1,
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
      };

      const result = await service.saveMaterials(1, mockUser, saveStepFourDto);

      expect(result.status).toBe(HttpStatus.NOT_ACCEPTABLE);
      expect(result.message).toBe('Please provide a link');
    });
  });

  describe('savePartners', () => {
    it('should save partners successfully', async () => {
      const resultId = 1;
      const user: TokenDto = {
        id: 1,
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
      };
      const crtr: InstitutionsInterface = {
        institutions_id: 1,
        deliveries: [1],
      };
      const mockVersion = { id: 1 };
      const mockInstitution = { id: 1, institution_roles_id: 7 };

      jest
        .spyOn(mockVersioningService, '$_findActivePhase')
        .mockResolvedValue(mockVersion);
      jest
        .spyOn(mockResultByIntitutionsRepository, 'findOne')
        .mockResolvedValue(null);
      jest
        .spyOn(mockResultByIntitutionsRepository, 'save')
        .mockResolvedValue(mockInstitution);
      jest
        .spyOn(mockResultInstitutionsBudgetRepository, 'save')
        .mockResolvedValue({ id: 1 });
      jest
        .spyOn(mockResultByIntitutionsRepository, 'find')
        .mockResolvedValue([mockInstitution]);
      jest
        .spyOn(mockResultInstitutionsBudgetRepository, 'findOne')
        .mockResolvedValue({ result_institution_id: 1 });
      jest
        .spyOn(
          mockResultByInstitutionsByDeliveriesTypeRepository,
          'inactiveResultDeLivery',
        )
        .mockResolvedValue(null);
      jest
        .spyOn(
          mockResultByInstitutionsByDeliveriesTypeRepository,
          'getDeliveryByTypeAndResultByInstitution',
        )
        .mockResolvedValue(null);
      jest
        .spyOn(mockResultByInstitutionsByDeliveriesTypeRepository, 'save')
        .mockResolvedValue({ id: 1 });

      const result = await service.savePartners(resultId, user, crtr);

      expect(result.status).toBe(HttpStatus.OK);
      expect(result.response).toEqual(expect.any(Object));
    });

    it('should return error if institution already exists', async () => {
      const crtr: InstitutionsInterface = {
        institutions_id: 1,
        deliveries: [],
      };
      const mockVersion = { id: 1 };
      const mockUser: TokenDto = {
        id: 1,
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
      };

      jest
        .spyOn(mockVersioningService, '$_findActivePhase')
        .mockResolvedValue(mockVersion);
      jest
        .spyOn(mockResultByIntitutionsRepository, 'findOne')
        .mockResolvedValue({ id: 1 });

      const result = await service.savePartners(1, mockUser, crtr);

      expect(result.status).toBe(HttpStatus.NOT_ACCEPTABLE);
      expect(result.message).toBe('The institution already exists');
    });
  });
});
