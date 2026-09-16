import { Readable } from 'node:stream';
import { BilateralAiEvidenceTransferService } from './bilateral-ai-evidence-transfer.service';
import { DraftEvidenceSourceType } from '../entities/draft-evidence.entity';

/**
 * `ADE-T-4` (`docs/specs/bilateral/ai-draft-evidence-promotion/tasks.md`). Every test name below
 * is picked to be traceable 1:1 to the clause-level coverage table in that task entry — see the
 * Implementer's completion report for the mapping.
 */
describe('BilateralAiEvidenceTransferService (unit)', () => {
  const emptyStream = () =>
    new Readable({
      read() {
        this.push(null);
      },
    });

  const makeRow = (overrides: Record<string, any> = {}) => ({
    id: 1,
    draft_id: 5,
    source_type: DraftEvidenceSourceType.DOCUMENT,
    object_key: 'prms/bilateral-ai/job-1/uuid-report.pdf',
    file_name: 'report.pdf',
    mime_type: null,
    file_size: 1000,
    is_formal_evidence: true,
    file_management_reference: null,
    is_active: true,
    created_date: new Date('2026-09-16T00:00:00Z'),
    ...overrides,
  });

  const makeService = () => {
    const draftEvidenceRepository = {
      find: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    const fileStorage = {
      getObjectStream: jest.fn().mockResolvedValue({
        stream: emptyStream(),
        size: 1000,
      }),
    };
    const sharePointService = {
      uploadFromStream: jest.fn().mockResolvedValue({
        id: 'sp-doc-1',
        name: 'result-9046-Document-x-1.pdf',
      }),
      generateFilePath: jest
        .fn()
        .mockResolvedValue({ filePath: '/Phase/Result 9046' }),
    };
    let nextEvidenceId = 900;
    const evidencesRepository = {
      save: jest.fn(async (e: any) => ({ ...e, id: nextEvidenceId++ })),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    const evidencesService = {
      saveSPData: jest.fn().mockResolvedValue(undefined),
    };

    const service = new BilateralAiEvidenceTransferService(
      draftEvidenceRepository as any,
      fileStorage as any,
      sharePointService as any,
      evidencesRepository as any,
      evidencesService as any,
    );

    return {
      service,
      stubs: {
        draftEvidenceRepository,
        fileStorage,
        sharePointService,
        evidencesRepository,
        evidencesService,
      },
    };
  };

  // ADE-AC-1 — THEN one active row, SharePoint-backed / AND IT MUST be stored not public,
  // explicit, not null.
  it('attaches a qualifying document as evidence bound to the promoted result, explicitly not public (ADE-AC-1)', async () => {
    const { service, stubs } = makeService();
    stubs.draftEvidenceRepository.find.mockResolvedValue([makeRow()]);

    const outcomes = await service.transferForDraft(5, 100, 42);

    expect(outcomes).toEqual([
      { draftEvidenceId: 1, fileName: 'report.pdf', outcome: 'transferred' },
    ]);
    expect(stubs.evidencesRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        result_id: 100,
        is_sharepoint: 1,
        evidence_type_id: 1,
      }),
    );
    const spPayload = stubs.evidencesService.saveSPData.mock.calls[0][0];
    // Strict equality, not `.toBeFalsy()` — a `null` (unanswered) value must fail this
    // assertion, because `null` is exactly what the platform's own confidentiality guard
    // rejects (`evidences.service.ts:447-458`).
    expect(spPayload.is_public_file).toBe(false);
    expect(spPayload.is_public_file).not.toBeNull();
  });

  // ADE-AC-1 — AND IT MUST be bound to the promoted draft's result, not a sibling's.
  it('scopes strictly to the passed draftId/resultId — a sibling draft never sees this result (ADE-AC-1 sibling isolation)', async () => {
    const { service, stubs } = makeService();
    stubs.draftEvidenceRepository.find.mockResolvedValue([
      makeRow({ draft_id: 5 }),
    ]);

    await service.transferForDraft(5, 100, 42);

    expect(stubs.draftEvidenceRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({ where: { draft_id: 5, is_active: true } }),
    );
    expect(stubs.evidencesRepository.save).toHaveBeenCalledTimes(1);
    expect(stubs.evidencesRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ result_id: 100 }),
    );
    // A sibling draft of the same job (e.g. id 6, its own result 200) is never queried or
    // written by this call — only the `draft_id: 5` / `result_id: 100` this call was given.
    expect(stubs.evidencesRepository.save).not.toHaveBeenCalledWith(
      expect.objectContaining({ result_id: 200 }),
    );
  });

  // ADE-AC-2 (integration half — the predicate itself is ADE-T-1's job): only the qualifying
  // document among a mixed-source draft is ever transferred.
  it('only transfers the qualifying document among mixed sources (ADE-AC-2 integration)', async () => {
    const { service, stubs } = makeService();
    stubs.draftEvidenceRepository.find.mockResolvedValue([
      makeRow({ id: 1, file_name: 'report.pdf' }),
      makeRow({ id: 2, file_name: 'notes.txt' }),
      makeRow({
        id: 3,
        source_type: DraftEvidenceSourceType.VOICE_NOTE,
        file_name: 'voice-note.m4a',
      }),
      makeRow({
        id: 4,
        source_type: DraftEvidenceSourceType.TEXT_CONTEXT,
        file_name: null,
      }),
    ]);

    const outcomes = await service.transferForDraft(5, 100, 42);

    expect(outcomes).toEqual([
      { draftEvidenceId: 1, fileName: 'report.pdf', outcome: 'transferred' },
    ]);
    expect(stubs.fileStorage.getObjectStream).toHaveBeenCalledTimes(1);
    expect(stubs.evidencesRepository.save).toHaveBeenCalledTimes(1);
  });

  // ADE-AC-3 — THEN the failure is recorded / AND IT MUST NOT leave a half-written evidence row.
  // The natural "file management unavailable" case: the very first Graph call fails, before any
  // evidence row was ever created.
  it('a failing SharePoint upload leaves 0 evidence rows, records the failure and does not throw (ADE-AC-3)', async () => {
    const { service, stubs } = makeService();
    stubs.draftEvidenceRepository.find.mockResolvedValue([makeRow()]);
    stubs.sharePointService.uploadFromStream.mockRejectedValue(
      new Error(
        'SharePoint Graph call timed out after 30000ms (createUploadSession)',
      ),
    );

    const outcomes = await service.transferForDraft(5, 100, 42);

    expect(outcomes).toEqual([
      {
        draftEvidenceId: 1,
        fileName: 'report.pdf',
        outcome: 'failed',
        errorMessage:
          'SharePoint Graph call timed out after 30000ms (createUploadSession)',
      },
    ]);
    expect(stubs.evidencesRepository.save).not.toHaveBeenCalled();
    expect(stubs.evidencesService.saveSPData).not.toHaveBeenCalled();
    expect(stubs.draftEvidenceRepository.update).not.toHaveBeenCalled();
  });

  // ADE-AC-3 falsifying input, per tasks.md: a `saveSPData` stub that throws (the DD-4
  // confidentiality refusal) — a *real* runtime outcome, not hypothetical. Proves the per-document
  // `try` is around ONE document, not the whole loop, and that the compensating soft delete
  // (DD-4, AC-7) deactivates the orphaned evidence row rather than hard-deleting it.
  it('a saveSPData refusal (DD-4) is caught per document, deactivates the orphaned evidence row, and does not throw', async () => {
    const { service, stubs } = makeService();
    stubs.draftEvidenceRepository.find.mockResolvedValue([makeRow()]);
    stubs.evidencesService.saveSPData.mockRejectedValue(
      new Error(
        'This file cannot be made confidential: it was shared publicly before and the repository did not remove that access.',
      ),
    );

    const outcomes = await service.transferForDraft(5, 100, 42);

    expect(outcomes).toEqual([
      {
        draftEvidenceId: 1,
        fileName: 'report.pdf',
        outcome: 'failed',
        errorMessage:
          'This file cannot be made confidential: it was shared publicly before and the repository did not remove that access.',
      },
    ]);
    // The evidence row WAS inserted (saveSPData needs its id) — but the refusal must leave no
    // usable trace: DD-4's own promise is "no evidence row", satisfied by deactivation (AC-7),
    // never a hard delete.
    expect(stubs.evidencesRepository.save).toHaveBeenCalledTimes(1);
    expect(stubs.evidencesRepository.update).toHaveBeenCalledWith(900, {
      is_active: 0,
      last_updated_by: 42,
    });
    expect(stubs.evidencesRepository.delete).not.toHaveBeenCalled();
    // The checkpoint is never stamped for a document that never actually attached.
    expect(stubs.draftEvidenceRepository.update).not.toHaveBeenCalled();
  });

  // ADE-AC-4 — AND IT MUST decide from stored state, not an in-memory guard a second process
  // would not see. Two SEPARATE service instances over the same (now-stamped) rows.
  it('does not re-transfer a document already stamped — decided from the stored row, across two separate instances (ADE-AC-4)', async () => {
    const first = makeService();
    first.stubs.draftEvidenceRepository.find.mockResolvedValue([makeRow()]);

    await first.service.transferForDraft(5, 100, 42);
    expect(first.stubs.evidencesRepository.save).toHaveBeenCalledTimes(1);

    // A brand-new service instance (no shared memory with the first) reads the SAME row, now
    // carrying the stamp the first run wrote.
    const second = makeService();
    second.stubs.draftEvidenceRepository.find.mockResolvedValue([
      makeRow({ file_management_reference: 'sp-doc-1' }),
    ]);

    const outcomes = await second.service.transferForDraft(5, 100, 42);

    expect(outcomes).toEqual([]);
    expect(
      second.stubs.sharePointService.uploadFromStream,
    ).not.toHaveBeenCalled();
    expect(second.stubs.evidencesRepository.save).not.toHaveBeenCalled();
  });

  // ADE-AC-5 — THEN documents 1 and 3 attach, 2 does not / AND a subsequent promotion attaches
  // only 2 / AND IT MUST NOT re-attach or duplicate 1 and 3.
  it('a partial failure commits documents 1 and 3 independently; a re-run attaches only 2, without duplicating 1 or 3 (ADE-AC-5)', async () => {
    const { service, stubs } = makeService();
    const doc1 = makeRow({ id: 1, file_name: 'doc1.pdf' });
    const doc2 = makeRow({ id: 2, file_name: 'doc2.pdf' });
    const doc3 = makeRow({ id: 3, file_name: 'doc3.pdf' });
    stubs.draftEvidenceRepository.find.mockResolvedValue([doc1, doc2, doc3]);
    stubs.sharePointService.uploadFromStream.mockImplementation(
      async (_resultId: string, fileName: string) => {
        if (fileName === 'doc2.pdf') {
          throw new Error('Graph refused doc2');
        }
        return { id: `sp-${fileName}`, name: fileName };
      },
    );

    const firstRun = await service.transferForDraft(5, 100, 42);

    expect(firstRun.filter((o) => o.outcome === 'transferred')).toHaveLength(2);
    expect(firstRun.find((o) => o.draftEvidenceId === 2)?.outcome).toBe(
      'failed',
    );
    expect(stubs.evidencesRepository.save).toHaveBeenCalledTimes(2);
    // The stamp is what the next run reads — reflect it on the rows exactly as the checkpoint
    // update would have left them.
    const stampedDoc1 = { ...doc1, file_management_reference: 'sp-doc1.pdf' };
    const stampedDoc3 = { ...doc3, file_management_reference: 'sp-doc3.pdf' };
    stubs.draftEvidenceRepository.find.mockResolvedValue([
      stampedDoc1,
      doc2,
      stampedDoc3,
    ]);
    // The retry: whatever made Graph refuse doc2 the first time is gone now.
    stubs.sharePointService.uploadFromStream.mockResolvedValue({
      id: 'sp-doc2.pdf',
      name: 'doc2.pdf',
    });

    const secondRun = await service.transferForDraft(5, 100, 42);

    expect(secondRun).toEqual([
      { draftEvidenceId: 2, fileName: 'doc2.pdf', outcome: 'transferred' },
    ]);
    // Exactly 3 evidence rows total across both runs — 2 (first run) + 1 (second run) — never a
    // duplicate for document 1 or 3.
    expect(stubs.evidencesRepository.save).toHaveBeenCalledTimes(3);
  });

  // ADE-AC-7 — AND IT MUST use the same code path, no AI-specific branch: prove `saveSPData`
  // itself is the collaborator invoked, not a forked local implementation.
  it('reuses EvidencesService.saveSPData verbatim — no forked local implementation (ADE-AC-7)', async () => {
    const { service, stubs } = makeService();
    stubs.draftEvidenceRepository.find.mockResolvedValue([makeRow()]);

    await service.transferForDraft(5, 100, 42);

    expect(stubs.evidencesService.saveSPData).toHaveBeenCalledTimes(1);
    expect(stubs.evidencesService.saveSPData).toHaveBeenCalledWith(
      expect.objectContaining({
        sp_document_id: 'sp-doc-1',
        sp_file_name: 'result-9046-Document-x-1.pdf',
      }),
      900,
    );
  });

  // DD-6 — the checkpoint is stamped LAST: only after saveSPData has resolved.
  it('stamps file_management_reference only after saveSPData resolves (DD-6 ordering)', async () => {
    const { service, stubs } = makeService();
    stubs.draftEvidenceRepository.find.mockResolvedValue([makeRow()]);

    await service.transferForDraft(5, 100, 42);

    const saveSPDataOrder =
      stubs.evidencesService.saveSPData.mock.invocationCallOrder[0];
    const stampOrder =
      stubs.draftEvidenceRepository.update.mock.invocationCallOrder[0];
    expect(saveSPDataOrder).toBeLessThan(stampOrder);
    expect(stubs.draftEvidenceRepository.update).toHaveBeenCalledWith(1, {
      file_management_reference: 'sp-doc-1',
    });
  });

  // "The service never throws — asserted, not assumed." Two independent faults: the initial
  // selection query itself throwing, and a per-document fault whose message is not an Error
  // instance.
  describe('never throws', () => {
    it('resolves (not rejects) when the initial draft-evidence query itself throws', async () => {
      const { service, stubs } = makeService();
      stubs.draftEvidenceRepository.find.mockRejectedValue(
        new Error('connection reset'),
      );

      await expect(service.transferForDraft(5, 100, 42)).resolves.toEqual([]);
    });

    it('resolves and records a string outcome when a rejected step throws a non-Error value', async () => {
      const { service, stubs } = makeService();
      stubs.draftEvidenceRepository.find.mockResolvedValue([makeRow()]);
      stubs.sharePointService.uploadFromStream.mockRejectedValue(
        'graph exploded',
      );

      const outcomes = await service.transferForDraft(5, 100, 42);

      expect(outcomes).toEqual([
        {
          draftEvidenceId: 1,
          fileName: 'report.pdf',
          outcome: 'failed',
          errorMessage: 'graph exploded',
        },
      ]);
    });

    // `ADE-T-2` amendment — the one compound path the tests above do not exercise: the
    // compensating write ITSELF rejects. The ORIGINAL `saveSPData` error (the DD-4 confidentiality
    // refusal) must still be what `outcomes[].errorMessage` carries, never the compensation's own
    // DB error, and the service must still resolve rather than throw. The compensation's failure
    // is only logged, separately, without a secret.
    it('when the compensating deactivation also rejects, the ORIGINAL saveSPData error still surfaces and the compensation failure is only logged', async () => {
      const { service, stubs } = makeService();
      stubs.draftEvidenceRepository.find.mockResolvedValue([makeRow()]);
      const originalError = new Error(
        'This file cannot be made confidential: it was shared publicly before and the repository did not remove that access.',
      );
      stubs.evidencesService.saveSPData.mockRejectedValue(originalError);
      stubs.evidencesRepository.update.mockRejectedValue(
        new Error('DB connection lost while deactivating evidence'),
      );
      const warnSpy = jest.spyOn((service as any).logger, 'warn');

      const outcomes = await service.transferForDraft(5, 100, 42);

      // The service still does not throw.
      expect(outcomes).toEqual([
        {
          draftEvidenceId: 1,
          fileName: 'report.pdf',
          outcome: 'failed',
          errorMessage: originalError.message,
        },
      ]);
      const lines = warnSpy.mock.calls.map((call) => call[0] as string);
      // The per-document outcome line still carries the ORIGINAL error, not the UPDATE's.
      expect(
        lines.some(
          (line) =>
            line.includes('draftEvidenceId=1') &&
            line.includes(originalError.message),
        ),
      ).toBe(true);
      // The compensation's own failure is logged separately, naming the evidence id, with no
      // secret (AC-9).
      expect(
        lines.some(
          (line) =>
            line.includes('evidenceId=900') &&
            line.includes('DB connection lost while deactivating evidence'),
        ),
      ).toBe(true);
      lines.forEach((line) => {
        expect(line).not.toMatch(/https?:\/\//);
        expect(line).not.toMatch(/token/i);
      });
    });
  });

  // ADE-AC-3 "BUT it must NOT surface a secret" is a grep gate over this task's added log
  // statements (see the Implementer's completion report for the exact `git diff | grep` output);
  // this test pins the *content* of what actually gets logged so the grep has something to check.
  it('logs only draftId/resultId/draftEvidenceId/fileName/outcome/error-message — never a URL or token (ADE-R-8, AC-9)', async () => {
    const { service, stubs } = makeService();
    stubs.draftEvidenceRepository.find.mockResolvedValue([makeRow()]);
    stubs.sharePointService.uploadFromStream.mockRejectedValue(
      new Error('timed out'),
    );
    const warnSpy = jest.spyOn((service as any).logger, 'warn');

    await service.transferForDraft(5, 100, 42);

    expect(warnSpy).toHaveBeenCalledTimes(1);
    const line = warnSpy.mock.calls[0][0] as string;
    expect(line).toContain('draftId=5');
    expect(line).toContain('resultId=100');
    expect(line).toContain('draftEvidenceId=1');
    expect(line).toContain('report.pdf');
    expect(line).not.toMatch(/https?:\/\//);
    expect(line).not.toMatch(/token/i);
  });
});
