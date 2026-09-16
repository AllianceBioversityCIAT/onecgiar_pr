// @akili-spec docs/specs/bilateral/ai-draft-evidence-promotion
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DraftEvidence } from '../entities/draft-evidence.entity';
import { isQualifyingEvidenceDocument } from '../constants/evidence-formats.constant';
import { BilateralAiFileStorageService } from './bilateral-ai-file-storage.service';
import { SharePointService } from '../../../shared/services/share-point/share-point.service';
import { EvidencesRepository } from '../../results/evidences/evidences.repository';
import { EvidencesService } from '../../results/evidences/evidences.service';
import { Evidence } from '../../results/evidences/entities/evidence.entity';
import { EvidencesCreateInterface } from '../../results/evidences/dto/create-evidence.dto';

/** One line per document outcome (`ADE-R-8`, `ADE-QAS-6`) — never a secret, token or URL. */
export type EvidenceTransferOutcomeStatus = 'transferred' | 'failed';

export interface EvidenceTransferOutcome {
  draftEvidenceId: number;
  fileName: string | null;
  outcome: EvidenceTransferOutcomeStatus;
  errorMessage?: string;
}

/**
 * `ADE-T-4` (`design.md` §7.1) — the transfer step `promoteDraft` calls once, after the
 * `status_id` write (`design.md` §3.1). Selects the promoted draft's qualifying, not-yet-
 * transferred document rows (`ADE-T-1`'s predicate — `source_type = DOCUMENT` AND an allowlisted
 * extension AND no `file_management_reference` yet, `DD-5`) and transfers them sequentially and
 * independently: S3 → SharePoint (`ADE-T-3`'s `uploadFromStream`, bounded by its own DD-3
 * timeout) → an ordinary `evidence` row → `EvidencesService.saveSPData` (reused unchanged, `DD-4`)
 * → the `file_management_reference` checkpoint, stamped LAST (`DD-6`).
 *
 * Never throws (`ADE-R-5`): the row selection and every per-document transfer are each wrapped so
 * a fault degrades to "this document did not attach" instead of failing the promotion that called
 * this method. `ADE-R-9`: one document's failure never rolls back or blocks another's success.
 */
@Injectable()
export class BilateralAiEvidenceTransferService {
  private readonly logger = new Logger(BilateralAiEvidenceTransferService.name);

  constructor(
    @InjectRepository(DraftEvidence)
    private readonly draftEvidenceRepository: Repository<DraftEvidence>,
    private readonly fileStorage: BilateralAiFileStorageService,
    private readonly sharePointService: SharePointService,
    private readonly evidencesRepository: EvidencesRepository,
    private readonly evidencesService: EvidencesService,
  ) {}

  /**
   * `draftId` and `resultId` are the caller's own already-loaded values (`promoteDraft`'s
   * `draft.id` / `draft.result_id`) — never re-derived here — so a sibling draft of the same job
   * can never be the one that gets attached to (`ADE-AC-1`'s sibling-isolation clause).
   */
  async transferForDraft(
    draftId: number,
    resultId: number,
    userId: number,
  ): Promise<EvidenceTransferOutcome[]> {
    let rows: DraftEvidence[];
    try {
      rows = await this.draftEvidenceRepository.find({
        where: { draft_id: draftId, is_active: true },
        order: { created_date: 'ASC' },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `AI evidence transfer could not load draft evidence (draftId=${draftId}, resultId=${resultId}): ${message}`,
      );
      return [];
    }

    const outcomes: EvidenceTransferOutcome[] = [];

    for (const row of rows) {
      if (!isQualifyingEvidenceDocument(row)) continue;
      // ADE-R-4 — the idempotency checkpoint. Read from the stored row, never an in-memory set,
      // so a second process (a retry, a redelivery) sees exactly what this one would (`ADE-AC-4`).
      if (row.file_management_reference) continue;

      try {
        await this.transferOne(row, resultId, userId);
        outcomes.push({
          draftEvidenceId: row.id,
          fileName: row.file_name,
          outcome: 'transferred',
        });
        this.logger.log(
          `AI evidence transfer succeeded (draftId=${draftId}, resultId=${resultId}, draftEvidenceId=${row.id}, fileName=${row.file_name}).`,
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        outcomes.push({
          draftEvidenceId: row.id,
          fileName: row.file_name,
          outcome: 'failed',
          errorMessage: message,
        });
        // AC-9 / .cursorrules — draftId, resultId, draftEvidenceId, fileName, outcome and the
        // error's own message only. Never the S3 signed URL, the Graph upload-session URL, the
        // sharing link, or a token: none of those identifiers are ever assembled into this line.
        this.logger.warn(
          `AI evidence transfer failed (draftId=${draftId}, resultId=${resultId}, draftEvidenceId=${row.id}, fileName=${row.file_name}): ${message}`,
        );
      }
    }

    return outcomes;
  }

  /**
   * One document, `design.md` §3.2's exact order: stream the object, upload it, create the
   * ordinary `evidence` row, hand it to `saveSPData` (the same path a manual upload follows —
   * `ADE-AC-7`), then stamp the checkpoint last (`DD-6`). Any step throwing aborts only this
   * document — the caller's `try` isolates it (`ADE-R-9`).
   */
  private async transferOne(
    row: DraftEvidence,
    resultId: number,
    userId: number,
  ): Promise<void> {
    const { stream, size } = await this.fileStorage.getObjectStream(
      row.object_key,
    );

    const uploaded = await this.sharePointService.uploadFromStream(
      String(resultId),
      row.file_name,
      stream,
      size,
    );

    // Same folder convention every manual evidence resolves against (`design.md` §5); read
    // through the existing public method rather than recomputing the path by hand.
    const { filePath } = await this.sharePointService.generateFilePath(
      String(resultId),
    );

    const evidence = new Evidence();
    evidence.result_id = resultId;
    evidence.is_sharepoint = 1;
    evidence.evidence_type_id = 1;
    evidence.is_active = 1;
    evidence.is_supplementary = false;
    evidence.link = '';
    evidence.created_by = userId;
    evidence.last_updated_by = userId;

    const savedEvidence = await this.evidencesRepository.save(evidence);

    // `EvidencesCreateInterface.is_public_file` is typed `number` for the manual-upload form
    // (`0`/`1`), but `ADE-R-3.1` requires the not-public answer stored EXPLICITLY as `false` —
    // never `0` read as merely falsy, never `null`. `saveSPData` only ever compares this value
    // with `??`/`===` against `null`/`undefined` (`evidences.service.ts:446-458`), so the boolean
    // is functionally identical to `0` there; the cast exists to keep that explicit `false` (and
    // not the numeric stand-in) all the way to `ADE-T-4`'s tests.
    const spPayload: EvidencesCreateInterface = {
      id: String(savedEvidence.id),
      link: '',
      is_sharepoint: 1,
      is_public_file: false as unknown as number,
      sp_document_id: uploaded.id,
      sp_file_name: uploaded.name,
      sp_folder_path: filePath,
    };

    try {
      // ADE-AC-7 — the same code path a manually uploaded evidence follows when its answer
      // changes; no bilateral-AI-specific branch (`DD-4`).
      await this.evidencesService.saveSPData(spPayload, savedEvidence.id);
    } catch (error) {
      // DD-4 — a refusal (the confidentiality guard) or any other `saveSPData` fault MUST leave
      // NO usable evidence row, not an orphan with an empty `link` nobody can open (`ADE-AC-3`
      // "nor a half-written evidence row"). The plain `evidence` insert above is compensated here
      // by deactivating it (`AC-7` / `trd.md` W7 — evidence rows are soft-deleted, never hard
      // deleted) so the per-document failure the caller's `try` records is accurate: this
      // document was not attached at all, and every `is_active = 1` read path treats it as if it
      // never existed.
      //
      // `ADE-T-2` amendment (`ADE-R-8`, `ADE-AC-3`): the compensating write is itself unguarded
      // I/O and can reject on its own. If it does, the ORIGINAL `saveSPData` error — a DD-4
      // confidentiality refusal, or any other transfer fault — must still be what the caller's
      // per-document `catch` records in `outcomes[].errorMessage` and the `warn` line, never the
      // compensation's own error. The compensation failure is only logged here, never surfaced in
      // its place, and never with a secret (`AC-9`).
      try {
        await this.evidencesRepository.update(savedEvidence.id, {
          is_active: 0,
          last_updated_by: userId,
        });
      } catch (compensationError) {
        const compensationMessage =
          compensationError instanceof Error
            ? compensationError.message
            : String(compensationError);
        this.logger.warn(
          `AI evidence transfer compensation failed to deactivate evidence (evidenceId=${savedEvidence.id}): ${compensationMessage}`,
        );
      }
      throw error;
    }

    // DD-6 — stamped LAST: a crash before this point leaves the row unstamped (retried next
    // time, at worst an inert orphan file), never a stamped row whose evidence does not exist.
    await this.draftEvidenceRepository.update(row.id, {
      file_management_reference: uploaded.id,
    });
  }
}
