import { HttpStatus, Injectable } from '@nestjs/common';
import { CreateResultsFrameworkResultDto } from '../../../dto/create-results-framework.dto';
import { TokenDto } from '../../../../../shared/globalInterfaces/token.dto';
import { ResultTypeEnum } from '../../../../../shared/constants/result-type.enum';
import { ResultsService } from '../../../../results/results.service';
import { ResultsKnowledgeProductsService } from '../../../../results/results-knowledge-products/results-knowledge-products.service';
import { ResultsKnowledgeProductDto } from '../../../../results/results-knowledge-products/dto/results-knowledge-product.dto';
import { throwServiceError } from '../../../../../shared/utils/service-error.util';

export type CreateFrameworkResultEntityResult = {
  createdResultId: number;
  knowledgeProductResponse?: ResultsKnowledgeProductDto;
  initiativeId: number;
};

@Injectable()
export class CreateFrameworkResultEntityService {
  constructor(
    private readonly _resultsService: ResultsService,
    private readonly _resultsKnowledgeProductsService: ResultsKnowledgeProductsService,
  ) {}

  async execute(
    payload: CreateResultsFrameworkResultDto,
    user: TokenDto,
  ): Promise<CreateFrameworkResultEntityResult> {
    if (!payload?.result) {
      throwServiceError('The result header information is required.');
    }

    const baseResultDto = { ...payload.result };
    const initiativeId = Number(baseResultDto.initiative_id);

    if (!Number.isFinite(initiativeId) || initiativeId <= 0) {
      throwServiceError(
        'A valid initiative identifier is required to create the result.',
      );
    }

    let createdResultId: number;
    let knowledgeProductResponse: ResultsKnowledgeProductDto | undefined;

    if (
      Number(baseResultDto.result_type_id) === ResultTypeEnum.KNOWLEDGE_PRODUCT
    ) {
      ({ createdResultId, knowledgeProductResponse } =
        await this._createKnowledgeProductResult(payload, baseResultDto, user));
    } else {
      createdResultId = await this._createStandardResult(baseResultDto, user);
    }

    if (!Number.isFinite(createdResultId) || createdResultId <= 0) {
      throwServiceError(
        'Result creation failed to return a valid identifier.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return { createdResultId, knowledgeProductResponse, initiativeId };
  }

  private async _createKnowledgeProductResult(
    payload: CreateResultsFrameworkResultDto,
    baseResultDto: CreateResultsFrameworkResultDto['result'],
    user: TokenDto,
  ): Promise<{
    createdResultId: number;
    knowledgeProductResponse: ResultsKnowledgeProductDto;
  }> {
    if (!payload.knowledge_product) {
      throwServiceError(
        'Knowledge product payload is required for knowledge product results.',
      );
    }

    if (
      (!baseResultDto.result_name ||
        `${baseResultDto.result_name}`.trim() === '') &&
      payload.knowledge_product?.title
    ) {
      baseResultDto.result_name = payload.knowledge_product.title;
    }

    if (payload.knowledge_product.result_data) {
      payload.knowledge_product.result_data = {
        ...payload.knowledge_product.result_data,
        ...baseResultDto,
      };
    } else {
      payload.knowledge_product.result_data = baseResultDto;
    }

    const knowledgeCreation =
      await this._resultsKnowledgeProductsService.create(
        payload.knowledge_product,
        user,
      );

    if (knowledgeCreation.status >= HttpStatus.BAD_REQUEST) {
      throw knowledgeCreation;
    }

    const knowledgeProductResponse =
      knowledgeCreation.response as ResultsKnowledgeProductDto;

    return {
      createdResultId: Number(knowledgeProductResponse.id),
      knowledgeProductResponse,
    };
  }

  private async _createStandardResult(
    baseResultDto: CreateResultsFrameworkResultDto['result'],
    user: TokenDto,
  ): Promise<number> {
    const creationResponse = await this._resultsService.createOwnerResultV2(
      baseResultDto,
      user,
    );

    if (creationResponse.status >= HttpStatus.BAD_REQUEST) {
      throw creationResponse;
    }

    return Number((creationResponse.response as { id: number }).id);
  }
}
