import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  BilateralResultTypeHandler,
  HandlerAfterCreateContext,
  HandlerInitializeContext,
  HandlerInitializeResult,
} from './bilateral-result-type-handler.interface';
import { ResultTypeEnum } from '../../../shared/constants/result-type.enum';
import { ResultStatusData } from '../../../shared/constants/result-status.enum';
import { ResultRepository } from '../../results/result.repository';
import { ResultsKnowledgeProductsService } from '../../results/results-knowledge-products/results-knowledge-products.service';
import { SourceEnum } from '../../results/entities/result.entity';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';

@Injectable()
export class KnowledgeProductBilateralHandler
  implements BilateralResultTypeHandler
{
  readonly resultType = ResultTypeEnum.KNOWLEDGE_PRODUCT;
  private readonly logger = new Logger(KnowledgeProductBilateralHandler.name);

  constructor(
    private readonly _resultRepository: ResultRepository,
    private readonly _resultsKnowledgeProductsService: ResultsKnowledgeProductsService,
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

    const handle = bilateralDto.knowledge_product.handle;
    if (!handle) {
      throw new BadRequestException(
        'knowledge_product.handle is required for KNOWLEDGE_PRODUCT results.',
      );
    }

    // Duplicate handle and MQAP/year validation are done in BilateralService before any insert
    const resultHeader = await this._resultRepository.save({
      created_by: context.userId,
      version_id: context.version.id,
      title:
        bilateralDto.title ||
        `Loading from CGSpace: ${bilateralDto.knowledge_product.handle}`,
      description:
        bilateralDto.description || 'Metadata will be loaded from CGSpace',
      reported_year_id: context.year.year,
      result_code: 0,
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
      status_id: ResultStatusData.PendingReview.value,
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
    if (!knowledgeProduct?.handle) {
      throw new BadRequestException(
        'knowledge_product.handle is required for KNOWLEDGE_PRODUCT results to fetch metadata from CGSpace.',
      );
    }

    this.logger.log(
      `Fetching KP metadata from DSpace for handle: ${knowledgeProduct.handle}`,
    );

    const userToken: TokenDto = {
      id: userId,
      email: '',
      first_name: '',
      last_name: '',
    } as TokenDto;

    try {
      await this._resultsKnowledgeProductsService.populateKPFromCGSpace(
        resultId,
        knowledgeProduct.handle,
        userToken,
      );

      this.logger.log(
        `Successfully populated KP from DSpace for result ${resultId} with handle ${knowledgeProduct.handle}`,
      );
    } catch (error) {
      this.logger.error(
        `Error populating KP from DSpace for result ${resultId} with handle ${knowledgeProduct.handle}:`,
        error,
      );
      throw new BadRequestException(
        `Failed to fetch and populate Knowledge Product metadata from DSpace: ${error.message || 'Unknown error'}`,
      );
    }
  }
}
