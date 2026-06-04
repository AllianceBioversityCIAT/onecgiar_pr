import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { EvidencesService } from './evidences.service';
import { EvidencesRepository } from './evidences.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultRepository } from '../result.repository';
import { VersionRepository } from '../../versioning/versioning.repository';
import { ResultsKnowledgeProductsRepository } from '../results-knowledge-products/repositories/results-knowledge-products.repository';
import { ResultsInnovationsDevRepository } from '../summary/repositories/results-innovations-dev.repository';
import { GlobalParameterCacheService } from '../../../shared/services/cache/global-parameter-cache.service';
import { SharePointService } from '../../../shared/services/share-point/share-point.service';
import { EvidenceSharepointRepository } from './repositories/evidence-sharepoint.repository';
import { MQAPService } from '../../m-qap/m-qap.service';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { CreateEvidenceDto } from './dto/create-evidence.dto';

describe('EvidencesService', () => {
  let service: EvidencesService;

  const user: TokenDto = {
    id: 10,
    email: 'tester@cgiar.org',
    first_name: 'Test',
    last_name: 'User',
  } as TokenDto;

  const mockEvidencesRepository = {
    getEvidencesByResultIdAndLink: jest.fn(),
    getEvidencesByResultId: jest.fn(),
    updateEvidences: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    find: jest.fn(),
  };

  const mockResultRepository = {
    getResultById: jest.fn(),
    update: jest.fn(),
  };

  const mockVersionRepository = {
    getBaseVersion: jest.fn(),
  };

  const mockResultsKnowledgeProductsRepository = {
    findOne: jest.fn(),
  };

  const mockResultsInnovationsDevRepository = {
    InnovationDevExists: jest.fn(),
  };

  const mockGlobalParameterCacheService = {
    getParam: jest.fn(),
  };

  const mockSharePointService = {
    addFileAccess: jest.fn(),
    replicateFile: jest.fn(),
    generateFilePath: jest.fn(),
  };

  const mockEvidenceSharepointRepository = {
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
  };

  const mockMqapService = {
    getDataFromCGSpaceHandle: jest.fn(),
  };

  const mockHandlersError = {
    returnErrorRes: jest.fn(({ error }) => ({
      response: {},
      message: error?.message ?? 'error',
      status: error?.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EvidencesService,
        { provide: EvidencesRepository, useValue: mockEvidencesRepository },
        { provide: ResultRepository, useValue: mockResultRepository },
        { provide: VersionRepository, useValue: mockVersionRepository },
        {
          provide: ResultsKnowledgeProductsRepository,
          useValue: mockResultsKnowledgeProductsRepository,
        },
        {
          provide: ResultsInnovationsDevRepository,
          useValue: mockResultsInnovationsDevRepository,
        },
        {
          provide: GlobalParameterCacheService,
          useValue: mockGlobalParameterCacheService,
        },
        { provide: SharePointService, useValue: mockSharePointService },
        {
          provide: EvidenceSharepointRepository,
          useValue: mockEvidenceSharepointRepository,
        },
        { provide: MQAPService, useValue: mockMqapService },
        { provide: HandlersError, useValue: mockHandlersError },
      ],
    }).compile();

    service = module.get<EvidencesService>(EvidencesService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should update the result and return OK when there are no evidences', async () => {
      mockResultRepository.getResultById.mockResolvedValue({ id: 1 });
      mockVersionRepository.getBaseVersion.mockResolvedValue({ id: 99 });
      mockEvidencesRepository.updateEvidences.mockResolvedValue(undefined);
      mockResultRepository.update.mockResolvedValue(undefined);

      const dto: CreateEvidenceDto = {
        result_id: 1,
        evidences: [],
        supplementary: undefined,
      };

      const res = await service.create(dto, user);

      expect(res.status).toBe(HttpStatus.OK);
      expect(mockEvidencesRepository.updateEvidences).toHaveBeenCalledWith(
        1,
        [],
        user.id,
        false,
        1,
      );
      expect(mockResultRepository.update).toHaveBeenCalled();
    });

    it('should delegate errors to HandlersError', async () => {
      mockResultRepository.getResultById.mockRejectedValue(
        new Error('db down'),
      );

      const res = await service.create(
        { result_id: 1, evidences: [], supplementary: undefined },
        user,
      );

      expect(mockHandlersError.returnErrorRes).toHaveBeenCalled();
      expect(res.message).toBe('db down');
    });
  });

  describe('createV2', () => {
    it('should process main evidences with evidence type 6 and return OK', async () => {
      mockResultRepository.getResultById.mockResolvedValue({ id: 5 });
      mockVersionRepository.getBaseVersion.mockResolvedValue({ id: 99 });
      mockEvidencesRepository.updateEvidences.mockResolvedValue(undefined);

      const res = await service.createV2(
        { result_id: 5, evidences: [], supplementary: undefined },
        user,
      );

      expect(res.status).toBe(HttpStatus.OK);
      expect(mockEvidencesRepository.updateEvidences).toHaveBeenCalledWith(
        5,
        [],
        user.id,
        false,
        6,
      );
    });
  });

  describe('getHandleFromRegularLink', () => {
    it('should return the same link when it is not a CGSpace link', async () => {
      const result = await service.getHandleFromRegularLink(
        'https://example.org/some/file.pdf',
      );
      expect(result).toBe('https://example.org/some/file.pdf');
      expect(mockMqapService.getDataFromCGSpaceHandle).not.toHaveBeenCalled();
    });

    it('should return the MQAP handle when it is a CGSpace link', async () => {
      mockMqapService.getDataFromCGSpaceHandle.mockResolvedValue({
        Handle: '10568/12345',
      });

      const result = await service.getHandleFromRegularLink(
        'https://cgspace.cgiar.org/handle/10568/12345',
      );

      expect(result).toBe('10568/12345');
      expect(mockMqapService.getDataFromCGSpaceHandle).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should delegate to HandlersError when the result is not found', async () => {
      mockResultRepository.getResultById.mockResolvedValue(null);

      await service.findAll(123);

      expect(mockHandlersError.returnErrorRes).toHaveBeenCalled();
    });

    it('should normalize flags and return evidences + supplementary', async () => {
      mockResultRepository.getResultById.mockResolvedValue({
        id: 1,
        gender_tag_level_id: 2,
        climate_change_tag_level_id: 3,
        nutrition_tag_level_id: null,
        environmental_biodiversity_tag_level_id: null,
        poverty_tag_level_id: null,
      });
      mockResultsInnovationsDevRepository.InnovationDevExists.mockResolvedValue({
        innovation_readiness_level_id: 4,
      });
      mockEvidencesRepository.getEvidencesByResultId
        .mockResolvedValueOnce([
          { id: 1, gender_related: 1, is_sharepoint: 1, is_public_file: 1 },
        ])
        .mockResolvedValueOnce([{ id: 2, gender_related: 0 }]);

      const res = await service.findAll(1);

      expect(res.status).toBe(HttpStatus.OK);
      expect((res.response as any).innovation_readiness_level_id).toBe(4);
      expect((res.response as any).evidences[0].gender_related).toBe(true);
      expect((res.response as any).evidences[0].is_sharepoint).toBe(1);
      expect((res.response as any).evidences[0].is_public_file).toBe(true);
      expect((res.response as any).supplementary[0].gender_related).toBe(false);
    });
  });

  describe('findAllV2', () => {
    it('should return evidences for type 6 with normalized flags', async () => {
      mockResultRepository.getResultById.mockResolvedValue({
        id: 1,
        gender_tag_level_id: null,
        climate_change_tag_level_id: null,
        nutrition_tag_level_id: null,
        environmental_biodiversity_tag_level_id: null,
        poverty_tag_level_id: null,
      });
      mockResultsInnovationsDevRepository.InnovationDevExists.mockResolvedValue(
        null,
      );
      mockEvidencesRepository.getEvidencesByResultId.mockResolvedValue([
        { id: 1, innovation_use_related: 1, is_sharepoint: 0, is_public_file: 0 },
      ]);

      const res = await service.findAllV2(1);

      expect(res.status).toBe(HttpStatus.OK);
      expect((res.response as any).innovation_readiness_level_id).toBeNull();
      expect((res.response as any).evidences[0].innovation_use_related).toBe(true);
      expect((res.response as any).evidences[0].is_sharepoint).toBe(0);
      expect(mockEvidencesRepository.getEvidencesByResultId).toHaveBeenCalledWith(
        1,
        false,
        6,
      );
    });
  });

  describe('updateEvidencesPartial', () => {
    it('should return NOT_FOUND when the result does not exist', async () => {
      mockResultRepository.getResultById.mockResolvedValue(null);

      const res = await service.updateEvidencesPartial([], 1, user);

      expect(res.status).toBe(HttpStatus.NOT_FOUND);
    });

    it('should return BAD_REQUEST when there are duplicate links', async () => {
      mockResultRepository.getResultById.mockResolvedValue({ id: 1 });

      const res = await service.updateEvidencesPartial(
        [{ link: 'dup' } as any, { link: 'dup' } as any],
        1,
        user,
      );

      expect(res.status).toBe(HttpStatus.BAD_REQUEST);
      expect(res.message).toContain('Duplicate links');
    });

    it('should deactivate missing evidences and keep existing ones', async () => {
      mockResultRepository.getResultById.mockResolvedValue({ id: 1 });
      mockEvidencesRepository.find.mockResolvedValue([
        { id: 1, is_active: 1 },
        { id: 2, is_active: 1 },
      ]);
      mockEvidencesRepository.save.mockResolvedValue(undefined);

      const res = await service.updateEvidencesPartial(
        [{ id: 1, link: 'keep' } as any],
        1,
        user,
      );

      expect(res.status).toBe(HttpStatus.OK);
      // evidence id=2 is missing from the payload -> deactivated (saved)
      expect(mockEvidencesRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 2, is_active: 0 }),
      );
    });
  });

  describe('saveSPData', () => {
    it('should not create a sharepoint row when the evidence is not a sharepoint file', async () => {
      await service.saveSPData(
        { id: '1', link: 'x', is_sharepoint: 0 },
        1,
      );

      expect(mockEvidenceSharepointRepository.save).not.toHaveBeenCalled();
    });
  });
});
