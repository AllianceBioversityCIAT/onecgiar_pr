import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
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
 * Confidentiality of an uploaded evidence, and the save loop that made refusing unsafe.
 *
 * The defect, measured on prtest on 9 Sep 2026 (result 9075, evidence 13081): switching
 * an evidence to confidential does not remove the file's anonymous permission, so the
 * link that already circulated keeps serving the document. The row said
 * `is_public_file = false` and the UI drew a padlock over a file a stranger could still
 * download.
 *
 * Two things had to change together, and neither works alone:
 *   1. the save loop is guarded per evidence — before it, `updateEvidences` had already
 *      deactivated the whole section, so any throw mid-loop committed the deactivations
 *      and silently dropped the evidences after it;
 *   2. only then can the save refuse the evidence whose file did not become private,
 *      instead of recording a confidentiality that was never achieved.
 */
describe('EvidencesService — confidentiality of an uploaded file', () => {
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
  const mockResultRepository = { getResultById: jest.fn(), update: jest.fn() };
  const mockVersionRepository = { getBaseVersion: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EvidencesService,
        { provide: EvidencesRepository, useValue: mockEvidencesRepository },
        { provide: ResultRepository, useValue: mockResultRepository },
        { provide: VersionRepository, useValue: mockVersionRepository },
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
        { provide: SharePointService, useValue: mockSharePointService },
        {
          provide: EvidenceSharepointRepository,
          useValue: mockEvidenceSharepointRepository,
        },
        {
          provide: MQAPService,
          useValue: { getDataFromCGSpaceHandle: jest.fn() },
        },
        {
          provide: HandlersError,
          useValue: { returnErrorRes: jest.fn(({ error }) => ({ error })) },
        },
      ],
    }).compile();

    service = module.get<EvidencesService>(EvidencesService);
    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('saveSPData — refusing a confidentiality that was not achieved', () => {
    const evidence: any = {
      id: 500,
      is_sharepoint: true,
      is_public_file: false,
      sp_document_id: 'DOC-1',
      sp_file_name: 'result-9075-Document.pdf',
      sp_folder_path: '/Reporting 2026/Result 9075',
      link: 'https://sharepoint/old-public-link',
    };

    beforeEach(() => {
      // an existing row that was PUBLIC, so the gate opens and SharePoint is called
      mockEvidenceSharepointRepository.findOne.mockResolvedValue({
        id: 77,
        document_id: 'DOC-1',
        is_public_file: true,
      });
    });

    it('refuses when an anonymous permission survived, and says what to do', async () => {
      mockSharePointService.addFileAccess.mockResolvedValue({
        link: { webUrl: 'https://sharepoint/new-link' },
        revocation: {
          attempted: 1,
          outcomes: [{ permissionId: 'p-anon', ok: true, status: 204 }],
          survivors: ['p-anon'],
          publicSurvivors: ['p-anon'],
          verifiedPrivate: false,
          readBackFailed: false,
        },
      });

      await expect(service.saveSPData(evidence, 500)).rejects.toThrow(
        /cannot be made confidential/i,
      );
      // and the row is NOT written with a confidentiality that is not real
      expect(mockEvidenceSharepointRepository.save).not.toHaveBeenCalled();
    });

    it('refuses when the permissions could not be read back — never assumes private', async () => {
      mockSharePointService.addFileAccess.mockResolvedValue({
        link: { webUrl: 'https://sharepoint/new-link' },
        revocation: {
          attempted: 1,
          outcomes: [{ permissionId: 'p-anon', ok: true, status: 204 }],
          survivors: [],
          publicSurvivors: [],
          verifiedPrivate: false,
          readBackFailed: true,
        },
      });

      await expect(service.saveSPData(evidence, 500)).rejects.toThrow(
        /did not answer/i,
      );
    });

    it('saves normally when the file really did become private', async () => {
      mockSharePointService.addFileAccess.mockResolvedValue({
        link: { webUrl: 'https://sharepoint/new-private-link' },
        revocation: {
          attempted: 1,
          outcomes: [{ permissionId: 'p-anon', ok: true, status: 204 }],
          survivors: ['p-org'],
          publicSurvivors: [],
          verifiedPrivate: true,
          readBackFailed: false,
        },
      });

      await service.saveSPData(evidence, 500);

      expect(mockEvidencesRepository.update).toHaveBeenCalledWith(500, {
        link: 'https://sharepoint/new-private-link',
      });
      expect(mockEvidenceSharepointRepository.save).toHaveBeenCalled();
    });

    it('never refuses when the reporter asked for PUBLIC — there is nothing to protect', async () => {
      mockEvidenceSharepointRepository.findOne.mockResolvedValue({
        id: 77,
        document_id: 'DOC-1',
        is_public_file: false,
      });
      mockSharePointService.addFileAccess.mockResolvedValue({
        link: { webUrl: 'https://sharepoint/public-link' },
        revocation: {
          attempted: 1,
          outcomes: [{ permissionId: 'p-org', ok: false, status: 403 }],
          survivors: ['p-org'],
          publicSurvivors: [],
          verifiedPrivate: false,
          readBackFailed: false,
        },
      });

      await service.saveSPData({ ...evidence, is_public_file: true }, 500);

      expect(mockEvidenceSharepointRepository.save).toHaveBeenCalled();
    });
  });

  describe('saveSPData — a file with no visibility answer', () => {
    it('refuses when the file is there and the public/confidential question is unanswered', async () => {
      mockEvidenceSharepointRepository.findOne.mockResolvedValue(undefined);

      await expect(
        service.saveSPData(
          {
            id: 600,
            is_sharepoint: true,
            is_public_file: null,
            sp_document_id: 'DOC-NEW',
            sp_file_name: 'result-9075-Document.pdf',
          } as any,
          600,
        ),
      ).rejects.toThrow(/answer whether this file can be shared publicly/i);

      // and SharePoint was never called, so nothing was half-done
      expect(mockSharePointService.addFileAccess).not.toHaveBeenCalled();
    });

    it('refuses when the answer is undefined too, not only null', async () => {
      mockEvidenceSharepointRepository.findOne.mockResolvedValue(undefined);

      await expect(
        service.saveSPData(
          {
            id: 601,
            is_sharepoint: true,
            sp_document_id: 'DOC-NEW',
          } as any,
          601,
        ),
      ).rejects.toThrow(/answer whether this file can be shared publicly/i);
    });

    it('🛑 still saves a half-filled evidence whose file is not uploaded yet', async () => {
      mockEvidenceSharepointRepository.findOne.mockResolvedValue(undefined);
      mockSharePointService.addFileAccess.mockResolvedValue({
        link: { webUrl: 'https://sharepoint/link' },
        revocation: {
          attempted: 0,
          outcomes: [],
          survivors: [],
          publicSurvivors: [],
          verifiedPrivate: true,
          readBackFailed: false,
        },
      });

      // The user switched the source to "Upload file" and saved before picking a file.
      // There is no document, so there is nothing to decide the visibility of yet.
      await expect(
        service.saveSPData(
          { id: 602, is_sharepoint: true, is_public_file: null } as any,
          602,
        ),
      ).resolves.not.toThrow();
    });

    it('does not interfere with a link-only evidence', async () => {
      mockEvidenceSharepointRepository.findOne.mockResolvedValue(undefined);

      // Bilateral and innovation-dev both send is_public_file: null when the user picks
      // "Link" as the source — is_sharepoint is false there, so this must never fire.
      await expect(
        service.saveSPData(
          {
            id: 603,
            is_sharepoint: false,
            is_public_file: null,
            link: 'https://example.org/evidence',
          } as any,
          603,
        ),
      ).resolves.not.toThrow();
    });

    it('lets a stored answer satisfy the check when the payload omits it', async () => {
      mockEvidenceSharepointRepository.findOne.mockResolvedValue({
        id: 78,
        document_id: 'DOC-OLD',
        is_public_file: false,
      });
      mockSharePointService.addFileAccess.mockResolvedValue({
        link: { webUrl: 'https://sharepoint/link' },
        revocation: {
          attempted: 0,
          outcomes: [],
          survivors: [],
          publicSurvivors: [],
          verifiedPrivate: true,
          readBackFailed: false,
        },
      });

      await expect(
        service.saveSPData(
          { id: 604, is_sharepoint: true, sp_evidence_id: 78 } as any,
          604,
        ),
      ).resolves.not.toThrow();
    });
  });

  describe('_processMainEvidencesOnCreate — one bad evidence must not cost the others', () => {
    it('saves every evidence it can and only then reports the ones it could not', async () => {
      const failing = {
        link: 'https://example.org/breaks',
        is_sharepoint: false,
      };
      const fine1 = { link: 'https://example.org/ok-1', is_sharepoint: false };
      const fine2 = { link: 'https://example.org/ok-2', is_sharepoint: false };

      mockEvidencesRepository.updateEvidences.mockResolvedValue(undefined);
      const saved: string[] = [];
      jest
        .spyOn(service as any, '_upsertEvidenceItemV1')
        .mockImplementation(async (...args: any[]) => {
          const evidence = args[1];
          if (evidence.link.endsWith('breaks')) {
            throw new Error('SharePoint said no');
          }
          saved.push(evidence.link);
        });

      await expect(
        (service as any)._processMainEvidencesOnCreate(
          { result_id: 1, evidences: [fine1, failing, fine2] },
          { id: 1 },
          user,
          1,
        ),
      ).rejects.toThrow(/The rest of the section was saved/);

      // 🛑 The evidence AFTER the failing one must have been saved. Before the guard it
      // was silently dropped, with the section's deactivations already committed.
      expect(saved).toEqual([
        'https://example.org/ok-1',
        'https://example.org/ok-2',
      ]);
    });

    it('reports every failure, not just the first', async () => {
      mockEvidencesRepository.updateEvidences.mockResolvedValue(undefined);
      jest
        .spyOn(service as any, '_upsertEvidenceItemV1')
        .mockRejectedValue(new Error('nope'));

      await expect(
        (service as any)._processMainEvidencesOnCreate(
          {
            result_id: 1,
            evidences: [
              { link: 'https://example.org/a', is_sharepoint: false },
              { link: 'https://example.org/b', is_sharepoint: false },
            ],
          },
          { id: 1 },
          user,
          1,
        ),
      ).rejects.toThrow(/2 pieces of evidence were not/);
    });

    it('stays silent when everything saves', async () => {
      mockEvidencesRepository.updateEvidences.mockResolvedValue(undefined);
      jest
        .spyOn(service as any, '_upsertEvidenceItemV1')
        .mockResolvedValue(undefined);

      await expect(
        (service as any)._processMainEvidencesOnCreate(
          {
            result_id: 1,
            evidences: [
              { link: 'https://example.org/a', is_sharepoint: false },
            ],
          },
          { id: 1 },
          user,
          1,
        ),
      ).resolves.toBeUndefined();
    });
  });
});
