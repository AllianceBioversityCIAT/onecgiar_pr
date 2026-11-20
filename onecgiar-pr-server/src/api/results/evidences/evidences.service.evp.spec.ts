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

// @akili-spec bilateral/evidence-privacy-tag
/**
 * EVP-T-3 — shared evidence endpoint: `is_public` is written only for bilateral (source 'API')
 * link evidences (EVP-R-3 persistence half, EVP-R-12 "Pool link save", EVP-DD-3), and loaded
 * back normalized to true / false / null.
 */
describe('EvidencesService — evidence is_public persistence (EVP-T-3)', () => {
  let service: EvidencesService;
  const user: TokenDto = { id: 10, email: 'tester@cgiar.org' } as TokenDto;

  const mockEvidencesRepository = {
    getEvidencesByResultIdAndLink: jest.fn(),
    getEvidencesByResultId: jest.fn(),
    updateEvidences: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };
  const mockResultRepository = { findOne: jest.fn(), update: jest.fn() };
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
        { provide: VersionRepository, useValue: { getBaseVersion: jest.fn() } },
        {
          provide: ResultsKnowledgeProductsRepository,
          useValue: { findOne: jest.fn() },
        },
        {
          provide: ResultsInnovationsDevRepository,
          useValue: { InnovationDevExists: jest.fn() },
        },
        {
          provide: GlobalParameterCacheService,
          useValue: { getParam: jest.fn() },
        },
        {
          provide: SharePointService,
          useValue: {
            addFileAccess: jest.fn(),
            replicateFile: jest.fn(),
            generateFilePath: jest.fn(),
          },
        },
        {
          provide: EvidenceSharepointRepository,
          useValue: { findOne: jest.fn(), update: jest.fn(), save: jest.fn() },
        },
        {
          provide: MQAPService,
          useValue: { getDataFromCGSpaceHandle: jest.fn() },
        },
        { provide: HandlersError, useValue: mockHandlersError },
      ],
    }).compile();

    service = module.get<EvidencesService>(EvidencesService);
    jest.clearAllMocks();
    mockEvidencesRepository.getEvidencesByResultIdAndLink.mockResolvedValue(
      null,
    );
    mockEvidencesRepository.save.mockImplementation(async (e) => ({
      ...e,
      id: 99,
    }));
  });

  const saveWith = async (source: string, evidence: any) => {
    mockResultRepository.findOne.mockResolvedValue({ id: 1, source });
    await service.create(
      { result_id: 1, evidences: [evidence], supplementary: [] } as any,
      user,
    );
    expect(mockEvidencesRepository.save).toHaveBeenCalled();
    return mockEvidencesRepository.save.mock.calls[0][0];
  };

  it('(a) bilateral link evidence persists is_public false', async () => {
    const saved = await saveWith('API', {
      id: '1',
      link: 'https://example.org/doc',
      is_public: false,
    });
    expect(saved.is_public).toBe(false);
  });

  it('(b) pool link evidence never has is_public touched, even if sent', async () => {
    const saved = await saveWith('Result', {
      id: '1',
      link: 'https://example.org/doc',
      is_public: false,
    });
    expect(saved.is_public).toBeUndefined();
  });

  it('(c) bilateral SharePoint item gets is_public null', async () => {
    const saved = await saveWith('API', {
      id: '1',
      link: 'https://example.sharepoint.com/file',
      is_sharepoint: 1,
      is_public: false,
      sp_file_name: 'f.pdf',
    });
    expect(saved.is_public).toBeNull();
  });

  it('(d) bilateral link evidence without is_public persists null', async () => {
    const saved = await saveWith('API', {
      id: '1',
      link: 'https://example.org/doc',
    });
    expect(saved.is_public).toBeNull();
  });

  it('(e) bilateral re-save without is_public keeps a stored private tag (EVP-R-11)', async () => {
    mockEvidencesRepository.getEvidencesByResultIdAndLink.mockResolvedValue({
      id: 7,
      link: 'https://example.org/doc',
      is_public: false,
    });
    mockResultRepository.findOne.mockResolvedValue({ id: 1, source: 'API' });
    await service.create(
      {
        result_id: 1,
        evidences: [{ id: '7', link: 'https://example.org/doc' }],
        supplementary: [],
      } as any,
      user,
    );
    const written = [
      ...mockEvidencesRepository.save.mock.calls,
      ...mockEvidencesRepository.update.mock.calls,
      ...mockEvidencesRepository.updateEvidences.mock.calls,
    ]
      .flat()
      .flat()
      .filter((e: any) => e && typeof e === 'object' && 'is_public' in e);
    expect(written.length).toBeGreaterThan(0);
    written.forEach((e: any) => expect(e.is_public).toBe(false));
  });

  it('(f) bilateral re-save with is_public true replaces a stored private tag', async () => {
    mockEvidencesRepository.getEvidencesByResultIdAndLink.mockResolvedValue({
      id: 7,
      link: 'https://example.org/doc',
      is_public: false,
    });
    mockResultRepository.findOne.mockResolvedValue({ id: 1, source: 'API' });
    await service.create(
      {
        result_id: 1,
        evidences: [
          { id: '7', link: 'https://example.org/doc', is_public: true },
        ],
        supplementary: [],
      } as any,
      user,
    );
    const written = [
      ...mockEvidencesRepository.save.mock.calls,
      ...mockEvidencesRepository.update.mock.calls,
      ...mockEvidencesRepository.updateEvidences.mock.calls,
    ]
      .flat()
      .flat()
      .filter((e: any) => e && typeof e === 'object' && 'is_public' in e);
    expect(written.length).toBeGreaterThan(0);
    written.forEach((e: any) => expect(e.is_public).toBe(true));
  });

  describe('findAll normalization', () => {
    it('maps raw 0/1/null to false/true/null (never Boolean(null))', async () => {
      mockResultRepository.findOne.mockResolvedValue({ id: 1 });
      mockEvidencesRepository.getEvidencesByResultId
        .mockResolvedValueOnce([
          { id: 1, is_public: 1 },
          { id: 2, is_public: 0 },
          { id: 3, is_public: null },
          { id: 4 },
        ])
        .mockResolvedValueOnce([]);
      const res: any = await service.findAll(1);
      expect(res.response.evidences.map((e) => e.is_public)).toEqual([
        true,
        false,
        null,
        null,
      ]);
    });
  });
});
