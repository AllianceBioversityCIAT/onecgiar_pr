import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SummaryService } from './summary.service';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultsCapacityDevelopmentsRepository } from './repositories/results-capacity-developments.repository';
import { ResultByIntitutionsRepository } from '../results_by_institutions/result_by_intitutions.repository';
import { ResultsInnovationsDevRepository } from './repositories/results-innovations-dev.repository';
import { ResultsPolicyChangesRepository } from './repositories/results-policy-changes.repository';
import { ResultRepository } from '../result.repository';
import { VersionsService } from '../versions/versions.service';
import { EvidencesRepository } from '../evidences/evidences.repository';
import { ResultActorRepository } from '../result-actors/repositories/result-actors.repository';
import { ResultByIntitutionsTypeRepository } from '../results_by_institution_types/result_by_intitutions_type.repository';
import { ResultIpMeasureRepository } from '../../ipsr/result-ip-measures/result-ip-measures.repository';
import { ResultInitiativeBudgetRepository } from '../result_budget/repositories/result_initiative_budget.repository';
import { ResultByInitiativesRepository } from '../results_by_inititiatives/resultByInitiatives.repository';
import { NonPooledProjectBudgetRepository } from '../result_budget/repositories/non_pooled_proyect_budget.repository';
import { NonPooledProjectRepository } from '../non-pooled-projects/non-pooled-projects.repository';
import { ResultInstitutionsBudgetRepository } from '../result_budget/repositories/result_institutions_budget.repository';
import { InnoDevService } from './innovation_dev.service';
import { ResultAnswerRepository } from '../result-questions/repository/result-answers.repository';
import { ResultsInnovationsUseRepository } from './repositories/results-innovations-use.repository';
import { ResultsByProjectsRepository } from '../results_by_projects/results_by_projects.repository';

describe('SummaryService', () => {
  let service: SummaryService;

  let mockResultsCapacityDevelopmentsRepository: any;
  let mockResultByIntitutionsRepository: any;
  let mockResultsInnovationsDevRepository: any;
  let mockResultsPolicyChangesRepository: any;
  let mockResultRepository: any;
  let mockVersionsService: any;
  let mockEvidencesRepository: any;
  let mockResultActorRepository: any;
  let mockResultByIntitutionsTypeRepository: any;
  let mockResultIpMeasureRepository: any;
  let mockResultInitiativesBudgetRepository: any;
  let mockResultByInitiativeRepository: any;
  let mockResultBilateralBudgetRepository: any;
  let mockNonPooledProjectRepository: any;
  let mockResultInstitutionsBudgetRepository: any;
  let mockInnoDevService: any;
  let mockResultAnswerRepository: any;
  let mockDataSource: any;
  let mockScalingStudyUrlRepository: any;
  let mockResultsInnovationsUseRepository: any;
  let mockResultsByProjectsRepository: any;

  const user = { id: 10 } as any;

  beforeEach(async () => {
    mockResultsCapacityDevelopmentsRepository = {
      capDevExists: jest.fn(),
      save: jest.fn(),
    };
    mockResultByIntitutionsRepository = {
      updateGenericIstitutions: jest.fn(),
      getGenericResultByInstitutionExists: jest.fn(),
      save: jest.fn(),
      getGenericAllResultByInstitutionByRole: jest.fn(),
      find: jest.fn(),
    };
    mockResultsInnovationsDevRepository = {
      InnovationDevExists: jest.fn(),
      save: jest.fn(),
    };
    mockResultsPolicyChangesRepository = {
      ResultsPolicyChangesExists: jest.fn(),
      save: jest.fn(),
    };
    mockResultRepository = {
      findOne: jest.fn(),
      getResultById: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
    };
    mockVersionsService = {};
    mockEvidencesRepository = {
      find: jest.fn(),
    };
    mockResultActorRepository = {
      find: jest.fn(),
    };
    mockResultByIntitutionsTypeRepository = {
      find: jest.fn(),
    };
    mockResultIpMeasureRepository = {
      find: jest.fn(),
    };
    mockResultInitiativesBudgetRepository = {
      find: jest.fn(),
    };
    mockResultByInitiativeRepository = {
      find: jest.fn(),
    };
    mockResultBilateralBudgetRepository = {
      find: jest.fn(),
    };
    mockNonPooledProjectRepository = {
      find: jest.fn(),
    };
    mockResultInstitutionsBudgetRepository = {
      find: jest.fn(),
    };
    mockInnoDevService = {
      saveAnticipatedInnoUser: jest.fn(),
      saveOptionsAndSubOptions: jest.fn(),
      saveEvidence: jest.fn(),
      saveInitiativeInvestment: jest.fn(),
      saveBillateralInvestment: jest.fn(),
      savePartnerInvestment: jest.fn(),
    };
    mockResultAnswerRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };
    mockScalingStudyUrlRepository = {
      find: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
      save: jest.fn(),
    };
    mockDataSource = {
      getRepository: jest.fn().mockReturnValue(mockScalingStudyUrlRepository),
    };
    mockResultsInnovationsUseRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      getLinkedResultsByOrigin: jest.fn().mockResolvedValue([]),
      replaceLinkedResultsByOrigin: jest.fn().mockResolvedValue([]),
    };
    mockResultsByProjectsRepository = {
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SummaryService,
        HandlersError,
        {
          provide: ResultsCapacityDevelopmentsRepository,
          useValue: mockResultsCapacityDevelopmentsRepository,
        },
        {
          provide: ResultByIntitutionsRepository,
          useValue: mockResultByIntitutionsRepository,
        },
        {
          provide: ResultsInnovationsDevRepository,
          useValue: mockResultsInnovationsDevRepository,
        },
        {
          provide: ResultsPolicyChangesRepository,
          useValue: mockResultsPolicyChangesRepository,
        },
        {
          provide: ResultRepository,
          useValue: mockResultRepository,
        },
        { provide: VersionsService, useValue: mockVersionsService },
        { provide: EvidencesRepository, useValue: mockEvidencesRepository },
        { provide: ResultActorRepository, useValue: mockResultActorRepository },
        {
          provide: ResultByIntitutionsTypeRepository,
          useValue: mockResultByIntitutionsTypeRepository,
        },
        {
          provide: ResultIpMeasureRepository,
          useValue: mockResultIpMeasureRepository,
        },
        {
          provide: ResultInitiativeBudgetRepository,
          useValue: mockResultInitiativesBudgetRepository,
        },
        {
          provide: ResultByInitiativesRepository,
          useValue: mockResultByInitiativeRepository,
        },
        {
          provide: NonPooledProjectBudgetRepository,
          useValue: mockResultBilateralBudgetRepository,
        },
        {
          provide: NonPooledProjectRepository,
          useValue: mockNonPooledProjectRepository,
        },
        {
          provide: ResultInstitutionsBudgetRepository,
          useValue: mockResultInstitutionsBudgetRepository,
        },
        { provide: InnoDevService, useValue: mockInnoDevService },
        {
          provide: ResultAnswerRepository,
          useValue: mockResultAnswerRepository,
        },
        { provide: DataSource, useValue: mockDataSource },
        {
          provide: ResultsInnovationsUseRepository,
          useValue: mockResultsInnovationsUseRepository,
        },
        {
          provide: ResultsByProjectsRepository,
          useValue: mockResultsByProjectsRepository,
        },
      ],
    }).compile();

    service = module.get(SummaryService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('saveInnovationUse', () => {
    it('creates innovation use and returns created response', async () => {
      const dto = { field: 'value' } as any;
      mockResultRepository.findOne.mockResolvedValueOnce({ id: 5 });
      mockInnoDevService.saveAnticipatedInnoUser.mockResolvedValueOnce({
        id: 9,
      });
      mockResultsInnovationsUseRepository.findOne.mockResolvedValueOnce(null);

      const res = await service.saveInnovationUse(dto, 5, user);

      expect(mockResultRepository.findOne).toHaveBeenCalledWith({
        where: { id: 5 },
      });
      expect(mockInnoDevService.saveAnticipatedInnoUser).toHaveBeenCalledWith(
        5,
        user.id,
        dto,
      );
      expect(res.status).toBe(HttpStatus.CREATED);
      expect(res.response).toEqual({ id: 9 });
    });

    it('creates a new results_innovations_use row with the level and to-be-determined flag when none exists', async () => {
      const dto = {
        innov_use_to_be_determined: false,
        innovation_use_level_id: 4,
      } as any;
      mockResultRepository.findOne.mockResolvedValueOnce({ id: 5 });
      mockInnoDevService.saveAnticipatedInnoUser.mockResolvedValueOnce({});
      mockResultsInnovationsUseRepository.findOne.mockResolvedValueOnce(null);

      await service.saveInnovationUse(dto, 5, user);

      expect(mockResultsInnovationsUseRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          results_id: 5,
          created_by: user.id,
          is_active: true,
          innov_use_to_be_determined: false,
          innovation_use_level_id: 4,
        }),
      );
    });

    it('updates the existing results_innovations_use row in place', async () => {
      const dto = {
        innov_use_to_be_determined: true,
        innovation_use_level_id: 7,
      } as any;
      mockResultRepository.findOne.mockResolvedValueOnce({ id: 5 });
      mockInnoDevService.saveAnticipatedInnoUser.mockResolvedValueOnce({});
      const existing = { result_innovation_use_id: 1, results_id: 5 } as any;
      mockResultsInnovationsUseRepository.findOne.mockResolvedValueOnce(
        existing,
      );

      await service.saveInnovationUse(dto, 5, user);

      expect(mockResultsInnovationsUseRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          result_innovation_use_id: 1,
          innov_use_to_be_determined: true,
          innovation_use_level_id: 7,
          last_updated_by: user.id,
        }),
      );
    });

    it('nulls the level and to-be-determined flag when the DTO omits them', async () => {
      const dto = {} as any;
      mockResultRepository.findOne.mockResolvedValueOnce({ id: 5 });
      mockInnoDevService.saveAnticipatedInnoUser.mockResolvedValueOnce({});
      mockResultsInnovationsUseRepository.findOne.mockResolvedValueOnce(null);

      await service.saveInnovationUse(dto, 5, user);

      expect(mockResultsInnovationsUseRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          innov_use_to_be_determined: null,
          innovation_use_level_id: null,
        }),
      );
    });

    // P2-3359. `results_innovations_use.results_id` is the join column of a OneToOne,
    // so it carries a UNIQUE constraint: an inactive row still owns the result's slot.
    // Looking it up with `is_active: true` missed that row, drove us into the insert
    // branch, and the insert died on ER_DUP_ENTRY — swallowed by `returnErrorRes`, so
    // the user's answer silently disappeared on reload.
    describe('an inactive row still owns the unique slot (P2-3359)', () => {
      it('looks the row up without filtering on is_active', async () => {
        mockResultRepository.findOne.mockResolvedValueOnce({ id: 5 });
        mockInnoDevService.saveAnticipatedInnoUser.mockResolvedValueOnce({});
        mockResultsInnovationsUseRepository.findOne.mockResolvedValueOnce(null);

        await service.saveInnovationUse({} as any, 5, user);

        expect(
          mockResultsInnovationsUseRepository.findOne,
        ).toHaveBeenCalledWith({ where: { results_id: 5 } });
      });

      it('reactivates and updates an inactive row instead of inserting a duplicate', async () => {
        const dto = {
          innov_use_to_be_determined: false,
          innovation_use_level_id: 3,
        } as any;
        mockResultRepository.findOne.mockResolvedValueOnce({ id: 5 });
        mockInnoDevService.saveAnticipatedInnoUser.mockResolvedValueOnce({});
        mockResultsInnovationsUseRepository.findOne.mockResolvedValueOnce({
          result_innovation_use_id: 1,
          results_id: 5,
          is_active: false,
        } as any);

        await service.saveInnovationUse(dto, 5, user);

        expect(mockResultsInnovationsUseRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            result_innovation_use_id: 1,
            is_active: true,
            innov_use_to_be_determined: false,
            innovation_use_level_id: 3,
          }),
        );
        expect(mockResultsInnovationsUseRepository.save).toHaveBeenCalledTimes(
          1,
        );
      });

      it('recovers by updating when a concurrent insert wins the slot', async () => {
        const dto = {
          innov_use_to_be_determined: true,
          innovation_use_level_id: 6,
        } as any;
        mockResultRepository.findOne.mockResolvedValueOnce({ id: 5 });
        mockInnoDevService.saveAnticipatedInnoUser.mockResolvedValueOnce({});
        mockResultsInnovationsUseRepository.findOne
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({
            result_innovation_use_id: 2,
            results_id: 5,
          } as any);
        mockResultsInnovationsUseRepository.save
          .mockRejectedValueOnce({ driverError: { code: 'ER_DUP_ENTRY' } })
          .mockResolvedValueOnce({} as any);

        const res = await service.saveInnovationUse(dto, 5, user);

        expect(res.status).toBe(HttpStatus.CREATED);
        expect(
          mockResultsInnovationsUseRepository.save,
        ).toHaveBeenLastCalledWith(
          expect.objectContaining({
            result_innovation_use_id: 2,
            is_active: true,
            innov_use_to_be_determined: true,
            innovation_use_level_id: 6,
          }),
        );
      });
    });

    // P2-3424 — these keys were already being POSTed by both Innovation Use forms and silently dropped
    // (no DTO entry, no ValidationPipe on the controller). They all had storage waiting for them.
    describe('fields that were being discarded (P2-3424)', () => {
      const arrange = (existing: any = null) => {
        mockResultRepository.findOne.mockResolvedValueOnce({ id: 5 });
        mockInnoDevService.saveAnticipatedInnoUser.mockResolvedValueOnce({});
        mockResultsInnovationsUseRepository.findOne.mockResolvedValueOnce(
          existing,
        );
        mockResultsInnovationsUseRepository.save.mockResolvedValueOnce(
          existing ?? { result_innovation_use_id: 11, results_id: 5 },
        );
      };

      it('persists the columns that exist on results_innovations_use', async () => {
        arrange();

        await service.saveInnovationUse(
          {
            has_scaling_studies: true,
            innov_use_2030_to_be_determined: false,
            readiness_level_explanation: 'Because the evidence says so.',
            has_innovation_link: true,
            linked_results: [77],
          } as any,
          5,
          user,
        );

        expect(mockResultsInnovationsUseRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            has_scaling_studies: true,
            innov_use_2030_to_be_determined: false,
            readiness_level_explanation: 'Because the evidence says so.',
            has_innovation_link: true,
          }),
        );
      });

      // The legacy W1/W2 caller does not send every key. An absent key must leave the stored value alone.
      it('leaves a field untouched when the payload does not carry its key', async () => {
        const existing = {
          result_innovation_use_id: 1,
          results_id: 5,
          has_scaling_studies: true,
          readiness_level_explanation: 'kept',
        } as any;
        arrange(existing);

        await service.saveInnovationUse({} as any, 5, user);

        expect(mockResultsInnovationsUseRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            has_scaling_studies: true,
            readiness_level_explanation: 'kept',
          }),
        );
      });

      it('replaces the study links, keyed by the innovation-use row', async () => {
        arrange();

        await service.saveInnovationUse(
          {
            has_scaling_studies: true,
            scaling_studies_urls: ['https://example.org/study', '  ', ''],
          } as any,
          5,
          user,
        );

        expect(mockScalingStudyUrlRepository.update).toHaveBeenCalledWith(
          { result_innov_use_id: 11 },
          expect.objectContaining({ is_active: false }),
        );
        expect(mockScalingStudyUrlRepository.save).toHaveBeenCalledWith([
          expect.objectContaining({
            result_innov_use_id: 11,
            study_url: 'https://example.org/study',
            is_active: true,
          }),
        ]);
      });

      it('does not wipe the study links when the payload says nothing about them', async () => {
        arrange();

        await service.saveInnovationUse(
          { innovation_use_level_id: 4 } as any,
          5,
          user,
        );

        expect(mockScalingStudyUrlRepository.update).not.toHaveBeenCalled();
        expect(mockScalingStudyUrlRepository.save).not.toHaveBeenCalled();
      });

      it('stores the selection when the innovation-link question is answered Yes', async () => {
        arrange();

        await service.saveInnovationUse(
          { has_innovation_link: true, linked_results: [77] } as any,
          5,
          user,
        );

        expect(
          mockResultsInnovationsUseRepository.replaceLinkedResultsByOrigin,
        ).toHaveBeenCalledWith(5, [77], user.id);
      });

      it('clears the links when a stored Yes is retracted to No', async () => {
        arrange({
          result_innovation_use_id: 1,
          results_id: 5,
          has_innovation_link: 1,
        } as any);

        await service.saveInnovationUse(
          { has_innovation_link: false, linked_results: [] } as any,
          5,
          user,
        );

        expect(
          mockResultsInnovationsUseRepository.replaceLinkedResultsByOrigin,
        ).toHaveBeenCalledWith(5, [], user.id);
      });

      // `linked_result` is shared with the P22 "Links to results" section: a No that was never a Yes
      // must not touch it, or that section's data disappears on the first autosave here.
      it('never touches linked_result when the question was never answered Yes', async () => {
        arrange({
          result_innovation_use_id: 1,
          results_id: 5,
          has_innovation_link: null,
        } as any);

        await service.saveInnovationUse(
          { has_innovation_link: false, linked_results: [] } as any,
          5,
          user,
        );

        expect(
          mockResultsInnovationsUseRepository.replaceLinkedResultsByOrigin,
        ).not.toHaveBeenCalled();
      });

      it('never touches linked_result when the payload omits the question', async () => {
        arrange();

        await service.saveInnovationUse(
          { linked_results: [77] } as any,
          5,
          user,
        );

        expect(
          mockResultsInnovationsUseRepository.replaceLinkedResultsByOrigin,
        ).not.toHaveBeenCalled();
      });
    });
  });

  describe('getInnovationUse', () => {
    it('returns actors with calculated totals and organizations parent id', async () => {
      mockResultActorRepository.find.mockResolvedValueOnce([
        { men: 10, men_youth: 3, women: 8, women_youth: 2 },
      ]);
      mockResultIpMeasureRepository.find.mockResolvedValueOnce([{ id: 1 }]);
      mockResultByIntitutionsTypeRepository.find.mockResolvedValueOnce([
        {
          obj_institution_types: {
            obj_parent: { obj_parent: { code: 99 }, code: 77 },
          },
        },
      ]);
      mockResultsInnovationsUseRepository.findOne.mockResolvedValueOnce(null);

      const res = await service.getInnovationUse(15);
      const response: any = res.response as any;

      expect(mockResultActorRepository.find).toHaveBeenCalled();
      expect(res.status).toBe(HttpStatus.OK);
      expect(response.actors[0]).toMatchObject({
        men_non_youth: 7,
        women_non_youth: 6,
      });
      expect(response.organization[0].parent_institution_type_id).toBe(99);
    });

    it('includes the persisted to-be-determined flag and use level when a row exists', async () => {
      mockResultActorRepository.find.mockResolvedValueOnce([]);
      mockResultIpMeasureRepository.find.mockResolvedValueOnce([]);
      mockResultByIntitutionsTypeRepository.find.mockResolvedValueOnce([]);
      mockResultsInnovationsUseRepository.findOne.mockResolvedValueOnce({
        innov_use_to_be_determined: true,
        innovation_use_level_id: 6,
      });

      const res = await service.getInnovationUse(15);
      const response: any = res.response as any;

      expect(response.innov_use_to_be_determined).toBe(true);
      expect(response.innovation_use_level_id).toBe(6);
    });

    it('defaults to null when no results_innovations_use row exists yet', async () => {
      mockResultActorRepository.find.mockResolvedValueOnce([]);
      mockResultIpMeasureRepository.find.mockResolvedValueOnce([]);
      mockResultByIntitutionsTypeRepository.find.mockResolvedValueOnce([]);
      mockResultsInnovationsUseRepository.findOne.mockResolvedValueOnce(null);

      const res = await service.getInnovationUse(15);
      const response: any = res.response as any;

      expect(response.innov_use_to_be_determined).toBeNull();
      expect(response.innovation_use_level_id).toBeNull();
    });

    // P2-3424 — additive: the keys that were already in the response keep their exact shape.
    it('returns the fields the endpoint now persists', async () => {
      mockResultActorRepository.find.mockResolvedValueOnce([]);
      mockResultIpMeasureRepository.find.mockResolvedValueOnce([]);
      mockResultByIntitutionsTypeRepository.find.mockResolvedValueOnce([]);
      mockResultsInnovationsUseRepository.findOne.mockResolvedValueOnce({
        result_innovation_use_id: 11,
        has_scaling_studies: 1,
        innov_use_2030_to_be_determined: 0,
        readiness_level_explanation: 'Because the evidence says so.',
        has_innovation_link: 1,
      });
      mockScalingStudyUrlRepository.find.mockResolvedValueOnce([
        { study_url: 'https://example.org/study' },
      ]);
      mockResultsInnovationsUseRepository.getLinkedResultsByOrigin.mockResolvedValueOnce(
        [77],
      );

      const res = await service.getInnovationUse(15);
      const response: any = res.response as any;

      expect(response.has_scaling_studies).toBe(1);
      expect(response.scaling_studies_urls).toEqual([
        'https://example.org/study',
      ]);
      expect(response.innov_use_2030_to_be_determined).toBe(0);
      expect(response.readiness_level_explanation).toBe(
        'Because the evidence says so.',
      );
      expect(response.has_innovation_link).toBe(1);
      expect(response.linked_results).toEqual([77]);
    });

    it('answers with empty study links when no innovation-use row exists yet', async () => {
      mockResultActorRepository.find.mockResolvedValueOnce([]);
      mockResultIpMeasureRepository.find.mockResolvedValueOnce([]);
      mockResultByIntitutionsTypeRepository.find.mockResolvedValueOnce([]);
      mockResultsInnovationsUseRepository.findOne.mockResolvedValueOnce(null);

      const res = await service.getInnovationUse(15);
      const response: any = res.response as any;

      expect(response.scaling_studies_urls).toEqual([]);
      expect(mockScalingStudyUrlRepository.find).not.toHaveBeenCalled();
    });
  });

  describe('saveCapacityDevelopents', () => {
    it('creates capacity development entry and institutions when not existing', async () => {
      const dto = {
        female_using: 1,
        male_using: 2,
        has_unkown_using: 0,
        non_binary_using: 0,
        capdev_delivery_method_id: 4,
        capdev_term_id: 3,
        institutions: [{ institutions_id: 55 }],
        is_attending_for_organization: true,
      } as any;

      mockResultsCapacityDevelopmentsRepository.capDevExists.mockResolvedValueOnce(
        null,
      );
      mockResultsCapacityDevelopmentsRepository.save.mockImplementation(
        async (payload) => ({ id: 100, ...payload }),
      );
      mockResultByIntitutionsRepository.getGenericResultByInstitutionExists.mockResolvedValueOnce(
        null,
      );
      mockResultByIntitutionsRepository.save.mockResolvedValueOnce([]);

      const res = await service.saveCapacityDevelopents(dto, 77, user);

      expect(mockResultsCapacityDevelopmentsRepository.save).toHaveBeenCalled();
      expect(
        mockResultByIntitutionsRepository.updateGenericIstitutions,
      ).toHaveBeenCalledWith(77, dto.institutions, 3, user.id);
      expect(mockResultByIntitutionsRepository.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            institution_roles_id: 3,
            institutions_id: 55,
            result_id: 77,
            created_by: user.id,
            last_updated_by: user.id,
          }),
        ]),
      );
      expect(res.status).toBe(HttpStatus.CREATED);
    });
  });

  describe('getCapacityDevelopents', () => {
    it('returns default response when no capacity development found', async () => {
      mockResultsCapacityDevelopmentsRepository.capDevExists.mockResolvedValueOnce(
        undefined,
      );
      mockResultByIntitutionsRepository.getGenericAllResultByInstitutionByRole.mockResolvedValueOnce(
        [],
      );

      const res = await service.getCapacityDevelopents(30);
      const response: any = res.response as any;

      expect(res.status).toBe(HttpStatus.OK);
      expect(response.result_id).toBe(30);
      expect(response.male_using).toBeNull();
      expect(response.institutions).toEqual([]);
    });
  });

  describe('saveInnovationDev', () => {
    it('creates innovation-dev with result_object (not RelationId results_id alone)', async () => {
      const dto = {
        short_title: '',
        responsible_innovation_and_scaling: {
          q1: { options: [] },
          q2: { options: [] },
        },
        intellectual_property_rights: {
          q1: { options: [] },
          q2: { options: [] },
          q3: { options: [] },
        },
        innovation_team_diversity: { options: [] },
        megatrends: { options: [] },
        reference_materials: [],
      } as any;

      mockResultsInnovationsDevRepository.InnovationDevExists.mockResolvedValueOnce(
        null,
      );
      mockResultsInnovationsDevRepository.save.mockImplementation(
        async (payload) => ({ result_innovation_dev_id: 1, ...payload }),
      );

      const res = await service.saveInnovationDev(dto, {} as any, 11144, user);

      expect(mockResultsInnovationsDevRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          results_id: 11144,
          result_object: { id: 11144 },
          created_by: user.id,
          is_active: true,
        }),
      );
      expect(res.status).toBe(HttpStatus.CREATED);
    });

    it('accepts bilateral partial DTO without questionnaire blocks (no q1 crash)', async () => {
      const dto = {
        short_title: 'Partial title',
        innovation_developers: 'Devs',
        innovation_collaborators: '',
        evidences_justification: '',
      } as any;

      mockResultsInnovationsDevRepository.InnovationDevExists.mockResolvedValueOnce(
        null,
      );
      mockResultsInnovationsDevRepository.save.mockImplementation(
        async (payload) => ({ result_innovation_dev_id: 2, ...payload }),
      );

      const res = await service.saveInnovationDev(dto, dto, 11144, user);

      expect(res.status).toBe(HttpStatus.CREATED);
      expect(
        mockInnoDevService.saveOptionsAndSubOptions,
      ).not.toHaveBeenCalled();
      expect(mockInnoDevService.saveEvidence).not.toHaveBeenCalled();
      expect(
        mockInnoDevService.saveInitiativeInvestment,
      ).not.toHaveBeenCalled();
    });

    it('still runs questionnaire saves when Result Review full DTO is present', async () => {
      const option = { result_question_id: 1, answer_boolean: true };
      const dto = {
        short_title: 'Full',
        responsible_innovation_and_scaling: {
          q1: { options: [option] },
          q2: { options: [option] },
        },
        intellectual_property_rights: {
          q1: { options: [option] },
          q2: { options: [option] },
          q3: { options: [option] },
        },
        innovation_team_diversity: { options: [option] },
        megatrends: { options: [option] },
        reference_materials: [{ link: 'https://example.com' }],
        initiative_expected_investment: [],
        bilateral_expected_investment: [],
        institutions_expected_investment: [],
      } as any;

      mockResultsInnovationsDevRepository.InnovationDevExists.mockResolvedValueOnce(
        { result_innovation_dev_id: 9 },
      );
      mockResultsInnovationsDevRepository.save.mockResolvedValueOnce({
        result_innovation_dev_id: 9,
      });

      const res = await service.saveInnovationDev(
        dto,
        { innovatonUse: {} } as any,
        55,
        user,
      );

      expect(res.status).toBe(HttpStatus.CREATED);
      expect(mockInnoDevService.saveOptionsAndSubOptions).toHaveBeenCalledTimes(
        7,
      );
      expect(mockInnoDevService.saveEvidence).toHaveBeenCalledWith(
        55,
        user.id,
        dto.reference_materials,
        4,
      );
      expect(mockInnoDevService.saveAnticipatedInnoUser).toHaveBeenCalled();
    });

    it('does not force null result_innovation_dev_id on create (AUTO_INCREMENT)', async () => {
      const dto = {
        short_title: 'Title',
        innovation_readiness_level_id: 17,
        result_innovation_dev_id: null,
      } as any;

      mockResultsInnovationsDevRepository.InnovationDevExists.mockResolvedValueOnce(
        null,
      );
      mockResultsInnovationsDevRepository.save.mockImplementation(
        async (payload) => payload,
      );

      await service.saveInnovationDev(dto, null, 11145, user);

      expect(mockResultsInnovationsDevRepository.save).toHaveBeenCalledWith(
        expect.not.objectContaining({
          result_innovation_dev_id: null,
        }),
      );
      const saved = mockResultsInnovationsDevRepository.save.mock.calls[0][0];
      expect(saved.result_innovation_dev_id).toBeUndefined();
      expect(saved.results_id).toBe(11145);
    });

    it('persists nature/readiness via relation objects (not RelationId scalars)', async () => {
      const dto = {
        short_title: 'Title',
        innovation_nature_id: 12,
        innovation_readiness_level_id: 3,
        innovation_developers: 'Dev',
      } as any;

      mockResultsInnovationsDevRepository.InnovationDevExists.mockResolvedValueOnce(
        null,
      );
      mockResultsInnovationsDevRepository.save.mockImplementation(
        async (payload) => payload,
      );

      await service.saveInnovationDev(dto, null, 11144, user);

      expect(mockResultsInnovationsDevRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          results_id: 11144,
          innovation_nature: { code: 12 },
          innovation_readiness_level: { id: 3 },
          innovation_developers: 'Dev',
        }),
      );
    });

    it('persists has_scaling_studies and replaces the scaling study URLs once readiness reaches level 6', async () => {
      const dto = {
        short_title: 'Title',
        innovation_readiness_level_id: 17, // Level_6
        has_scaling_studies: true,
        scaling_studies_urls: [
          'https://example.com/study-a',
          'https://example.com/study-b',
        ],
      } as any;

      mockResultsInnovationsDevRepository.InnovationDevExists.mockResolvedValueOnce(
        null,
      );
      mockResultsInnovationsDevRepository.save.mockResolvedValueOnce({
        result_innovation_dev_id: 42,
      });

      await service.saveInnovationDev(dto, null, 11144, user);

      expect(mockResultsInnovationsDevRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ has_scaling_studies: true }),
      );
      expect(mockDataSource.getRepository).toHaveBeenCalled();
      expect(mockScalingStudyUrlRepository.update).toHaveBeenCalledWith(
        { result_innov_dev_id: 42 },
        { is_active: false },
      );
      expect(mockScalingStudyUrlRepository.save).toHaveBeenCalledWith([
        {
          result_innov_dev_id: 42,
          study_url: 'https://example.com/study-a',
          is_active: true,
          created_by: user.id,
        },
        {
          result_innov_dev_id: 42,
          study_url: 'https://example.com/study-b',
          is_active: true,
          created_by: user.id,
        },
      ]);
    });

    it('does not touch scaling study URLs when has_scaling_studies is false, even with URLs present', async () => {
      const dto = {
        short_title: 'Title',
        innovation_readiness_level_id: 17,
        has_scaling_studies: false,
        scaling_studies_urls: ['https://example.com/study-a'],
      } as any;

      mockResultsInnovationsDevRepository.InnovationDevExists.mockResolvedValueOnce(
        null,
      );
      mockResultsInnovationsDevRepository.save.mockResolvedValueOnce({
        result_innovation_dev_id: 43,
      });

      await service.saveInnovationDev(dto, null, 11144, user);

      expect(mockScalingStudyUrlRepository.update).not.toHaveBeenCalled();
      expect(mockScalingStudyUrlRepository.save).not.toHaveBeenCalled();
    });

    it('does not touch scaling study URLs below readiness level 6', async () => {
      const dto = {
        short_title: 'Title',
        innovation_readiness_level_id: 16, // Level_5
        has_scaling_studies: true,
        scaling_studies_urls: ['https://example.com/study-a'],
      } as any;

      mockResultsInnovationsDevRepository.InnovationDevExists.mockResolvedValueOnce(
        null,
      );
      mockResultsInnovationsDevRepository.save.mockResolvedValueOnce({
        result_innovation_dev_id: 44,
      });

      await service.saveInnovationDev(dto, null, 11144, user);

      expect(mockScalingStudyUrlRepository.update).not.toHaveBeenCalled();
      expect(mockScalingStudyUrlRepository.save).not.toHaveBeenCalled();
    });

    it('does not touch scaling study URLs when the URL list is empty', async () => {
      const dto = {
        short_title: 'Title',
        innovation_readiness_level_id: 17,
        has_scaling_studies: true,
        scaling_studies_urls: [],
      } as any;

      mockResultsInnovationsDevRepository.InnovationDevExists.mockResolvedValueOnce(
        null,
      );
      mockResultsInnovationsDevRepository.save.mockResolvedValueOnce({
        result_innovation_dev_id: 45,
      });

      await service.saveInnovationDev(dto, null, 11144, user);

      expect(mockScalingStudyUrlRepository.update).not.toHaveBeenCalled();
      expect(mockScalingStudyUrlRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('getInnovationDev', () => {
    beforeEach(() => {
      mockEvidencesRepository.find.mockResolvedValue([]);
      mockResultRepository.getResultById = jest
        .fn()
        .mockResolvedValue({ id: 11144 });
      mockResultActorRepository.find.mockResolvedValue([]);
      mockResultIpMeasureRepository.find.mockResolvedValue([]);
      mockResultByIntitutionsTypeRepository.find.mockResolvedValue([]);
      mockResultByInitiativeRepository.find.mockResolvedValue([]);
      mockResultInitiativesBudgetRepository.find.mockResolvedValue([]);
      mockNonPooledProjectRepository.find.mockResolvedValue([]);
      mockResultBilateralBudgetRepository.find.mockResolvedValue([]);
      mockResultByIntitutionsRepository.find.mockResolvedValue([]);
      mockResultInstitutionsBudgetRepository.find.mockResolvedValue([]);
      mockResultsByProjectsRepository.find.mockResolvedValue([]);
    });

    it('merges legacy (non_pooled_projetct_id) and results_by_projects (result_project_id) budget rows', async () => {
      mockResultsInnovationsDevRepository.InnovationDevExists.mockResolvedValueOnce(
        {
          result_innovation_dev_id: 50,
          innovation_readiness_level_id: 10,
        },
      );
      mockNonPooledProjectRepository.find.mockResolvedValueOnce([{ id: 1 }]);
      mockResultsByProjectsRepository.find.mockResolvedValueOnce([{ id: 2 }]);
      mockResultBilateralBudgetRepository.find
        .mockResolvedValueOnce([{ non_pooled_projetct_id: 1, kind_cash: 100 }])
        .mockResolvedValueOnce([{ result_project_id: 2, kind_cash: 200 }]);

      const res = await service.getInnovationDev(11144);
      const response: any = res.response as any;

      expect(mockResultsByProjectsRepository.find).toHaveBeenCalledWith({
        where: { result_id: 11144, is_active: true },
      });
      expect(mockResultBilateralBudgetRepository.find).toHaveBeenCalledTimes(2);
      const [firstCallArgs] =
        mockResultBilateralBudgetRepository.find.mock.calls[0];
      const [secondCallArgs] =
        mockResultBilateralBudgetRepository.find.mock.calls[1];
      expect(firstCallArgs.where.non_pooled_projetct_id).toEqual(
        expect.anything(),
      );
      expect(firstCallArgs.relations).toEqual({
        obj_non_pooled_projetct: { obj_funder_institution_id: true },
      });
      expect(secondCallArgs.where.result_project_id).toEqual(expect.anything());
      expect(secondCallArgs.relations).toEqual({
        obj_result_project: { obj_clarisa_project: true },
      });
      expect(response.bilateral_expected_investment).toEqual([
        { non_pooled_projetct_id: 1, kind_cash: 100 },
        { result_project_id: 2, kind_cash: 200 },
      ]);
    });

    it('returns an empty bilateral investment array when neither link exists', async () => {
      mockResultsInnovationsDevRepository.InnovationDevExists.mockResolvedValueOnce(
        {
          result_innovation_dev_id: 51,
          innovation_readiness_level_id: 10,
        },
      );

      const res = await service.getInnovationDev(11144);
      const response: any = res.response as any;

      expect(response.bilateral_expected_investment).toEqual([]);
    });

    it('includes the scaling study URLs once readiness reaches level 6', async () => {
      mockResultsInnovationsDevRepository.InnovationDevExists.mockResolvedValueOnce(
        {
          result_innovation_dev_id: 42,
          innovation_readiness_level_id: 17,
          has_scaling_studies: true,
        },
      );
      mockScalingStudyUrlRepository.find.mockResolvedValueOnce([
        { study_url: 'https://example.com/study-a' },
      ]);

      const res = await service.getInnovationDev(11144);

      expect(mockScalingStudyUrlRepository.find).toHaveBeenCalledWith({
        where: { result_innov_dev_id: 42, is_active: true },
      });
      expect((res as any).response.scaling_studies_urls).toEqual([
        'https://example.com/study-a',
      ]);
    });

    it('returns an empty scaling_studies_urls array below readiness level 6, without querying the repository', async () => {
      mockResultsInnovationsDevRepository.InnovationDevExists.mockResolvedValueOnce(
        {
          result_innovation_dev_id: 43,
          innovation_readiness_level_id: 16,
          has_scaling_studies: true,
        },
      );

      const res = await service.getInnovationDev(11144);

      expect(mockScalingStudyUrlRepository.find).not.toHaveBeenCalled();
      expect((res as any).response.scaling_studies_urls).toEqual([]);
    });
  });

  describe('savePolicyChanges', () => {
    it('creates policy change, institutions and answers', async () => {
      const dto = {
        amount: 200,
        institutions: [{ institutions_id: 2 }],
        policy_stage_id: 1,
        policy_type_id: 4,
        status_amount: 'DECLARED',
        optionsWithAnswers: [
          { result_question_id: 9, answer_boolean: true, answer_text: 'yes' },
        ],
        result_related_engagement: 'engagement',
      } as any;

      mockResultsPolicyChangesRepository.ResultsPolicyChangesExists.mockResolvedValueOnce(
        null,
      );
      mockResultsPolicyChangesRepository.save.mockResolvedValueOnce({ id: 5 });
      mockResultByIntitutionsRepository.getGenericResultByInstitutionExists.mockResolvedValueOnce(
        null,
      );
      mockResultByIntitutionsRepository.save.mockResolvedValueOnce([]);
      mockResultAnswerRepository.findOne.mockResolvedValueOnce(null);
      mockResultAnswerRepository.save.mockResolvedValueOnce({});

      const res = await service.savePolicyChanges(dto, 12, user);

      expect(
        mockResultsPolicyChangesRepository.ResultsPolicyChangesExists,
      ).toHaveBeenCalledWith(12);
      expect(
        mockResultByIntitutionsRepository.updateGenericIstitutions,
      ).toHaveBeenCalledWith(12, dto.institutions, 4, user.id);
      expect(mockResultAnswerRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          result_question_id: 9,
          result_id: 12,
        }),
      );
      expect(res.status).toBe(HttpStatus.CREATED);
      expect(res.response).toEqual({ id: 5 });
    });
  });

  describe('getPolicyChanges', () => {
    it('returns policy change with institutions when it exists', async () => {
      const policyChange = { id: 20, amount: 10 };
      const institutions = [{ id: 1 }];

      mockResultsPolicyChangesRepository.ResultsPolicyChangesExists.mockResolvedValueOnce(
        policyChange,
      );
      mockResultByIntitutionsRepository.getGenericAllResultByInstitutionByRole.mockResolvedValueOnce(
        institutions,
      );

      const res = await service.getPolicyChanges(50);
      const response: any = res.response as any;

      expect(res.status).toBe(HttpStatus.OK);
      expect(response.id).toBe(20);
      expect(response.institutions).toEqual(institutions);
    });
  });
});
