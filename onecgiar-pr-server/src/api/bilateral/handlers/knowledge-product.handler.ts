import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import {
  BilateralResultTypeHandler,
  HandlerAfterCreateContext,
  HandlerInitializeContext,
  HandlerInitializeResult,
} from './bilateral-result-type-handler.interface';
import { ResultTypeEnum } from '../../../shared/constants/result-type.enum';
import { ResultRepository } from '../../results/result.repository';
import { ResultsKnowledgeProductsRepository } from '../../results/results-knowledge-products/repositories/results-knowledge-products.repository';
import { ResultsKnowledgeProductMetadataRepository } from '../../results/results-knowledge-products/repositories/results-knowledge-product-metadata.repository';
import { Like } from 'typeorm';
import { SourceEnum } from '../../results/entities/result.entity';

@Injectable()
export class KnowledgeProductBilateralHandler
  implements BilateralResultTypeHandler
{
  readonly resultType = ResultTypeEnum.KNOWLEDGE_PRODUCT;
  private readonly logger = new Logger(KnowledgeProductBilateralHandler.name);

  constructor(
    private readonly _resultRepository: ResultRepository,
    private readonly _resultsKnowledgeProductsRepository: ResultsKnowledgeProductsRepository,
    private readonly _resultsKnowledgeProductMetadataRepository: ResultsKnowledgeProductMetadataRepository,
  ) {}

  async initializeResultHeader(
    context: HandlerInitializeContext,
  ): Promise<HandlerInitializeResult> {
    const { bilateralDto } = context;

    if (!bilateralDto.knowledge_product) {
      throw new BadRequestException(
        'knowledge_product object is required for KNOWLEDGE_PRODUCT results.',
      );
    }

    this.logger.log('Direct KP creation (no CGSpace sync)');
    const existingKp = await this._resultsKnowledgeProductsRepository.findOne({
      where: {
        handle: Like(bilateralDto.knowledge_product.handle),
        result_object: { is_active: true },
      },
      relations: { result_object: true },
    });

    if (existingKp) {
      this.logger.warn(
        `Knowledge Product with handle ${bilateralDto.knowledge_product.handle} already exists (result_id=${existingKp.result_object.id}), aborting bilateral creation.`,
      );
      throw new BadRequestException(
        `Knowledge Product with handle ${bilateralDto.knowledge_product.handle} already exists.`,
      );
    }

    const resultHeader = await this._resultRepository.save({
      created_by: context.userId,
      version_id: context.version.id,
      title: bilateralDto.title,
      description: bilateralDto.description,
      reported_year_id: context.year.year,
      result_code: context.lastCode + 1,
      result_type_id: bilateralDto.result_type_id,
      result_level_id: bilateralDto.result_level_id,
      external_submitter: context.submittedUserId,
      external_submitted_date:
        bilateralDto.submitted_by?.submitted_date ?? null,
      external_submitted_comment: bilateralDto.submitted_by?.comment ?? null,
      ...(bilateralDto.created_date && {
        created_date: bilateralDto.created_date,
      }),
      source: SourceEnum.Bilateral,
    });

    return { resultHeader, isDuplicate: false };
  }

  async afterCreate({
    resultId,
    bilateralDto,
    userId,
    isDuplicateResult,
  }: HandlerAfterCreateContext) {
    if (isDuplicateResult) {
      this.logger.debug(
        `Skipping knowledge product record creation for duplicate handle='${bilateralDto.knowledge_product.handle}'.`,
      );
      return;
    }

    const knowledgeProduct = bilateralDto.knowledge_product;
    if (!knowledgeProduct) {
      throw new BadRequestException(
        'knowledge_product object is required for KNOWLEDGE_PRODUCT results.',
      );
    }

    const kpEntity: any = {
      results_id: resultId,
      created_by: userId,
      handle: knowledgeProduct.handle,
      name: bilateralDto.title,
      description: bilateralDto.description,
      knowledge_product_type: knowledgeProduct.knowledge_product_type,
      licence: knowledgeProduct.licence,
      is_active: true,
    };
    const savedKp =
      await this._resultsKnowledgeProductsRepository.save(kpEntity);

    if (knowledgeProduct.metadataCG) {
      const meta = knowledgeProduct.metadataCG;
      await this._resultsKnowledgeProductMetadataRepository.save({
        result_knowledge_product_id: savedKp.result_knowledge_product_id,
        source: meta.source,
        is_isi: meta.is_isi ?? null,
        accesibility: meta.accessibility ? 'Open' : 'Restricted',
        year: meta.issue_year ?? null,
        online_year: meta.issue_year ?? null,
        is_peer_reviewed: meta.is_peer_reviewed ?? null,
        doi: null,
        created_by: userId,
        is_active: true,
      });
    }
  }
}
