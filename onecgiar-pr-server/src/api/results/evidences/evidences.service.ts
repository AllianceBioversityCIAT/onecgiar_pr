import { Injectable, HttpStatus } from '@nestjs/common';
import {
  CreateEvidenceDto,
  EvidencesCreateInterface,
} from './dto/create-evidence.dto';
import { UpdateEvidenceDto } from './dto/update-evidence.dto';
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
import * as fs from 'fs';
import { GlobalParameterCacheService } from '../../../shared/services/cache/global-parameter-cache.service';
import { SharePointService } from '../../../shared/services/share-point/share-point.service';
import { EvidenceSharepointRepository } from './repositories/evidence-sharepoint.repository';
import { EvidenceSharepoint } from './entities/evidence-sharepoint.entity';

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
  ) {}
  async create(
    createEvidenceDto: CreateEvidenceDto,
    files: Express.Multer.File[],
    user: TokenDto,
  ) {
    try {
      const result = await this._resultRepository.getResultById(
        createEvidenceDto.result_id,
      );
      await this._versionRepository.getBaseVersion();
      if (createEvidenceDto?.evidences?.length) {
        const evidencesArray = createEvidenceDto?.evidences.filter(
          (e) => !!e?.link || e?.is_sharepoint,
        );
        const testDuplicate = evidencesArray.map((e) => e.link);
        if (new Set(testDuplicate).size !== testDuplicate.length) {
          throw {
            response: {},
            message: 'Duplicate links found in the evidence',
            status: HttpStatus.BAD_REQUEST,
          };
        }
        await this._evidencesRepository.updateEvidences(
          createEvidenceDto.result_id,
          evidencesArray.map((e) => e.link?.trim()),
          user.id,
          false,
          1,
        );
        const long: number =
          evidencesArray.length > 6 ? 6 : evidencesArray.length;
        for (let index = 0; index < long; index++) {
          const evidence = evidencesArray[index];
          const eExists =
            await this._evidencesRepository.getEvidencesByResultIdAndLink(
              result.id,
              evidence.link,
              false,
              1,
            );
          const newEvidence = new Evidence();
          if (!eExists) {
            newEvidence.created_by = user.id;
            newEvidence.last_updated_by = user.id;
            newEvidence.description = evidence?.description ?? null;
            newEvidence.gender_related = evidence.gender_related;
            newEvidence.is_sharepoint = evidence.is_sharepoint;
            newEvidence.youth_related = evidence.youth_related;
            newEvidence.nutrition_related = evidence.nutrition_related;
            newEvidence.environmental_biodiversity_related =
              evidence.environmental_biodiversity_related;
            newEvidence.poverty_related = evidence.poverty_related;
            newEvidence.is_supplementary = false;
            newEvidence.link = evidence.link;
            newEvidence.result_id = result.id;
            newEvidence.evidence_type_id = 1;

            const hasQuery = (evidence.link ?? '').indexOf('?');
            const linkSplit = (evidence.link ?? '')
              .slice(0, hasQuery != -1 ? hasQuery : evidence.link?.length)
              .split('/');
            const handleId = linkSplit.slice(linkSplit.length - 2).join('/');

            const knowledgeProduct =
              await this._resultsKnowledgeProductsRepository.findOne({
                where: { handle: Like(handleId) },
                relations: { result_object: true },
              });

            if (knowledgeProduct) {
              newEvidence.knowledge_product_related =
                knowledgeProduct.result_object.id;
            }
          } else {
            eExists.description = evidence?.description ?? null;
            eExists.gender_related = evidence.gender_related;
            eExists.is_sharepoint = evidence.is_sharepoint;
            eExists.youth_related = evidence.youth_related;
            eExists.nutrition_related = evidence.nutrition_related;
            eExists.environmental_biodiversity_related =
              evidence.environmental_biodiversity_related;
            eExists.poverty_related = evidence.poverty_related;

            if (!eExists.knowledge_product_related) {
              const knowledgeProduct =
                await this._resultsKnowledgeProductsRepository.findOne({
                  where: { handle: Like(evidence.link) },
                  relations: { result_object: true },
                });

              if (knowledgeProduct) {
                eExists.knowledge_product_related =
                  knowledgeProduct.result_object.id;
              }
            }
          }
          const currentEvidence = eExists ? eExists : newEvidence;

          let fileSaved: {
            document_id: string;
            filePath: string;
            originalname: string;
            webUrl: string;
          } = null;
          if (currentEvidence.is_sharepoint) {
            fileSaved = await this.saveSPFile(
              files,
              evidence,
              createEvidenceDto,
            );
            currentEvidence.link = fileSaved?.webUrl;
          }
          const evidenceSaved = await this._evidencesRepository.save(
            currentEvidence,
          );
          await this.saveSPData(evidenceSaved?.id, fileSaved, evidence);
        }
      }

      if (createEvidenceDto?.supplementary) {
        const supplementaryArray = createEvidenceDto?.supplementary.filter(
          (e) => !!e?.link,
        );
        const testDuplicate = supplementaryArray.map((e) => e.link);
        if (new Set(testDuplicate).size !== testDuplicate.length) {
          throw {
            response: {},
            message: 'Duplicate links found in supplementary information',
            status: HttpStatus.BAD_REQUEST,
          };
        }
        await this._evidencesRepository.updateEvidences(
          createEvidenceDto.result_id,
          supplementaryArray.map((e) => e.link.trim()),
          user.id,
          true,
          1,
        );
        const long: number =
          supplementaryArray.length > 3 ? 3 : supplementaryArray.length;
        const newsEvidencesArray: Evidence[] = [];
        for (let index = 0; index < long; index++) {
          const supplementary = supplementaryArray[index];
          const eExists =
            await this._evidencesRepository.getEvidencesByResultIdAndLink(
              result.id,
              supplementary.link,
              true,
              1,
            );
          if (!eExists) {
            const newEvidnece = new Evidence();
            newEvidnece.created_by = user.id;
            newEvidnece.last_updated_by = user.id;
            newEvidnece.description = supplementary?.description ?? null;
            newEvidnece.is_supplementary = true;
            newEvidnece.link = supplementary.link;
            newEvidnece.result_id = result.id;
            newEvidnece.evidence_type_id = 1;
            newsEvidencesArray.push(newEvidnece);
          } else {
            eExists.description = supplementary?.description ?? null;
            newsEvidencesArray.push(eExists);
          }
        }
        await this._evidencesRepository.save(newsEvidencesArray);
      }
      return {
        response: createEvidenceDto,
        message: 'The data was updated correctly',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async saveSPFile(
    files: Express.Multer.File[],
    evidence: EvidencesCreateInterface,
    createEvidenceDto: CreateEvidenceDto,
  ) {
    await this._sharePointService.getToken();

    let filePath = '';
    let originalname = '';
    let file: Express.Multer.File;
    let fileSaved: any;
    if (files?.length) {
      file = files.find((fileItem: Express.Multer.File) =>
        fileItem.originalname.includes(evidence.fileUuid),
      );

      if (file) {
        const [pathInformation] =
          await this._evidencesRepository.getResultInformation(
            createEvidenceDto?.result_id,
          );

        filePath = `/${pathInformation?.initiative_official_code}/result-${pathInformation?.result_id}/evidences`;
        const fileSaved = await this._sharePointService.saveFile(
          file,
          filePath,
        );
        return {
          document_id: fileSaved?.data?.id,
          filePath,
          originalname: file.originalname,
          webUrl: fileSaved?.data?.webUrl,
        };

        //TODO fileSaved.data.webUrl
      }
    }
    return null;
  }

  async saveSPData(currentEvidenceID: number, metadata, evidence) {
    const { document_id, filePath, originalname } = metadata || {};
    const createOrUpdateEvidenceSharepoint = async (
      evidenceSharepoint: EvidenceSharepoint | undefined,
    ) => {
      if (!evidenceSharepoint) {
        evidenceSharepoint = new EvidenceSharepoint();
      }

      if (evidenceSharepoint.is_public_file != evidence.is_public_file) {
        console.log('Es diferente, se debe actualizar el acceso');
        this._sharePointService.addFileAccess(
          document_id ?? evidenceSharepoint.document_id,
          evidence.is_public_file ?? evidenceSharepoint.is_public_file,
        );
      }

      evidenceSharepoint.folder_path =
        filePath ?? evidenceSharepoint.folder_path;
      evidenceSharepoint.file_name =
        originalname ?? evidenceSharepoint.file_name;
      evidenceSharepoint.is_public_file =
        evidence.is_public_file ?? evidenceSharepoint.is_public_file;
      evidenceSharepoint.evidence_id =
        currentEvidenceID ?? evidenceSharepoint.evidence_id;
      evidenceSharepoint.document_id =
        document_id ?? evidenceSharepoint.document_id;

      await this._evidenceSharepointRepository.save(evidenceSharepoint);
    };

    const currentSPId = Number(evidence?.sp_id);
    const existingEvidenceSharepoint = currentSPId
      ? await this._evidenceSharepointRepository.findOne({
          where: {
            id: currentSPId,
          },
        })
      : undefined;

    await createOrUpdateEvidenceSharepoint(existingEvidenceSharepoint);
  }

  async findAll(resultId: number) {
    try {
      const result: Result = await this._resultRepository.getResultById(
        resultId,
      );
      if (!result) {
        throw {
          response: {},
          message: 'Results Not Found',
          status: HttpStatus.NOT_FOUND,
        };
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

      evidences.map((e) => {
        e.gender_related = !!e.gender_related;
        e.youth_related = !!e.youth_related;
        e.nutrition_related = !!e.nutrition_related;
        e.environmental_biodiversity_related =
          !!e.environmental_biodiversity_related;
        e.poverty_related = !!e.poverty_related;
        e.is_sharepoint = Number(!!e?.is_sharepoint);
        e.is_public_file = Boolean(e.is_public_file);
      });

      supplementary.map((e) => {
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

  findOne(id: number) {
    return `This action returns a #${id} evidence`;
  }

  update(id: number, updateEvidenceDto: UpdateEvidenceDto) {
    return `This action updates a #${id} evidence ${updateEvidenceDto}`;
  }

  remove(id: number) {
    return `This action removes a #${id} evidence`;
  }
}
