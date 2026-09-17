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

/**
 * P2-3692 — saving an evidence whose link is a CGSpace `items/<uuid>` URL answered
 * "There was an error saving the section. ... Cannot read properties of null (reading 'Handle')",
 * and the very next attempt saved the same evidence with no error at all.
 *
 * Two independent defects, and each one hides the other:
 *
 *   1. `getDataFromCGSpaceHandle` returns `null` when the MQAP request itself fails
 *      (`m-qap.service.ts`, the `.catch` that logs and returns null). `cgspaceData.Handle`
 *      read straight off that null, which is the message the reporter saw verbatim.
 *
 *   2. `kpUrlRegex` carried the `g` flag while living on a SINGLETON service, so `exec`
 *      kept `lastIndex` between calls and alternated match / null for the identical URL.
 *      That is the whole explanation of the retry: the first save matched and blew up on
 *      (1); the retry did not match, never called MQAP, and saved fine.
 *
 * So the regex fix alone would have turned an annoying first-attempt error into a
 * permanent block, and the null guard alone would have left every other CGSpace evidence
 * silently un-enriched. Both are asserted here.
 */
describe('EvidencesService — CGSpace item/UUID evidence links (P2-3692)', () => {
  let service: EvidencesService;

  const user: TokenDto = { id: 10, email: 'tester@cgiar.org' } as TokenDto;

  const UUID_LINK =
    'https://cgspace.cgiar.org/items/d68c08e2-047c-47ef-a3a4-8637df25f4d9';
  const HANDLE_LINK = 'https://cgspace.cgiar.org/handle/10568/12345';

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
  const mockMqapService = { getDataFromCGSpaceHandle: jest.fn() };
  const mockKnowledgeProductsRepository = { findOne: jest.fn() };
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
          useValue: mockKnowledgeProductsRepository,
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
        { provide: MQAPService, useValue: mockMqapService },
        { provide: HandlersError, useValue: mockHandlersError },
      ],
    }).compile();

    service = module.get<EvidencesService>(EvidencesService);
    jest.clearAllMocks();
  });

  describe('getHandleFromRegularLink', () => {
    it('keeps the reporter link instead of throwing when MQAP answers null (the reported crash)', async () => {
      mockMqapService.getDataFromCGSpaceHandle.mockResolvedValue(null);

      await expect(service.getHandleFromRegularLink(UUID_LINK)).resolves.toBe(
        UUID_LINK,
      );
      expect(mockMqapService.getDataFromCGSpaceHandle).toHaveBeenCalledTimes(1);
    });

    it('keeps the reporter link when MQAP answers an object with Handle: null', async () => {
      mockMqapService.getDataFromCGSpaceHandle.mockResolvedValue({
        Handle: null,
        Title: null,
      });

      await expect(service.getHandleFromRegularLink(UUID_LINK)).resolves.toBe(
        UUID_LINK,
      );
    });

    it('recognises the SAME CGSpace link on every call, not on every other one', async () => {
      // The regex state bug: with the `g` flag the second `exec` on the identical string
      // started at `lastIndex` and found nothing, so MQAP was never consulted again.
      mockMqapService.getDataFromCGSpaceHandle.mockResolvedValue({
        Handle: '10568/12345',
      });

      const first = await service.getHandleFromRegularLink(HANDLE_LINK);
      const second = await service.getHandleFromRegularLink(HANDLE_LINK);
      const third = await service.getHandleFromRegularLink(HANDLE_LINK);

      expect([first, second, third]).toEqual([
        '10568/12345',
        '10568/12345',
        '10568/12345',
      ]);
      expect(mockMqapService.getDataFromCGSpaceHandle).toHaveBeenCalledTimes(3);
    });

    it('does not leak regex state across links of different reporters', async () => {
      // Same singleton service, two different evidences in a row: the second must still
      // be detected as a CGSpace link.
      mockMqapService.getDataFromCGSpaceHandle.mockResolvedValue(null);

      await service.getHandleFromRegularLink(UUID_LINK);
      await service.getHandleFromRegularLink(
        'https://cgspace.cgiar.org/items/aaaaaaaa-1111-2222-3333-444444444444',
      );

      expect(mockMqapService.getDataFromCGSpaceHandle).toHaveBeenCalledTimes(2);
    });

    it('still ignores links that are not CGSpace ones', async () => {
      const result = await service.getHandleFromRegularLink(
        'https://example.org/some/file.pdf',
      );

      expect(result).toBe('https://example.org/some/file.pdf');
      expect(mockMqapService.getDataFromCGSpaceHandle).not.toHaveBeenCalled();
    });
  });

  describe('create — end to end through the section save', () => {
    const dtoWithUuidEvidence = () => ({
      result_id: 9357,
      evidences: [
        {
          link: UUID_LINK,
          innovation_use_related: true,
        } as any,
      ],
      supplementary: undefined,
    });

    it('saves the section at the FIRST attempt, with no "piece of evidence was not saved" error', async () => {
      mockResultRepository.getResultById.mockResolvedValue({ id: 9357 });
      mockEvidencesRepository.getEvidencesByResultIdAndLink.mockResolvedValue(
        undefined,
      );
      mockKnowledgeProductsRepository.findOne.mockResolvedValue(null);
      mockEvidencesRepository.save.mockImplementation(async (e: any) => ({
        ...e,
        id: 555,
      }));
      mockMqapService.getDataFromCGSpaceHandle.mockResolvedValue(null);

      const res = await service.create(dtoWithUuidEvidence() as any, user);

      expect(mockHandlersError.returnErrorRes).not.toHaveBeenCalled();
      expect(res.status).toBe(HttpStatus.OK);
      expect(mockEvidencesRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ link: UUID_LINK, result_id: 9357 }),
      );
    });
  });
});
