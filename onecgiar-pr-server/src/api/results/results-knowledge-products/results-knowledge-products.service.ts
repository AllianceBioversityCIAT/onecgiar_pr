import { HttpStatus, Injectable, OnModuleInit } from '@nestjs/common';
import { FindOptionsRelations, FindOptionsWhere, Like } from 'typeorm';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import {
  HandlersError,
  returnErrorDto,
} from '../../../shared/handlers/error.utils';
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
import { ModuleRef } from '@nestjs/core';
import { CreateResultDto } from '../dto/create-result.dto';
import { ClarisaInitiativesRepository } from '../../../clarisa/clarisa-initiatives/ClarisaInitiatives.repository';
import { ResultByLevelRepository } from '../result-by-level/result-by-level.repository';
import { ResultLevelRepository } from '../result_levels/resultLevel.repository';
import { ResultTypesService } from '../result_types/result_types.service';
import { ResultLevel } from '../result_levels/entities/result_level.entity';
import { ResultType } from '../result_types/entities/result_type.entity';
import { VersionsService } from '../versions/versions.service';
import { Year } from '../years/entities/year.entity';
import { YearRepository } from '../years/year.repository';
import { ResultByInitiativesRepository } from '../results_by_inititiatives/resultByInitiatives.repository';
import { ResultTypeRepository } from '../result_types/resultType.repository';
import { EvidencesRepository } from '../evidences/evidences.repository';

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
    private readonly _resultRepository: ResultRepository,
    private readonly _mqapService: MQAPService,
    private readonly _resultsKnowledgeProductMapper: ResultsKnowledgeProductMapper,
    private readonly _resultsKnowledgeProductAltmetricRepository: ResultsKnowledgeProductAltmetricRepository,
    private readonly _resultsKnowledgeProductAuthorRepository: ResultsKnowledgeProductAuthorRepository,
    private readonly _resultsKnowledgeProductInstitutionRepository: ResultsKnowledgeProductInstitutionRepository,
    private readonly _resultsKnowledgeProductKeywordRepository: ResultsKnowledgeProductKeywordRepository,
    private readonly _resultsKnowledgeProductMetadataRepository: ResultsKnowledgeProductMetadataRepository,
    private readonly _evidenceRepository: EvidencesRepository,
    private readonly _clarisaInitiativesRepository: ClarisaInitiativesRepository,
    private readonly _resultByLevelRepository: ResultByLevelRepository,
    private readonly _resultLevelRepository: ResultLevelRepository,
    private readonly _resultTypeRepository: ResultTypeRepository,
    private readonly _versionRepository: VersionRepository,
    private readonly _yearRepository: YearRepository,
    private readonly _resultByInitiativesRepository: ResultByInitiativesRepository,
  ) {}

  private async createOwnerResult(
    createResultDto: CreateResultDto,
    user: TokenDto,
  ): Promise<returnFormatResult | returnErrorDto> {
    try {
      if (
        !createResultDto?.result_name ||
        !createResultDto?.initiative_id ||
        !createResultDto?.result_type_id ||
        !createResultDto?.result_level_id
      ) {
        throw {
          response: {},
          message: 'missing data: Result name, Initiative or Result type',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      const initiative = await this._clarisaInitiativesRepository.findOne({
        where: { id: createResultDto.initiative_id },
      });
      if (!initiative) {
        throw {
          response: {},
          message: 'Initiative Not Found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      const resultByLevel =
        await this._resultByLevelRepository.getByTypeAndLevel(
          createResultDto.result_level_id,
          createResultDto.result_type_id,
        );
      const resultLevel = await this._resultLevelRepository.findOne({
        where: { id: createResultDto.result_level_id },
      });
      const resultType = await this._resultTypeRepository.findOneBy({
        id: createResultDto.result_type_id,
      });
      if (!resultLevel) {
        throw {
          response: {},
          message: 'Result Level not found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      if (!resultByLevel) {
        throw {
          response: {},
          message: 'The type or level is not compatible',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      const rl: ResultLevel = <ResultLevel>resultLevel;

      const currentVersion: Version =
        await this._versionRepository.getBaseVersion();

      if (!currentVersion) {
        throw {
          response: {},
          message: 'Current Version Not Found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      const year: Year = await this._yearRepository.findOne({
        where: { active: true },
      });
      if (!year) {
        throw {
          response: {},
          message: 'Active year Not Found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      const newResultHeader: Result = await this._resultRepository.save({
        created_by: user.id,
        last_updated_by: user.id,
        result_type_id: resultType.id,
        version_id: currentVersion.id,
        title: createResultDto.result_name,
        reported_year_id: year.year,
        result_level_id: rl.id,
      });

      const resultByInitiative = await this._resultByInitiativesRepository.save(
        {
          created_by: newResultHeader.created_by,
          initiative_id: initiative.id,
          initiative_role_id: 1,
          result_id: newResultHeader.id,
          version_id: currentVersion.id,
        },
      );

      return {
        response: newResultHeader,
        message: 'The Result has been created successfully',
        status: HttpStatus.CREATED,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

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

      if (!mqapResponse) {
        throw {
          response: {},
          message: 'Not a valid handle',
          status: HttpStatus.BAD_REQUEST,
        };
      }

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
    try {
      if (!resultsKnowledgeProductDto.result_data) {
        throw {
          response: {},
          message: 'missing data needed to create a result',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      const currentVersion: Version =
        await this._versionRepository.getBaseVersion();

      if (!currentVersion) {
        throw {
          response: {},
          message: 'Current Version Not Found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      let newResultResponse = await this.createOwnerResult(
        resultsKnowledgeProductDto.result_data,
        user,
      );

      if (newResultResponse.status >= 300) {
        throw this._handlersError.returnErrorRes({ error: newResultResponse });
      }

      const newResult = newResultResponse.response as Result;

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

      resultsKnowledgeProductDto.id =
        newKnowledgeProduct.result_knowledge_product_id;

      newKnowledgeProduct =
        this._resultsKnowledgeProductMapper.fillOutRelations(
          resultsKnowledgeProductDto,
          newKnowledgeProduct,
        );

      //updating relations
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

      //updating general result tables
      this._resultRepository.update(
        { id: newResult.id },
        {
          title: resultsKnowledgeProductDto.name,
          description: resultsKnowledgeProductDto.description,
        },
      );

      //TODO: update geoscope table

      //adding link to this knowledge product to existing evidences
      this._evidenceRepository
        .findBy({ link: Like(resultsKnowledgeProductDto.handle) })
        .then((re) => {
          return Promise.all(
            re.map((e) => {
              this._evidenceRepository.update(
                { id: e.id },
                { knowledge_product_related: newResult.id },
              );
            }),
          );
        })
        .catch((error) => this._handlersError.returnErrorRes({ error }));

      //creating own evidence linking it to itself
      this._evidenceRepository.save({
        link: resultsKnowledgeProductDto.handle,
        result_id: newResult.id,
        created_by: user.id,
        version_id: currentVersion.id,
      });

      return {
        response: resultsKnowledgeProductDto,
        message: 'The Result Knowledge Product has been created successfully',
        status: HttpStatus.CREATED,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  async findResultKnowledgeProductByHandle(handle: string) {
    try {
      if ((handle ?? '').length < 1) {
        throw {
          response: {},
          message: 'missing data: handle',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      const knowledgeProduct =
        await this._resultsKnowledgeProductRepository.findOneBy({
          handle: Like(handle),
        });

      if (!knowledgeProduct) {
        throw {
          response: {},
          message: `There is not a Knowledge Product with the handle ${handle}`,
          status: HttpStatus.NOT_FOUND,
        };
      }

      return {
        response:
          this._resultsKnowledgeProductMapper.entityToDto(knowledgeProduct),
        message: 'The Result Knowledge Product has already been created.',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
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
