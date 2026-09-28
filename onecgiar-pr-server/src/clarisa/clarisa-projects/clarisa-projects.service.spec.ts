import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ClarisaProjectsService } from './clarisa-projects.service';
import { ClarisaProjectsRepository } from './clarisa-projects.repository';
import { HandlersError } from '../../shared/handlers/error.utils';
import { ClarisaCenter } from '../clarisa-centers/entities/clarisa-center.entity';

// @akili-spec notifications/bilateral-contributor-tagging
describe('ClarisaProjectsService', () => {
  let service: ClarisaProjectsService;
  let repository: ClarisaProjectsRepository;

  const mockRepository = {
    find: jest.fn(),
  };

  const mockCenterRepository = {
    find: jest.fn(),
  };

  const mockHandlersError = {
    returnErrorRepository: jest.fn(),
  };

  const center = (code: string, institutionId: number) => ({
    code,
    institutionId,
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    mockCenterRepository.find.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClarisaProjectsService,
        {
          provide: ClarisaProjectsRepository,
          useValue: mockRepository,
        },
        {
          provide: HandlersError,
          useValue: mockHandlersError,
        },
        {
          provide: getRepositoryToken(ClarisaCenter),
          useValue: mockCenterRepository,
        },
      ],
    }).compile();

    service = module.get<ClarisaProjectsService>(ClarisaProjectsService);
    repository = module.get<ClarisaProjectsRepository>(
      ClarisaProjectsRepository,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all projects successfully, with old fields intact', async () => {
      const mockProjects = [
        {
          id: 1,
          name: 'Test Project',
          organizationCode: null,
          sourceCenterAcronym: null,
        },
      ];
      mockRepository.find.mockResolvedValue(mockProjects);

      const result = await service.findAll();

      expect(result.response).toEqual([
        { ...mockProjects[0], owner_center_institution_id: null },
      ]);
      expect(result.status).toBe(200);
      expect(repository.find).toHaveBeenCalled();
    });

    it('adds owner_center_institution_id resolved via organizationCode -> Center', async () => {
      mockRepository.find.mockResolvedValue([
        {
          id: 1,
          organizationCode: 67,
          sourceCenterAcronym: null,
        },
      ]);
      mockCenterRepository.find.mockResolvedValue([center('CENTER-06', 67)]);

      const result = await service.findAll();

      expect(result.response[0]).toMatchObject({
        id: 1,
        owner_center_institution_id: 67,
      });
    });

    it('loads the Center index exactly once per findAll call', async () => {
      mockRepository.find.mockResolvedValue([
        { id: 1, organizationCode: 67, sourceCenterAcronym: null },
        { id: 2, organizationCode: 12, sourceCenterAcronym: null },
      ]);
      mockCenterRepository.find.mockResolvedValue([
        center('CENTER-06', 67),
        center('CENTER-01', 12),
      ]);

      await service.findAll();

      expect(mockCenterRepository.find).toHaveBeenCalledTimes(1);
    });

    it('resolves an Alliance-descended fixture (null org, known acronym "CIAT") via the alias map -> CENTER-03 institutionId', async () => {
      // organization_code is NULL for these rows because of the acronym mismatch the
      // alias map works around (W3_CENTER_ACRONYM_TO_CLARISA_CENTER_CODE: CIAT ->
      // CENTER-03). A findAll that read organizationCode/obj_organization directly
      // (the approach BCT-DD-4 rejects) would yield null here instead of 91.
      mockRepository.find.mockResolvedValue([
        {
          id: 1,
          organizationCode: null,
          sourceCenterAcronym: 'CIAT',
        },
      ]);
      mockCenterRepository.find.mockResolvedValue([center('CENTER-03', 91)]);

      const result = await service.findAll();

      expect(result.response[0]).toMatchObject({
        id: 1,
        owner_center_institution_id: 91,
      });
    });

    it('resolves an Alliance-descended fixture (null org, known acronym "BIOVERSITY") via the alias map -> CENTER-02 institutionId', async () => {
      mockRepository.find.mockResolvedValue([
        {
          id: 1,
          organizationCode: null,
          sourceCenterAcronym: 'BIOVERSITY',
        },
      ]);
      mockCenterRepository.find.mockResolvedValue([center('CENTER-02', 42)]);

      const result = await service.findAll();

      expect(result.response[0]).toMatchObject({
        id: 1,
        owner_center_institution_id: 42,
      });
    });

    it('yields owner_center_institution_id: null when the alias is known but its Center is absent from the index (T1 leader decision)', async () => {
      // CIAT resolves in the alias map, but no CENTER-03 row exists in this fixture's
      // index: resolveProjectOwnerCenter still returns the code, with institutionId
      // null (documented in project-owner-center.util.ts).
      mockRepository.find.mockResolvedValue([
        {
          id: 1,
          organizationCode: null,
          sourceCenterAcronym: 'CIAT',
        },
      ]);
      mockCenterRepository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result.response[0]).toMatchObject({
        id: 1,
        owner_center_institution_id: null,
      });
    });

    it('yields owner_center_institution_id: null when the project owner cannot be resolved at all', async () => {
      mockRepository.find.mockResolvedValue([
        {
          id: 1,
          organizationCode: null,
          sourceCenterAcronym: null,
        },
      ]);

      const result = await service.findAll();

      expect(result.response[0]).toMatchObject({
        id: 1,
        owner_center_institution_id: null,
      });
    });
  });
});
