import { Injectable, HttpStatus, Logger } from '@nestjs/common';
import {
  CreateEvidenceDto,
  EvidencesCreateInterface,
} from './dto/create-evidence.dto';
import { EvidenceDto } from '../dto/review-update.dto';
import { EvidencesRepository } from './evidences.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { ResultRepository } from '../result.repository';
import { Evidence } from './entities/evidence.entity';
import { VersionRepository } from '../../versioning/versioning.repository';
import { ResultsKnowledgeProductsRepository } from '../results-knowledge-products/repositories/results-knowledge-products.repository';
import { ResultsInnovationsDevRepository } from '../summary/repositories/results-innovations-dev.repository';
import { Like } from 'typeorm';
import { Result } from '../entities/result.entity';
import { GlobalParameterCacheService } from '../../../shared/services/cache/global-parameter-cache.service';
import { SharePointService } from '../../../shared/services/share-point/share-point.service';
import { EvidenceSharepointRepository } from './repositories/evidence-sharepoint.repository';
import { EvidenceSharepoint } from './entities/evidence-sharepoint.entity';
import { MQAPService } from '../../m-qap/m-qap.service';
import { MQAPBodyDto } from '../../m-qap/dtos/m-qap-body.dto';
import { throwServiceError } from '../../../shared/utils/service-error.util';

@Injectable()
export class EvidencesService {
  constructor(
    private readonly _evidencesRepository: EvidencesRepository,
    private readonly _handlersError: HandlersError,
    private readonly _resultRepository: ResultRepository,
    private readonly _versionRepository: VersionRepository,
    private readonly _resultsKnowledgeProductsRepository: ResultsKnowledgeProductsRepository,
    private readonly _resultsInnovationsDevRepository: ResultsInnovationsDevRepository,
    private readonly _globalParameterCacheService: GlobalParameterCacheService,
    private readonly _sharePointService: SharePointService,
    private readonly _evidenceSharepointRepository: EvidenceSharepointRepository,
    private readonly _mqapService: MQAPService,
  ) {}

  private readonly _logger = new Logger(EvidencesService.name);

  /**
   * The section marks an evidence row can carry, as stored: `tinyint NULL`.
   * P2-3568 made them survive a phase rollover, so every read path has to
   * normalise them — including supplementary evidence, which used to get only
   * the five impact-area ones and would have returned raw 1/0/null for the rest.
   */
  private static readonly EVIDENCE_MARKS = [
    'gender_related',
    'youth_related',
    'nutrition_related',
    'environmental_biodiversity_related',
    'poverty_related',
    'innovation_readiness_related',
    'innovation_use_related',
    'policy_change_related',
    'capacity_sharing_related',
    'other_output_related',
    'other_outcome_related',
    'knowledge_product_metadata_related',
  ] as const;

  private _normalizeEvidenceMarks(rows: any[]): void {
    for (const row of rows ?? []) {
      for (const mark of EvidencesService.EVIDENCE_MARKS) {
        row[mark] = !!row[mark];
      }
    }
  }

  kpUrlRegex =
    /https:\/\/(cgspace\.cgiar\.org\/(items\/[a-f0-9-]+|handle(\/\d+){1,2})|hdl\.handle\.net(\/\d+){1,2})/gm;

  async create(createEvidenceDto: CreateEvidenceDto, user: TokenDto) {
    try {
      const result = await this._resultRepository.getResultById(
        createEvidenceDto.result_id,
      );
      await this._versionRepository.getBaseVersion();
      await this._processMainEvidencesOnCreate(
        createEvidenceDto,
        result,
        user,
        1,
      );

      if (createEvidenceDto?.supplementary) {
        await this._processSupplementaryOnCreate(
          createEvidenceDto,
          result,
          user,
        );
      }

      await this._resultRepository.update(createEvidenceDto.result_id, {
        last_updated_by: user.id,
        last_updated_date: new Date(),
      });

      return {
        response: createEvidenceDto,
        message: 'The data was updated correctly',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  private _assertUniqueLinks(links: string[], message: string): void {
    if (new Set(links).size !== links.length) {
      throwServiceError(message);
    }
  }

  private _applyEvidenceInputFields(
    target: Evidence,
    evidence: EvidencesCreateInterface,
  ): void {
    target.description = evidence?.description ?? null;
    target.gender_related = evidence.gender_related;
    target.is_sharepoint = evidence.is_sharepoint;
    target.youth_related = evidence.youth_related;
    target.nutrition_related = evidence.nutrition_related;
    target.environmental_biodiversity_related =
      evidence.environmental_biodiversity_related;
    target.poverty_related = evidence.poverty_related;
    target.innovation_readiness_related = evidence.innovation_readiness_related;
    target.innovation_use_related = evidence.innovation_use_related;
    target.policy_change_related = evidence.policy_change_related;
    target.capacity_sharing_related = evidence.capacity_sharing_related;
    target.other_output_related = evidence.other_output_related;
    target.other_outcome_related = evidence.other_outcome_related;
    target.knowledge_product_metadata_related =
      evidence.knowledge_product_metadata_related;
    target.link = evidence.link;
  }

  private _handleIdFromEvidenceLink(link: string): string {
    const hasQuery = (link ?? '').indexOf('?');
    const linkSplit = (link ?? '')
      .slice(0, hasQuery > -1 ? hasQuery : link?.length)
      .split('/');
    return linkSplit.slice(linkSplit.length - 2).join('/');
  }

  private async _findKnowledgeProductResultIdByHandle(
    handleId: string,
  ): Promise<number | undefined> {
    const knowledgeProduct =
      await this._resultsKnowledgeProductsRepository.findOne({
        where: { handle: Like(handleId) },
        relations: { result_object: true },
      });
    return knowledgeProduct?.result_object?.id;
  }

  private async _enrichExistingEvidenceKnowledgeProduct(
    eExists: Evidence,
    link: string,
  ): Promise<void> {
    if (eExists.knowledge_product_related) {
      return;
    }
    const knowledgeProduct =
      await this._resultsKnowledgeProductsRepository.findOne({
        where: { handle: Like(link) },
        relations: { result_object: true },
      });
    if (knowledgeProduct) {
      eExists.knowledge_product_related = knowledgeProduct.result_object.id;
    }
  }

  private async _buildNewEvidenceV1(
    evidence: EvidencesCreateInterface,
    result: Result,
    user: TokenDto,
    evidenceTypeId: number,
  ): Promise<Evidence> {
    const newEvidence = new Evidence();
    newEvidence.created_by = user.id;
    newEvidence.last_updated_by = user.id;
    this._applyEvidenceInputFields(newEvidence, evidence);
    newEvidence.is_supplementary = false;
    newEvidence.result_id = result.id;
    newEvidence.evidence_type_id = evidenceTypeId;

    const knowledgeProductResultId =
      await this._findKnowledgeProductResultIdByHandle(
        this._handleIdFromEvidenceLink(evidence.link),
      );
    if (knowledgeProductResultId) {
      newEvidence.knowledge_product_related = knowledgeProductResultId;
    }
    return newEvidence;
  }

  private async _upsertEvidenceItemV1(
    result: Result,
    evidence: EvidencesCreateInterface,
    user: TokenDto,
    evidenceTypeId: number,
  ): Promise<void> {
    const eExists =
      await this._evidencesRepository.getEvidencesByResultIdAndLink(
        result.id,
        evidence.id,
        false,
        evidenceTypeId,
      );

    evidence.link = await this.getHandleFromRegularLink(evidence.link);

    let currentEvidence: Evidence;
    if (eExists) {
      this._applyEvidenceInputFields(eExists, evidence);
      await this._enrichExistingEvidenceKnowledgeProduct(
        eExists,
        evidence.link,
      );
      currentEvidence = eExists;
    } else {
      currentEvidence = await this._buildNewEvidenceV1(
        evidence,
        result,
        user,
        evidenceTypeId,
      );
    }

    const evidenceSaved = await this._evidencesRepository.save(currentEvidence);
    if (evidenceSaved?.id) {
      await this.saveSPData(evidence, evidenceSaved.id);
    }
  }

  private async _processMainEvidencesOnCreate(
    createEvidenceDto: CreateEvidenceDto,
    result: Result,
    user: TokenDto,
    evidenceTypeId: number,
  ): Promise<void> {
    if (!createEvidenceDto?.evidences?.length) {
      await this._evidencesRepository.updateEvidences(
        createEvidenceDto.result_id,
        [],
        user.id,
        false,
        evidenceTypeId,
      );
      return;
    }

    const evidencesArray = createEvidenceDto.evidences.filter(
      (e) => !!e?.link || e?.is_sharepoint,
    );
    this._assertUniqueLinks(
      evidencesArray.map((e) => e.link),
      'Duplicate links found in the evidence',
    );

    await this._evidencesRepository.updateEvidences(
      createEvidenceDto.result_id,
      evidencesArray.map((e) => e?.id),
      user.id,
      false,
      evidenceTypeId,
    );

    // 🛑 Guarded per evidence, and it is not defensive dressing: `updateEvidences` above
    // has ALREADY deactivated every evidence of the section, there is no transaction, and
    // the writes are sequential. Before this guard, one evidence failing left the
    // deactivations committed and silently dropped the evidences after it — the reporter
    // lost work they never saw fail. Same shape as the per-evidence guard `replicateSPFiles`
    // carries for the same reason.
    const limit = Math.min(evidencesArray.length, 6);
    const failures: string[] = [];
    for (let index = 0; index < limit; index++) {
      try {
        await this._upsertEvidenceItemV1(
          result,
          evidencesArray[index],
          user,
          evidenceTypeId,
        );
      } catch (error) {
        const label =
          evidencesArray[index]?.sp_file_name ??
          evidencesArray[index]?.link ??
          `evidence ${index + 1}`;
        this._logger.error(
          `REPORTING: evidence "${label}" of result ${createEvidenceDto.result_id} could not be saved: ${error?.message}`,
        );
        failures.push(`"${label}": ${error?.message}`);
      }
    }

    // Everything that could be saved IS saved by now. Only then report what could not,
    // so the reporter is told precisely what to fix instead of losing the whole section.
    if (failures.length) {
      throwServiceError(
        failures.length === 1
          ? `The rest of the section was saved. This piece of evidence was not: ${failures[0]}`
          : `The rest of the section was saved. ${failures.length} pieces of evidence were not: ${failures.join(' | ')}`,
      );
    }
  }

  private async _processSupplementaryOnCreate(
    createEvidenceDto: CreateEvidenceDto,
    result: Result,
    user: TokenDto,
  ): Promise<void> {
    const supplementaryArray = createEvidenceDto.supplementary.filter(
      (e) => !!e?.link,
    );
    this._assertUniqueLinks(
      supplementaryArray.map((e) => e.link),
      'Duplicate links found in supplementary information',
    );

    await this._evidencesRepository.updateEvidences(
      createEvidenceDto.result_id,
      supplementaryArray.map((e) => e.link.trim()),
      user.id,
      true,
      1,
    );

    const limit = Math.min(supplementaryArray.length, 3);
    const newsEvidencesArray: Evidence[] = [];
    for (let index = 0; index < limit; index++) {
      const supplementary = supplementaryArray[index];
      const eExists =
        await this._evidencesRepository.getEvidencesByResultIdAndLink(
          result.id,
          supplementary.link,
          true,
          1,
        );

      supplementary.link = await this.getHandleFromRegularLink(
        supplementary.link,
      );

      if (eExists) {
        eExists.description = supplementary?.description ?? null;
        newsEvidencesArray.push(eExists);
      } else {
        const newEvidnece = new Evidence();
        newEvidnece.created_by = user.id;
        newEvidnece.last_updated_by = user.id;
        newEvidnece.description = supplementary?.description ?? null;
        newEvidnece.is_supplementary = true;
        newEvidnece.link = supplementary.link;
        newEvidnece.result_id = result.id;
        newEvidnece.evidence_type_id = 1;
        newsEvidencesArray.push(newEvidnece);
      }
    }
    await this._evidencesRepository.save(newsEvidencesArray);
  }

  async createV2(createEvidenceDto: CreateEvidenceDto, user: TokenDto) {
    try {
      const result = await this._resultRepository.getResultById(
        createEvidenceDto.result_id,
      );
      await this._versionRepository.getBaseVersion();
      await this._processMainEvidencesOnCreate(
        createEvidenceDto,
        result,
        user,
        6,
      );

      return {
        response: createEvidenceDto,
        message: 'The data was updated correctly',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  public async getHandleFromRegularLink(evidence: string): Promise<string> {
    const isCGLink = this.kpUrlRegex.exec(evidence ?? '');

    if (isCGLink) {
      const mqapParameters: MQAPBodyDto =
        MQAPBodyDto.toOnlyGetCGSpaceData(evidence);
      const cgspaceData =
        await this._mqapService.getDataFromCGSpaceHandle(mqapParameters);

      if (cgspaceData.Handle) {
        return cgspaceData.Handle;
      }
    }

    return evidence;
  }

  async saveSPData(evidence: EvidencesCreateInterface, newEvidenceId) {
    const { sp_document_id, sp_file_name, sp_folder_path, sp_evidence_id } =
      evidence || {};

    const currentSPId = Number(sp_evidence_id);
    const existingEvidenceSharepoint = currentSPId
      ? await this._evidenceSharepointRepository.findOne({
          where: {
            id: currentSPId,
          },
        })
      : undefined;

    const replaceFile =
      typeof sp_file_name === 'string' &&
      existingEvidenceSharepoint?.file_name !== sp_file_name &&
      existingEvidenceSharepoint?.id;

    if (
      existingEvidenceSharepoint &&
      (replaceFile || !evidence?.is_sharepoint)
    ) {
      await this._evidenceSharepointRepository.update(
        existingEvidenceSharepoint?.id,
        {
          is_active: false,
        },
      );
      existingEvidenceSharepoint.id = null;
    }
    if (!evidence?.is_sharepoint) return;
    const createOrUpdateEvidenceSharepoint = async (
      evidenceSharepoint: EvidenceSharepoint | undefined,
    ) => {
      if (!evidenceSharepoint) {
        evidenceSharepoint = new EvidenceSharepoint();
      }

      if (
        evidenceSharepoint.is_public_file != evidence.is_public_file ||
        replaceFile
      ) {
        const documentId = sp_document_id ?? evidenceSharepoint.document_id;
        const data: any = await this._sharePointService.addFileAccess(
          documentId,
          evidence.is_public_file ?? evidenceSharepoint.is_public_file,
        );
        // SharePointService.addFileAccess swallows its own HTTP/permission
        // errors and resolves with the raw Error instead of rejecting (see
        // share-point.service.ts). Without this guard `data.link.webUrl`
        // throws an opaque TypeError here, which still aborts the request
        // (create()/createV2() catch it) but hides the real SharePoint
        // failure behind "Cannot read properties of undefined" and skips
        // persisting the evidence_sharepoint row below silently.
        if (!data?.link?.webUrl) {
          throw new Error(
            `SharePoint addFileAccess failed for document ${documentId}: ${
              data?.message || JSON.stringify(data) || 'unknown error'
            }`,
          );
        }
        // 🛑 THE PLATFORM MUST NOT RECORD A CONFIDENTIALITY IT DID NOT ACHIEVE.
        //
        // Measured on prtest on 9 Sep 2026 (result 9075, evidence 13081): switching an
        // evidence to confidential leaves the file's anonymous permission alive, so the
        // link that already circulated keeps downloading it. The row said false, four
        // places in the UI drew a padlock and the words "Not public", and the file was
        // one click away for anybody holding the old url.
        //
        // So when the file did not actually become private we refuse THIS evidence and
        // tell the reporter what to do instead. Refusing is only safe because
        // `_processMainEvidencesOnCreate` now guards each evidence: the rest of the
        // section is saved, and only this one comes back with a reason.
        // `verifiedPrivate` fails closed — "could not check" never reads as "private".
        const revocation = data?.revocation;
        const wantsPrivate = !(
          evidence.is_public_file ?? evidenceSharepoint.is_public_file
        );
        if (
          wantsPrivate &&
          revocation &&
          revocation.verifiedPrivate === false
        ) {
          this._logger.error(
            revocation.readBackFailed
              ? `REPORTING: refused to store evidence ${newEvidenceId} as confidential — reading the permissions of document ${documentId} failed, so the file could not be confirmed private.`
              : `REPORTING: refused to store evidence ${newEvidenceId} as confidential — ${
                  revocation.publicSurvivors.length
                } anonymous sharing permission(s) still on document ${documentId} after trying to remove ${
                  revocation.attempted
                } (delete outcomes: ${
                  revocation.outcomes
                    .map((r: any) => `${r.permissionId}:${r.status}`)
                    .join(', ') || 'none attempted'
                }).`,
          );
          throwServiceError(
            revocation.readBackFailed
              ? 'This file could not be made confidential because the repository did not answer. It is still shared as it was. Please try saving again in a moment; if it keeps failing, upload the file again to get a fresh, private copy.'
              : 'This file cannot be made confidential: it was shared publicly before and the repository did not remove that access, so the previous link still works. Upload the file again — the new copy will be private from the start — and remove this entry.',
          );
        }

        await this._evidencesRepository.update(newEvidenceId, {
          link: data.link.webUrl,
        });
      }

      evidenceSharepoint.folder_path =
        sp_folder_path ?? evidenceSharepoint.folder_path;
      evidenceSharepoint.file_name =
        sp_file_name ?? evidenceSharepoint.file_name;
      evidenceSharepoint.is_public_file =
        evidence.is_public_file ?? evidenceSharepoint.is_public_file;
      evidenceSharepoint.evidence_id =
        newEvidenceId ?? evidenceSharepoint.evidence_id;
      evidenceSharepoint.document_id =
        sp_document_id ?? evidenceSharepoint.document_id;

      await this._evidenceSharepointRepository.save(evidenceSharepoint);
    };

    await createOrUpdateEvidenceSharepoint(existingEvidenceSharepoint);
  }

  /**
   * P2-3601 — copies each SharePoint evidence of a freshly rolled-over result into the
   * NEW phase's folder and records the copy.
   *
   * 🛑 Must run AFTER the phase-change transaction commits (see `versioning.service.ts`).
   * Both reads below go through the repository's own EntityManager, so inside the open
   * transaction they query a pooled connection, find nothing, and this method copies
   * nothing at all — which is exactly how the rollover silently shared one document
   * between two phases from Feb 2024 on. It is also why the copy does not belong inside:
   * `replicateFile` + `addFileAccess` are ~6 Microsoft Graph round-trips per evidence on
   * an HttpModule with no timeout, and there is no compensating delete to undo them.
   *
   * Every write the copy produces has to land on the new phase's own rows: the
   * `evidence_sharepoint.replicate` INSERT copies `document_id` / `folder_path` verbatim
   * from the previous phase, and `saveSPData` later resolves which file to touch as
   * `sp_document_id ?? evidenceSharepoint.document_id`. Persisting only `evidence.link`
   * leaves that field pointing at the neighbour phase's file, so the defect survives.
   */
  async replicateSPFiles(config: any) {
    const resultReplicatedId = config?.new_result_id;
    const { filePath } =
      await this._sharePointService.generateFilePath(resultReplicatedId);

    const evidevenceList =
      await this._evidencesRepository.getEvidencesByResultId(
        resultReplicatedId,
        false,
        1,
      );

    for (const sharePointIterator of evidevenceList) {
      if (!sharePointIterator?.is_sharepoint) continue;

      // One evidence failing must not cost the remaining ones their copy: the phase
      // change is already committed by the time this runs.
      try {
        const document_id = await this._sharePointService.replicateFile(
          sharePointIterator['sp_document_id'],
          filePath,
        );

        const accessData = await this._sharePointService.addFileAccess(
          document_id,
          sharePointIterator.is_public_file,
        );

        // Same guard `saveSPData` carries: addFileAccess swallows its own HTTP errors
        // and resolves with the raw Error, so without this an empty link would be
        // persisted over a working one.
        if (!accessData?.link?.webUrl) {
          this._logger.error(
            `REPORTING: SharePoint access call returned no link for document ${document_id} (evidence ${sharePointIterator.id}); the evidence keeps its previous link.`,
          );
          continue;
        }

        await this._evidencesRepository.update(sharePointIterator.id, {
          link: accessData.link.webUrl,
        });

        // `sharePointIterator` is a raw aliased row, so the evidence_sharepoint id
        // travels as `sp_evidence_id` (see `getEvidencesByResultId`).
        // Written the way `saveSPData` writes it — assigned on the entity and saved —
        // because `document_id` / `folder_path` carry no declared type on the entity,
        // so a typed partial does not compile. `file_name` is deliberately left alone:
        // the copy keeps the source name and that name is correct under the convention
        // (`result-<result_code>-…`, and result_code is shared across phases on purpose).
        const spEvidenceId = sharePointIterator['sp_evidence_id'];
        if (spEvidenceId) {
          const spRow = new EvidenceSharepoint();
          spRow.id = spEvidenceId;
          spRow.document_id = document_id;
          spRow.folder_path = filePath;
          await this._evidenceSharepointRepository.save(spRow);
        }
      } catch (error) {
        this._logger.error(
          `REPORTING: SharePoint replication failed for evidence ${sharePointIterator.id} of result ${resultReplicatedId}: ${error?.message}`,
        );
      }
    }
  }

  async findAll(resultId: number) {
    try {
      const result: Result =
        await this._resultRepository.getResultById(resultId);
      if (!result) {
        const error = new Error('Results Not Found');
        (error as any).response = {};
        (error as any).status = HttpStatus.NOT_FOUND;
        throw error;
      }

      const innoDev =
        await this._resultsInnovationsDevRepository.InnovationDevExists(
          resultId,
        );

      const evidences = await this._evidencesRepository.getEvidencesByResultId(
        resultId,
        false,
        1,
      );

      const supplementary =
        await this._evidencesRepository.getEvidencesByResultId(
          resultId,
          true,
          1,
        );

      this._normalizeEvidenceMarks(evidences);
      evidences.forEach((e) => {
        e.is_sharepoint = Number(!!e?.is_sharepoint);
        e.is_public_file = Boolean(e.is_public_file);
      });

      this._normalizeEvidenceMarks(supplementary);

      return {
        response: {
          innovation_readiness_level_id: innoDev
            ? innoDev.innovation_readiness_level_id
            : null,
          result_id: result.id,
          gender_tag_level: result.gender_tag_level_id,
          climate_change_tag_level: result.climate_change_tag_level_id,
          nutrition_tag_level: result.nutrition_tag_level_id,
          environmental_biodiversity_tag_level:
            result.environmental_biodiversity_tag_level_id,
          poverty_tag_level: result.poverty_tag_level_id,
          evidences,
          supplementary,
        },
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async findAllV2(resultId: number) {
    try {
      const result: Result =
        await this._resultRepository.getResultById(resultId);
      if (!result) {
        const error = new Error('Results Not Found');
        (error as any).response = {};
        (error as any).status = HttpStatus.NOT_FOUND;
        throw error;
      }

      const innoDev =
        await this._resultsInnovationsDevRepository.InnovationDevExists(
          resultId,
        );

      const evidences = await this._evidencesRepository.getEvidencesByResultId(
        resultId,
        false,
        6,
      );

      this._normalizeEvidenceMarks(evidences);
      evidences.forEach((e) => {
        e.is_sharepoint = Number(!!e?.is_sharepoint);
        e.is_public_file = Boolean(e.is_public_file);
      });

      return {
        response: {
          innovation_readiness_level_id: innoDev
            ? innoDev.innovation_readiness_level_id
            : null,
          result_id: result.id,
          gender_tag_level: result.gender_tag_level_id,
          climate_change_tag_level: result.climate_change_tag_level_id,
          nutrition_tag_level: result.nutrition_tag_level_id,
          environmental_biodiversity_tag_level:
            result.environmental_biodiversity_tag_level_id,
          poverty_tag_level: result.poverty_tag_level_id,
          evidences,
        },
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async updateEvidencesPartial(
    evidences: EvidenceDto[],
    resultId: number,
    user: TokenDto,
  ) {
    try {
      const result = await this._resultRepository.getResultById(resultId);

      if (!result) {
        return {
          response: {},
          message: 'Result not found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      const duplicateCheck = this._validateDuplicateLinks(evidences);
      if (duplicateCheck) {
        return duplicateCheck;
      }

      const existingEvidences = await this._evidencesRepository.find({
        where: {
          result_id: resultId,
          is_active: 1,
        },
      });

      const payloadEvidenceIds = evidences
        .filter((e) => e.id)
        .map((e) => Number(e.id));

      await this._deactivateMissingEvidences(
        existingEvidences,
        payloadEvidenceIds,
        user,
      );

      await this._createNewEvidences(evidences, resultId, user);

      return {
        response: evidences,
        message: 'Evidences updated successfully',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  private _validateDuplicateLinks(evidences: EvidenceDto[]): {
    response: Record<string, unknown>;
    message: string;
    status: HttpStatus;
  } | null {
    const testDuplicate = evidences.map((e) => e.link);
    if (new Set(testDuplicate).size !== testDuplicate.length) {
      return {
        response: {},
        message: 'Duplicate links found in the evidence',
        status: HttpStatus.BAD_REQUEST,
      };
    }
    return null;
  }

  private async _deactivateMissingEvidences(
    existingEvidences: Evidence[],
    payloadEvidenceIds: number[],
    user: TokenDto,
  ): Promise<void> {
    for (const existingEvidence of existingEvidences) {
      if (!payloadEvidenceIds.includes(Number(existingEvidence.id))) {
        existingEvidence.is_active = 0;
        existingEvidence.last_updated_by = user.id;
        await this._evidencesRepository.save(existingEvidence);
      }
    }
  }

  private async _createNewEvidences(
    evidences: EvidenceDto[],
    resultId: number,
    user: TokenDto,
  ): Promise<void> {
    for (const evidenceDto of evidences) {
      if (!evidenceDto.id) {
        await this._createNewEvidence(evidenceDto, resultId, user);
      }
    }
  }

  private async _createNewEvidence(
    evidenceDto: EvidenceDto,
    resultId: number,
    user: TokenDto,
  ): Promise<void> {
    const hasLink = evidenceDto.link && evidenceDto.link.trim().length > 0;
    const hasSharepoint =
      evidenceDto.is_sharepoint !== undefined &&
      evidenceDto.is_sharepoint !== 0;

    if (!hasLink && !hasSharepoint) {
      return;
    }

    const newEvidence = new Evidence();
    newEvidence.created_by = user.id;
    newEvidence.last_updated_by = user.id;
    newEvidence.is_sharepoint = evidenceDto.is_sharepoint ?? 0;
    newEvidence.is_supplementary = false;
    newEvidence.result_id = resultId;
    newEvidence.evidence_type_id = 1;

    if (hasLink) {
      newEvidence.link = await this.getHandleFromRegularLink(evidenceDto.link);
    } else {
      newEvidence.link = '';
    }

    if (hasLink && evidenceDto.link) {
      const queryIndex = evidenceDto.link.indexOf('?');
      const linkToProcess =
        queryIndex >= 0
          ? evidenceDto.link.slice(0, queryIndex)
          : evidenceDto.link;
      const linkSplit = linkToProcess.split('/');
      const handleId = linkSplit.slice(-2).join('/');

      const knowledgeProduct =
        await this._resultsKnowledgeProductsRepository.findOne({
          where: { handle: Like(handleId) },
          relations: { result_object: true },
        });

      if (knowledgeProduct) {
        newEvidence.knowledge_product_related =
          knowledgeProduct.result_object.id;
      }
    }

    const evidenceSaved = await this._evidencesRepository.save(newEvidence);
    if (evidenceSaved?.id) {
      const evidenceForSP: EvidencesCreateInterface = {
        id: evidenceSaved.id.toString(),
        link: evidenceDto.link || '',
        is_sharepoint: evidenceDto.is_sharepoint ?? 0,
      };
      await this.saveSPData(evidenceForSP, evidenceSaved.id);
    }
  }
}
