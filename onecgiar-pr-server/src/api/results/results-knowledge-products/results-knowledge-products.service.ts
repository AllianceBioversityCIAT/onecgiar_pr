import { HttpStatus, Injectable } from '@nestjs/common';
import { Like } from 'typeorm';
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
import { ResultsKnowledgeProductsRepository } from './results-knowledge-products.repository';

@Injectable()
export class ResultsKnowledgeProductsService {
  constructor(
    private readonly _resultsKnowledgeProductRepository: ResultsKnowledgeProductsRepository,
    private readonly _handlersError: HandlersError,
    private readonly _versionRepository: VersionRepository,
    private readonly _resultRepository: ResultRepository,
    private readonly _mqapService: MQAPService,
    private readonly _resultsKnowledgeProductMapper: ResultsKnowledgeProductMapper,
  ) {}
  async create(
    createResultsKnowledgeProductDto: CreateResultsKnowledgeProductFromHandleDto,
    user: TokenDto,
  ) {
    try {
      if (
        !createResultsKnowledgeProductDto?.result_id ||
        !createResultsKnowledgeProductDto?.handle
      ) {
        throw {
          response: {},
          message: 'missing data: Result ID or CGSpace Handle',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      const resultKnowledgeProduct: ResultsKnowledgeProduct =
        await this._resultsKnowledgeProductRepository.findOneBy({
          handle: Like(createResultsKnowledgeProductDto.handle),
          is_active: true,
        });

      if (resultKnowledgeProduct) {
        return {
          response: this._resultsKnowledgeProductMapper.entityToDto(
            resultKnowledgeProduct,
          ),
          message: 'The Result Knowledge Product has already been created.',
          status: HttpStatus.CREATED,
        };
      }

      const result: Result = await this._resultRepository.findOneBy({
        id: createResultsKnowledgeProductDto.result_id,
        is_active: true,
      });

      if (!result) {
        throw {
          response: {},
          message: 'Result Not Found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      const currentVersion: Version =
        await this._versionRepository.getBaseVersion();

      const mqapResponse: MQAPResultDto =
        await this._mqapService.getDataFromCGSpaceHandle(
          createResultsKnowledgeProductDto.handle,
        );

      let newKnowledgeProduct: ResultsKnowledgeProduct =
        this._resultsKnowledgeProductMapper.dtoToEntity(mqapResponse);

      newKnowledgeProduct.created_by = user.id;
      newKnowledgeProduct.results_id = result.id;
      newKnowledgeProduct.version_id = currentVersion.id;

      newKnowledgeProduct = await this._resultsKnowledgeProductRepository.save(
        newKnowledgeProduct,
      );

      return {
        response:
          this._resultsKnowledgeProductMapper.entityToDto(newKnowledgeProduct),
        message: 'The Result Knowledge Product has been created successfully',
        status: HttpStatus.CREATED,
      };

      //console.log(newKnowledgeProduct);
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  findAll() {
    return `This action returns all resultsKnowledgeProducts`;
  }

  findOne(id: number) {
    return `This action returns a #${id} resultsKnowledgeProduct`;
  }

  async findOnCGSpace(handle: string): Promise<MQAPResultDto> {
    return this._mqapService.getDataFromCGSpaceHandle(handle);
  }

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
