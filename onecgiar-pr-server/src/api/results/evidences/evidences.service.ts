import { Injectable, HttpStatus } from '@nestjs/common';
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

    const limit = Math.min(evidencesArray.length, 6);
    for (let index = 0; index < limit; index++) {
      await this._upsertEvidenceItemV1(
        result,
        evidencesArray[index],
        user,
        evidenceTypeId,
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
        const data: any = await this._sharePointService.addFileAccess(
          sp_document_id ?? evidenceSharepoint.document_id,
          evidence.is_public_file ?? evidenceSharepoint.is_public_file,
        );
        if (data.link.webUrl) {
          await this._evidencesRepository.update(newEvidenceId, {
            link: data.link.webUrl,
          });
        }
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

      const document_id = await this._sharePointService.replicateFile(
        sharePointIterator['sp_document_id'],
        filePath,
      );

      const accessData = await this._sharePointService.addFileAccess(
        document_id,
        sharePointIterator.is_public_file,
      );

      await this._evidencesRepository.update(sharePointIterator, {
        link: accessData?.link?.webUrl,
      });
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

      evidences.forEach((e) => {
        e.gender_related = !!e.gender_related;
        e.youth_related = !!e.youth_related;
        e.nutrition_related = !!e.nutrition_related;
        e.environmental_biodiversity_related =
          !!e.environmental_biodiversity_related;
        e.poverty_related = !!e.poverty_related;
        e.innovation_readiness_related = !!e.innovation_readiness_related;
        e.innovation_use_related = !!e.innovation_use_related;
        e.policy_change_related = !!e.policy_change_related;
        e.capacity_sharing_related = !!e.capacity_sharing_related;
        e.other_output_related = !!e.other_output_related;
        e.other_outcome_related = !!e.other_outcome_related;
        e.knowledge_product_metadata_related =
          !!e.knowledge_product_metadata_related;
        e.is_sharepoint = Number(!!e?.is_sharepoint);
        e.is_public_file = Boolean(e.is_public_file);
      });

      supplementary.forEach((e) => {
        e.gender_related = !!e.gender_related;
        e.youth_related = !!e.youth_related;
        e.nutrition_related = !!e.nutrition_related;
        e.environmental_biodiversity_related =
          !!e.environmental_biodiversity_related;
        e.poverty_related = !!e.poverty_related;
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

      evidences.forEach((e) => {
        e.gender_related = !!e.gender_related;
        e.youth_related = !!e.youth_related;
        e.nutrition_related = !!e.nutrition_related;
        e.environmental_biodiversity_related =
          !!e.environmental_biodiversity_related;
        e.poverty_related = !!e.poverty_related;
        e.innovation_readiness_related = !!e.innovation_readiness_related;
        e.innovation_use_related = !!e.innovation_use_related;
        e.policy_change_related = !!e.policy_change_related;
        e.capacity_sharing_related = !!e.capacity_sharing_related;
        e.other_output_related = !!e.other_output_related;
        e.other_outcome_related = !!e.other_outcome_related;
        e.knowledge_product_metadata_related =
          !!e.knowledge_product_metadata_related;
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
