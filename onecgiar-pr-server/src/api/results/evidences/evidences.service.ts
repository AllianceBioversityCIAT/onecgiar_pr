import { Injectable, HttpStatus } from '@nestjs/common';
import { CreateEvidenceDto } from './dto/create-evidence.dto';
import { UpdateEvidenceDto } from './dto/update-evidence.dto';
import { EvidencesRepository } from './evidences.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { ResultRepository } from '../result.repository';
import { Evidence } from './entities/evidence.entity';
import { VersionRepository } from '../versions/version.repository';
import { ResultsKnowledgeProductsRepository } from '../results-knowledge-products/repositories/results-knowledge-products.repository';
import { Like } from 'typeorm';
import { Result } from '../entities/result.entity';

@Injectable()
export class EvidencesService {
  constructor(
    private readonly _evidencesRepository: EvidencesRepository,
    private readonly _handlersError: HandlersError,
    private readonly _resultRepository: ResultRepository,
    private readonly _versionRepository: VersionRepository,
    private readonly _resultsKnowledgeProductsRepository: ResultsKnowledgeProductsRepository,
  ) {}
  async create(createEvidenceDto: CreateEvidenceDto, user: TokenDto) {
    try {
      const result = await this._resultRepository.getResultById(
        createEvidenceDto.result_id,
      );
      const vr = await this._versionRepository.getBaseVersion();
      if (createEvidenceDto?.evidences) {
        const evidencesArray = createEvidenceDto?.evidences.filter(
          (e) => !!e?.link,
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
          evidencesArray.map((e) => e.link.trim()),
          user.id,
          false,
        );
        const long: number =
          evidencesArray.length > 3 ? 3 : evidencesArray.length;
        let newsEvidencesArray: Evidence[] = [];
        for (let index = 0; index < long; index++) {
          let evidence = evidencesArray[index];
          let eExists =
            await this._evidencesRepository.getEvidencesByResultIdAndLink(
              result.id,
              evidence.link,
              false,
            );
          if (!eExists) {
            let newEvidence = new Evidence();

            newEvidence.created_by = user.id;
            newEvidence.last_updated_by = user.id;
            newEvidence.description = evidence?.description ?? null;
            newEvidence.gender_related = evidence.gender_related;
            newEvidence.youth_related = evidence.youth_related;
            newEvidence.is_supplementary = false;
            newEvidence.link = evidence.link;
            newEvidence.result_id = result.id;
            newEvidence.version_id = vr.id;

            const hasQuery = (evidence.link ?? '').indexOf('?');
            const linkSplit = (evidence.link ?? '')
              .slice(0, hasQuery != -1 ? hasQuery : evidence.link?.length)
              .split('/');
            const handleId = linkSplit.slice(linkSplit.length - 2).join('/');

            const knowledgeProduct =
              await this._resultsKnowledgeProductsRepository.findOne({
                where: { handle: Like(handleId) },
              });

            if (knowledgeProduct) {
              newEvidence.knowledge_product_related =
                knowledgeProduct.result_object.id;
            }

            newsEvidencesArray.push(newEvidence);
          } else {
            eExists.description = evidence?.description ?? null;
            eExists.gender_related = evidence.gender_related;
            eExists.youth_related = evidence.youth_related;

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

            newsEvidencesArray.push(eExists);
          }
        }
        await this._evidencesRepository.save(newsEvidencesArray);
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
        );
        const long: number =
          supplementaryArray.length > 3 ? 3 : supplementaryArray.length;
        let newsEvidencesArray: Evidence[] = [];
        for (let index = 0; index < long; index++) {
          const supplementary = supplementaryArray[index];
          const eExists =
            await this._evidencesRepository.getEvidencesByResultIdAndLink(
              result.id,
              supplementary.link,
              true,
            );
          if (!eExists) {
            let newEvidnece = new Evidence();
            newEvidnece.created_by = user.id;
            newEvidnece.last_updated_by = user.id;
            newEvidnece.description = supplementary?.description ?? null;
            newEvidnece.is_supplementary = true;
            newEvidnece.link = supplementary.link;
            newEvidnece.result_id = result.id;
            newEvidnece.version_id = vr.id;
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

  async findAll(resultId: number) {
    try {
      const result: Result = await this._resultRepository.getResultById(resultId);
      if (!result) {
        throw {
          response: {},
          message: 'Results Not Found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      const evidences = await this._evidencesRepository.getEvidencesByResultId(
        resultId,
        false,
      );
      const supplementary =
        await this._evidencesRepository.getEvidencesByResultId(resultId, true);

      evidences.map((e) => {
        e.gender_related = !!e.gender_related;
        e.youth_related = !!e.youth_related;
      });

      supplementary.map((e) => {
        e.gender_related = !!e.gender_related;
        e.youth_related = !!e.youth_related;
      });

      return {
        response: {
          result_id: result.id,
          gender_tag_level: result.gender_tag_level_id,
          climate_change_tag_level: result.climate_change_tag_level_id,
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
