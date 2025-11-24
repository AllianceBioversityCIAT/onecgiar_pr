import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, Logger } from '@nestjs/common';
import { IpsrGeneralInformationService } from './ipsr_general_information.service';
import { ResultRepository } from '../../results/result.repository';
import { VersioningService } from '../../versioning/versioning.service';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultsInvestmentDiscontinuedOptionRepository } from '../../results/results-investment-discontinued-options/results-investment-discontinued-options.repository';
import { ImpactAreasScoresComponentRepository } from '../../results/impact_areas_scores_components/repositories/impact_areas_scores_components.repository';
import { GenderTagRepository } from '../../results/gender_tag_levels/genderTag.repository';
import { IpsrRepository } from '../../ipsr/ipsr.repository';
import { IpsrService } from '../../ipsr/ipsr.service';
import { AdUserRepository, AdUserService } from '../../ad_users';
import { UpdateIpsrGeneralInformationDto } from './dto/update-ipsr_general_information.dto';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { AppModuleIdEnum } from '../../../shared/constants/role-type.enum';

describe('IpsrGeneralInformationService', () => {
  let service: IpsrGeneralInformationService;

  const mockResultRepo = {
    findOneBy: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    }),
  };

  const mockVersioning = {
    $_findActivePhase: jest.fn(),
  };

  const mockErrorHandler = {
    returnErrorRes: jest.fn((e) => e),
  };

  const mockDiscontinuedRepo = {
    inactiveData: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };

  const mockImpactAreaCompRepo = {
    findOne: jest.fn(),
  };

  const mockGenderTagRepo = {
    findOne: jest.fn(),
  };

  const mockIpsrRepo = {
    getResultInnovationById: jest.fn(),
  };

  const mockIpsrService = {
    findOneInnovation: jest.fn(),
  };

  const mockAdUserService = {
    getUserByIdentifier: jest.fn(),
    adUserRepository: {
      saveFromADUser: jest.fn(),
    },
  };

  const mockAdUserRepo = {
    findOne: jest.fn(),
  };

  const mockUser: TokenDto = {
    id: 10,
    first_name: 'Test',
    last_name: 'User',
    email: 'test@example.com',
  };
  const mockResult = {
    id: 1,
    status_id: 1,
    geographic_scope_id: 2,
    title: 'Test Result',
    description: 'Test Description',
  };

  beforeEach(async () => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IpsrGeneralInformationService,
        { provide: ResultRepository, useValue: mockResultRepo },
        { provide: VersioningService, useValue: mockVersioning },
        { provide: HandlersError, useValue: mockErrorHandler },
        {
          provide: ResultsInvestmentDiscontinuedOptionRepository,
          useValue: mockDiscontinuedRepo,
        },
        {
          provide: ImpactAreasScoresComponentRepository,
          useValue: mockImpactAreaCompRepo,
        },
        { provide: GenderTagRepository, useValue: mockGenderTagRepo },
        { provide: IpsrRepository, useValue: mockIpsrRepo },
        { provide: IpsrService, useValue: mockIpsrService },
        { provide: AdUserService, useValue: mockAdUserService },
        { provide: AdUserRepository, useValue: mockAdUserRepo },
      ],
    }).compile();

    service = module.get<IpsrGeneralInformationService>(
      IpsrGeneralInformationService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('generalInformation', () => {
    const mockDto: UpdateIpsrGeneralInformationDto = {
      title: 'Updated Title',
      description: 'Updated Description',
      lead_contact_person: 'John Doe',
      gender_tag_level_id: 1,
      climate_change_tag_level_id: 1,
      nutrition_tag_level_id: 1,
      environmental_biodiversity_tag_level_id: 1,
      poverty_tag_level_id: 1,
      gender_impact_area_id: null,
      climate_impact_area_id: null,
      nutrition_impact_area_id: null,
      environmental_biodiversity_impact_area_id: null,
      poverty_impact_area_id: null,
      is_discontinued: false,
      discontinued_options: [],
    };

    beforeEach(() => {
      mockResultRepo.findOneBy.mockResolvedValue(mockResult);
      mockVersioning.$_findActivePhase.mockResolvedValue({ id: 99 });
      mockResultRepo
        .createQueryBuilder()
        .getMany.mockResolvedValue([mockResult]);
      mockGenderTagRepo.findOne.mockResolvedValue({
        id: 1,
        name: 'Gender Tag',
      });
      mockImpactAreaCompRepo.findOne.mockResolvedValue(null);
      mockIpsrService.findOneInnovation.mockResolvedValue({
        response: mockResult,
        message: 'Success',
        status: HttpStatus.OK,
      });
    });

    it('should update and return OK response', async () => {
      const result = await service.generalInformation(1, mockDto, mockUser);

      expect(result.status).toBe(HttpStatus.OK);
      expect(result.message).toBe('Successfully updated');
      expect(mockResultRepo.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          title: mockDto.title,
          description: mockDto.description,
          lead_contact_person: mockDto.lead_contact_person,
          last_updated_by: mockUser.id,
        }),
      );
      expect(mockIpsrService.findOneInnovation).toHaveBeenCalledWith(1);
    });

    it('should handle title validation with duplicates', async () => {
      const duplicateResults = [
        { id: 2, result_code: 'R002' },
        { id: 3, result_code: 'R003' },
      ];
      mockResultRepo
        .createQueryBuilder()
        .getMany.mockResolvedValue(duplicateResults);

      try {
        await service.generalInformation(1, mockDto, mockUser);
      } catch (error) {
        expect(error.status).toBe(HttpStatus.BAD_REQUEST);
        expect(error.message).toContain('The title already exists');
      }
    });

    it('should handle discontinued result with options', async () => {
      const discontinuedDto = {
        ...mockDto,
        is_discontinued: true,
        discontinued_options: [
          {
            investment_discontinued_option_id: 1,
            value: true,
            description: 'Test reason',
          },
        ],
      };

      mockDiscontinuedRepo.findOne.mockResolvedValue(null);
      mockDiscontinuedRepo.save.mockResolvedValue({});

      const result = await service.generalInformation(
        1,
        discontinuedDto,
        mockUser,
      );

      expect(result.status).toBe(HttpStatus.OK);
      expect(mockDiscontinuedRepo.inactiveData).toHaveBeenCalled();
      expect(mockDiscontinuedRepo.save).toHaveBeenCalled();
    });

    it('should create new AD user when user does not exist', async () => {
      const dtoWithAdUser = {
        ...mockDto,
        lead_contact_person_data: {
          mail: 'john.doe@example.com',
          name: 'John Doe',
        },
      };

      const newAdUser = { id: 123, mail: 'john.doe@example.com' };
      mockAdUserService.getUserByIdentifier.mockResolvedValue(null);
      mockAdUserService.adUserRepository.saveFromADUser.mockResolvedValue(
        newAdUser,
      );

      await service.generalInformation(1, dtoWithAdUser, mockUser);

      expect(mockAdUserService.getUserByIdentifier).toHaveBeenCalledWith(
        'john.doe@example.com',
      );
      expect(
        mockAdUserService.adUserRepository.saveFromADUser,
      ).toHaveBeenCalled();
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        `Created new AD user: ${newAdUser.mail} with ID: ${newAdUser.id}`,
      );
    });

    it('should find existing AD user', async () => {
      const dtoWithAdUser = {
        ...mockDto,
        lead_contact_person_data: {
          mail: 'existing@example.com',
          name: 'Existing User',
        },
      };

      const existingAdUser = { id: 456, mail: 'existing@example.com' };
      mockAdUserService.getUserByIdentifier.mockResolvedValue(existingAdUser);

      await service.generalInformation(1, dtoWithAdUser, mockUser);

      expect(mockAdUserService.getUserByIdentifier).toHaveBeenCalledWith(
        'existing@example.com',
      );
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        `Found existing AD user: ${existingAdUser.mail} with ID: ${existingAdUser.id}`,
      );
    });

    it('should handle tag with level 3 and component validation', async () => {
      const dtoWithComponent = {
        ...mockDto,
        gender_tag_level_id: 3,
        gender_impact_area_id: 5,
      };

      const level3Tag = { id: 3, name: 'Level 3 Tag' };
      const component = { id: 5, name: 'Test Component' };

      mockGenderTagRepo.findOne.mockResolvedValue(level3Tag);
      mockImpactAreaCompRepo.findOne.mockResolvedValue(component);

      await service.generalInformation(1, dtoWithComponent, mockUser);

      expect(mockGenderTagRepo.findOne).toHaveBeenCalledWith({
        where: { id: 3 },
      });
      expect(mockImpactAreaCompRepo.findOne).toHaveBeenCalledWith({
        where: { id: 5 },
      });
    });

    it('should throw error when tag does not exist', async () => {
      mockGenderTagRepo.findOne.mockResolvedValue(null);

      try {
        await service.generalInformation(1, mockDto, mockUser);
      } catch (error) {
        expect(error.status).toBe(HttpStatus.NOT_FOUND);
        expect(error.message).toContain('The Gender tag does not exist');
      }
    });

    it('should throw error when component does not exist for level 3', async () => {
      const dtoWithComponent = {
        ...mockDto,
        gender_tag_level_id: 3,
        gender_impact_area_id: 5,
      };

      mockGenderTagRepo.findOne.mockResolvedValue({ id: 3, name: 'Level 3' });
      mockImpactAreaCompRepo.findOne.mockResolvedValue(null);

      try {
        await service.generalInformation(1, dtoWithComponent, mockUser);
      } catch (error) {
        expect(error.status).toBe(HttpStatus.NOT_FOUND);
        expect(error.message).toContain(
          'The Gender tag component does not exist',
        );
      }
    });

    it('should handle version not found', async () => {
      mockVersioning.$_findActivePhase.mockResolvedValue(null);

      await service.generalInformation(1, mockDto, mockUser);

      expect(mockVersioning.$_findActivePhase).toHaveBeenCalledWith(
        AppModuleIdEnum.IPSR,
      );
      expect(mockErrorHandler.returnErrorRes).toHaveBeenCalled();
    });

    it('should handle AD user service errors gracefully', async () => {
      const dtoWithAdUser = {
        ...mockDto,
        lead_contact_person_data: {
          mail: 'error@example.com',
          name: 'Error User',
        },
      };

      mockAdUserService.getUserByIdentifier.mockRejectedValue(
        new Error('AD Service Error'),
      );

      await service.generalInformation(1, dtoWithAdUser, mockUser);

      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        'Failed to process lead_contact_person_data: AD Service Error',
      );
    });

    it('should return error via handler if something fails', async () => {
      mockResultRepo.findOneBy.mockRejectedValue(new Error('Database error'));

      const result = await service.generalInformation(1, mockDto, mockUser);

      expect(mockErrorHandler.returnErrorRes).toHaveBeenCalledWith({
        error: expect.any(Error),
        debug: true,
      });
    });
  });

  describe('findOneInnovation', () => {
    it('should return innovation result with lead contact person', async () => {
      const mockInnovationResult = {
        id: 1,
        title: 'Innovation',
        lead_contact_person_id: 123,
      };
      const mockDiscontinuedOptions = [
        { id: 1, result_id: 1, is_active: true },
      ];
      const mockLeadContactPerson = {
        id: 123,
        mail: 'lead@example.com',
        is_active: true,
      };

      mockIpsrRepo.getResultInnovationById.mockResolvedValue([
        mockInnovationResult,
      ]);
      mockDiscontinuedRepo.find.mockResolvedValue(mockDiscontinuedOptions);
      mockAdUserRepo.findOne.mockResolvedValue(mockLeadContactPerson);

      const result = await service.findOneInnovation(1);

      expect(result.status).toBe(HttpStatus.OK);
      expect(result.message).toBe('Successful response');
      expect(result.response.id).toBe(1);
      expect(result.response.lead_contact_person_data).toEqual(
        mockLeadContactPerson,
      );
      expect(result.response.discontinued_options).toEqual(
        mockDiscontinuedOptions,
      );
    });

    it('should handle innovation without lead contact person', async () => {
      const mockInnovationResult = {
        id: 1,
        title: 'Innovation',
        lead_contact_person_id: null,
      };

      mockIpsrRepo.getResultInnovationById.mockResolvedValue([
        mockInnovationResult,
      ]);
      mockDiscontinuedRepo.find.mockResolvedValue([]);

      const result = await service.findOneInnovation(1);

      expect(result.status).toBe(HttpStatus.OK);
      expect(result.response.lead_contact_person_data).toBeNull();
      expect(mockAdUserRepo.findOne).not.toHaveBeenCalled();
    });

    it('should handle lead contact person fetch error', async () => {
      const mockInnovationResult = {
        id: 1,
        title: 'Innovation',
        lead_contact_person_id: 123,
      };

      mockIpsrRepo.getResultInnovationById.mockResolvedValue([
        mockInnovationResult,
      ]);
      mockDiscontinuedRepo.find.mockResolvedValue([]);
      mockAdUserRepo.findOne.mockRejectedValue(new Error('User not found'));

      jest.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await service.findOneInnovation(1);

      expect(result.status).toBe(HttpStatus.OK);
      expect(result.response.lead_contact_person_data).toBeNull();
      expect(console.warn).toHaveBeenCalledWith(
        'Failed to get lead contact person data:',
        expect.any(Error),
      );

      jest.restoreAllMocks();
    });

    it('should handle result not found', async () => {
      mockIpsrRepo.getResultInnovationById.mockResolvedValue([]);

      const result = await service.findOneInnovation(1);

      expect(mockErrorHandler.returnErrorRes).toHaveBeenCalledWith({
        error: expect.any(Error),
        debug: true,
      });
    });

    it('should handle error and return handler response', async () => {
      mockIpsrRepo.getResultInnovationById.mockRejectedValue(
        new Error('Database error'),
      );

      const result = await service.findOneInnovation(1);

      expect(mockErrorHandler.returnErrorRes).toHaveBeenCalledWith({
        error: expect.any(Error),
        debug: true,
      });
    });
  });

  describe('validateTagAndComponent (private method)', () => {
    it('should validate tag and component for level 3', async () => {
      const tag = { id: 3, name: 'Level 3 Tag' };
      const component = { id: 5, name: 'Test Component' };

      mockGenderTagRepo.findOne.mockResolvedValue(tag);
      mockImpactAreaCompRepo.findOne.mockResolvedValue(component);

      const result = await (service as any).validateTagAndComponent(
        3,
        5,
        'Gender',
      );

      expect(result.tag).toEqual(tag);
      expect(result.component).toEqual(component);
    });

    it('should validate tag without component for non-level 3', async () => {
      const tag = { id: 1, name: 'Level 1 Tag' };

      mockGenderTagRepo.findOne.mockResolvedValue(tag);

      const result = await (service as any).validateTagAndComponent(
        1,
        null,
        'Gender',
      );

      expect(result.tag).toEqual(tag);
      expect(result.component).toBeNull();
      expect(mockImpactAreaCompRepo.findOne).not.toHaveBeenCalled();
    });
  });
});