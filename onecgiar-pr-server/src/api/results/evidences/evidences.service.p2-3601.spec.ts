import { Test, TestingModule } from '@nestjs/testing';
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

/**
 * P2-3601 — a rolled-over evidence kept pointing at the PREVIOUS phase's SharePoint
 * document, so a "can this be shared publicly?" change on the new copy rewrote the
 * permission of the file the previous phase was still serving.
 *
 * Two things were wrong inside `replicateSPFiles`, and the whole suite was green with
 * both of them alive because the loop never iterated once: the call sat inside the
 * phase-change transaction (`versioning.service.ts`) and read through the repository's
 * own non-transactional EntityManager, so `getEvidencesByResultId` returned [].
 *
 * These tests exercise the loop body directly, which is the part no test ever reached:
 *   1. the new document id / folder path have to be persisted on the NEW phase's
 *      `evidence_sharepoint` row — `evidence_sharepoint.replicate` copies both verbatim
 *      from the previous phase, and this method used to compute the new id and drop it,
 *      writing only `evidence.link`. That is the actual mechanism of the reported bug:
 *      `saveSPData` resolves the document to touch as
 *      `sp_document_id ?? evidenceSharepoint.document_id`, i.e. the field nobody rewrote.
 *   2. the `evidence` update has to be addressed by id. It used to pass the raw SQL row
 *      as TypeORM criteria, and that row carries `sp_evidence_id` / `sp_document_id` /
 *      `sp_file_name` / `sp_folder_path` / `is_public_file`, none of which exist on the
 *      Evidence entity.
 */
describe('EvidencesService.replicateSPFiles — P2-3601', () => {
  let service: EvidencesService;

  const mockEvidencesRepository = {
    getEvidencesByResultId: jest.fn(),
    update: jest.fn(),
  };

  const mockSharePointService = {
    generateFilePath: jest.fn(),
    replicateFile: jest.fn(),
    addFileAccess: jest.fn(),
  };

  const mockEvidenceSharepointRepository = {
    update: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  /** The shape `getEvidencesByResultId` really returns: a raw row, aliased. */
  const rolledOverRow = (over: Record<string, unknown> = {}) => ({
    id: 12789,
    sp_evidence_id: 493,
    sp_document_id: 'DOC-FROM-2025',
    sp_file_name: 'result-8552-Document-202606101851-491.pdf',
    sp_folder_path: '/Reporting 2025/Result 8552',
    is_public_file: 1,
    is_sharepoint: 1,
    link: 'https://cgiar.sharepoint.com/:b:/s/repo/OLD-LINK',
    result_id: 11034,
    ...over,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EvidencesService,
        { provide: EvidencesRepository, useValue: mockEvidencesRepository },
        { provide: ResultRepository, useValue: { getResultById: jest.fn() } },
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
        { provide: SharePointService, useValue: mockSharePointService },
        {
          provide: EvidenceSharepointRepository,
          useValue: mockEvidenceSharepointRepository,
        },
        {
          provide: MQAPService,
          useValue: { getDataFromCGSpaceHandle: jest.fn() },
        },
        { provide: HandlersError, useValue: { returnErrorRes: jest.fn() } },
      ],
    }).compile();

    service = module.get<EvidencesService>(EvidencesService);
    jest.clearAllMocks();

    mockSharePointService.generateFilePath.mockResolvedValue({
      filePath: '/Reporting 2026/Result 8552',
    });
    mockSharePointService.replicateFile.mockResolvedValue('DOC-FOR-2026');
    mockSharePointService.addFileAccess.mockResolvedValue({
      link: { webUrl: 'https://cgiar.sharepoint.com/:b:/s/repo/NEW-LINK' },
    });
  });

  it('persists the NEW document id on the new phase evidence_sharepoint row', async () => {
    mockEvidencesRepository.getEvidencesByResultId.mockResolvedValue([
      rolledOverRow(),
    ]);

    await service.replicateSPFiles({ new_result_id: 11034 });

    expect(mockEvidenceSharepointRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 493, document_id: 'DOC-FOR-2026' }),
    );
  });

  it('persists the NEW folder path, so the row stops claiming it lives in the previous phase', async () => {
    mockEvidencesRepository.getEvidencesByResultId.mockResolvedValue([
      rolledOverRow(),
    ]);

    await service.replicateSPFiles({ new_result_id: 11034 });

    expect(mockEvidenceSharepointRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 493,
        folder_path: '/Reporting 2026/Result 8552',
      }),
    );
  });

  it('copies the source document of the PREVIOUS phase, not the one it is about to write', async () => {
    mockEvidencesRepository.getEvidencesByResultId.mockResolvedValue([
      rolledOverRow(),
    ]);

    await service.replicateSPFiles({ new_result_id: 11034 });

    expect(mockSharePointService.replicateFile).toHaveBeenCalledWith(
      'DOC-FROM-2025',
      '/Reporting 2026/Result 8552',
    );
  });

  it('addresses the evidence update by id, never by the raw SQL row', async () => {
    mockEvidencesRepository.getEvidencesByResultId.mockResolvedValue([
      rolledOverRow(),
    ]);

    await service.replicateSPFiles({ new_result_id: 11034 });

    expect(mockEvidencesRepository.update).toHaveBeenCalledWith(12789, {
      link: 'https://cgiar.sharepoint.com/:b:/s/repo/NEW-LINK',
    });
    // The raw row carries columns the Evidence entity does not have; passing it as
    // criteria makes TypeORM throw EntityPropertyNotFoundError on the first evidence.
    const criteria = mockEvidencesRepository.update.mock.calls[0][0];
    expect(typeof criteria).not.toBe('object');
  });

  it('does not write anything when SharePoint returns no usable link', async () => {
    mockEvidencesRepository.getEvidencesByResultId.mockResolvedValue([
      rolledOverRow(),
    ]);
    // addFileAccess swallows its own HTTP errors and resolves with the raw Error
    // instead of rejecting — see the guard `saveSPData` already carries.
    mockSharePointService.addFileAccess.mockResolvedValue({
      message: 'Graph permission call failed',
    });

    await service.replicateSPFiles({ new_result_id: 11034 });

    expect(mockEvidencesRepository.update).not.toHaveBeenCalled();
    expect(mockEvidenceSharepointRepository.save).not.toHaveBeenCalled();
  });

  it('leaves rows that are not SharePoint files alone', async () => {
    mockEvidencesRepository.getEvidencesByResultId.mockResolvedValue([
      rolledOverRow({ is_sharepoint: 0, sp_evidence_id: null }),
    ]);

    await service.replicateSPFiles({ new_result_id: 11034 });

    expect(mockSharePointService.replicateFile).not.toHaveBeenCalled();
    expect(mockEvidencesRepository.update).not.toHaveBeenCalled();
    expect(mockEvidenceSharepointRepository.save).not.toHaveBeenCalled();
  });

  it('keeps going with the remaining evidences when one of them fails', async () => {
    mockEvidencesRepository.getEvidencesByResultId.mockResolvedValue([
      rolledOverRow({ id: 12789, sp_evidence_id: 493 }),
      rolledOverRow({
        id: 12790,
        sp_evidence_id: 494,
        sp_document_id: 'DOC-2-FROM-2025',
      }),
    ]);
    mockSharePointService.replicateFile
      .mockRejectedValueOnce(new Error('Graph timeout'))
      .mockResolvedValueOnce('DOC-2-FOR-2026');

    await service.replicateSPFiles({ new_result_id: 11034 });

    // The first one blew up; the second must still have been copied and persisted.
    expect(mockEvidenceSharepointRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 494, document_id: 'DOC-2-FOR-2026' }),
    );
  });
});
