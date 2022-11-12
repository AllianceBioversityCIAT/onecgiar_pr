import { HttpStatus, Injectable } from '@nestjs/common';
import { FindOptionsRelations, FindOptionsWhere, Like } from 'typeorm';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { MQAPResultDto } from '../../m-qap/dtos/m-qap.dto';
import { MQAPService } from '../../m-qap/m-qap.service';
import { Result } from '../entities/result.entity';
import { ResultRepository } from '../result.repository';
import { Version } from '../versions/entities/version.entity';
import { VersionRepository } from '../versions/version.repository';
import { CreateResultsKnowledgeProductFromHandleDto } from './dto/create-results-knowledge-product-from-handle.dto';
import { UpdateResultsKnowledgeProductDto } from './dto/update-results-knowledge-product.dto';
import { ResultsKnowledgeProduct } from './entities/results-knowledge-product.entity';
import { ResultsKnowledgeProductMapper } from './results-knowledge-products.mapper';
import { ResultsKnowledgeProductsRepository } from './repositories/results-knowledge-products.repository';
import { ResultsKnowledgeProductAltmetricRepository } from './repositories/results-knowledge-product-altmetrics.repository';
import { ResultsKnowledgeProductAuthorRepository } from './repositories/results-knowledge-product-authors.repository';
import { ResultsKnowledgeProductInstitutionRepository } from './repositories/results-knowledge-product-institution.repository';
import { ResultsKnowledgeProductKeywordRepository } from './repositories/results-knowledge-product-keywords.repository';
import { ResultsKnowledgeProductMetadataRepository } from './repositories/results-knowledge-product-metadata.repository';
import { ResultsKnowledgeProductDto } from './dto/results-knowledge-product.dto';
import { ResultsService } from '../results.service';
import { returnFormatResult } from '../dto/return-format-result.dto';

@Injectable()
export class ResultsKnowledgeProductsService {
  private readonly _resultsKnowledgeProductRelations: FindOptionsRelations<ResultsKnowledgeProduct> =
    {
      result_knowledge_product_altmetric_array: true,
      result_knowledge_product_institution_array: {
        results_by_institutions_object: true,
      },
      result_knowledge_product_metadata_array: true,
      result_knowledge_product_keyword_array: true,
      result_knowledge_product_author_array: true,
    };

  private readonly _resultsKnowledgeProductWhere: FindOptionsWhere<ResultsKnowledgeProduct> =
    {
      is_active: true,
      result_knowledge_product_altmetric_array: {
        is_active: true,
      },
      result_knowledge_product_institution_array: {
        is_active: true,
      },
      result_knowledge_product_metadata_array: {
        is_active: true,
      },
      result_knowledge_product_keyword_array: {
        is_active: true,
      },
      result_knowledge_product_author_array: {
        is_active: true,
      },
    };

  constructor(
    private readonly _resultsKnowledgeProductRepository: ResultsKnowledgeProductsRepository,
    private readonly _handlersError: HandlersError,
    private readonly _versionRepository: VersionRepository,
    private readonly _resultRepository: ResultRepository,
    private readonly _mqapService: MQAPService,
    private readonly _resultsKnowledgeProductMapper: ResultsKnowledgeProductMapper,
    private readonly _resultsKnowledgeProductAltmetricRepository: ResultsKnowledgeProductAltmetricRepository,
    private readonly _resultsKnowledgeProductAuthorRepository: ResultsKnowledgeProductAuthorRepository,
    private readonly _resultsKnowledgeProductInstitutionRepository: ResultsKnowledgeProductInstitutionRepository,
    private readonly _resultsKnowledgeProductKeywordRepository: ResultsKnowledgeProductKeywordRepository,
    private readonly _resultsKnowledgeProductMetadataRepository: ResultsKnowledgeProductMetadataRepository,
  ) {}
  async findOnCGSpace(handle: string) {
    try {
      if (!handle) {
        throw {
          response: {},
          message: 'Missing data: handle',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      let response: ResultsKnowledgeProductDto = null;
      const resultKnowledgeProduct: ResultsKnowledgeProduct =
        await this._resultsKnowledgeProductRepository.findOne({
          where: {
            handle: Like(handle),
          },
          relations: this._resultsKnowledgeProductRelations,
        });

      if (resultKnowledgeProduct) {
        response = this._resultsKnowledgeProductMapper.entityToDto(
          resultKnowledgeProduct,
        );

        return {
          response: response,
          message: 'The Result Knowledge Product has already been created.',
          status: HttpStatus.OK,
        };
      }

      const mqapResponse: MQAPResultDto =
        await this._mqapService.getDataFromCGSpaceHandle(handle);

      response =
        this._resultsKnowledgeProductMapper.mqapResponseToKnowledgeProductDto(
          mqapResponse,
        );

      return {
        response: response,
        message: 'The Result Knowledge Product is yet to be created',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  async create(
    resultsKnowledgeProductDto: ResultsKnowledgeProductDto,
    user: TokenDto,
  ) {
    const currentVersion: Version =
      await this._versionRepository.getBaseVersion();

    if (!resultsKnowledgeProductDto.result_data) {
      throw {
        response: {},
        message: 'missing data needed to create a result',
        status: HttpStatus.BAD_REQUEST,
      };
    }

    let newResult: Result = null; /*await this._resultService.createOwnerResult(
      resultsKnowledgeProductDto.result_data,
      user,
    );

    if (newResult.status >= 300) {
      throw this._handlersError.returnErrorRes({ error: newResult });
    }*/

    let newKnowledgeProduct: ResultsKnowledgeProduct =
      this._resultsKnowledgeProductMapper.dtoToEntity(
        resultsKnowledgeProductDto,
        user.id,
        newResult.id,
        currentVersion.id,
      );

    newKnowledgeProduct = await this._resultsKnowledgeProductRepository.save(
      newKnowledgeProduct,
    );

    newKnowledgeProduct = this._resultsKnowledgeProductMapper.fillOutRelations(
      resultsKnowledgeProductDto,
      newKnowledgeProduct,
    );

    await this._resultsKnowledgeProductAltmetricRepository.save(
      newKnowledgeProduct.result_knowledge_product_altmetric_array ?? [],
    );
    await this._resultsKnowledgeProductAuthorRepository.save(
      newKnowledgeProduct.result_knowledge_product_author_array ?? [],
    );
    await this._resultsKnowledgeProductInstitutionRepository.save(
      newKnowledgeProduct.result_knowledge_product_institution_array ?? {},
    );
    await this._resultsKnowledgeProductKeywordRepository.save(
      newKnowledgeProduct.result_knowledge_product_keyword_array ?? [],
    );
    await this._resultsKnowledgeProductMetadataRepository.save(
      newKnowledgeProduct.result_knowledge_product_metadata_array ?? [],
    );

    const response = { ...resultsKnowledgeProductDto };

    return {
      response: response,
      message: 'The Result Knowledge Product has been created successfully',
      status: HttpStatus.CREATED,
    };
  }

  async findResultKnowledgeProductByHandle(handle: string) {
    return this._resultsKnowledgeProductRepository
      .findOneByOrFail({ handle: Like(handle) })
      .then((rkp) => {
        return {
          response: this._resultsKnowledgeProductMapper.entityToDto(rkp),
          message: 'The Result Knowledge Product has already been created.',
          status: HttpStatus.OK,
        };
      })
      .catch((err) => {
        return this._handlersError.returnErrorRes({ error: err });
      });
  }

  findOne(id: number) {
    return `This action returns a #${id} resultsKnowledgeProduct`;
  }

  /*async findOnCGSpace(handle: string): Promise<MQAPResultDto> {
    return this._mqapService.getDataFromCGSpaceHandle(handle);
  }*/

  update(
    id: number,
    updateResultsKnowledgeProductDto: UpdateResultsKnowledgeProductDto,
  ) {
    return `This action updates a #${id} resultsKnowledgeProduct`;
  }

  remove(id: number) {
    return `This action removes a #${id} resultsKnowledgeProduct`;
  }
}
