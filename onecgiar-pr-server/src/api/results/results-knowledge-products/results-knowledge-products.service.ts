import { HttpStatus, Injectable, OnModuleInit } from '@nestjs/common';
import { FindOptionsRelations, FindOptionsWhere, IsNull, Like } from 'typeorm';
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
import { ResultsKnowledgeProductMetadataDto } from './dto/results-knowledge-product-metadata.dto';
import { ResultsKnowledgeProductSaveDto } from './dto/results-knowledge-product-save.dto';
import { KnowledgeProductFairBaseline } from '../knowledge_product_fair_baseline/entities/knowledge_product_fair_baseline.entity';
import { KnowledgeProductFairBaselineRepository } from '../knowledge_product_fair_baseline/knowledge_product_fair_baseline.repository';
import { RoleByUserRepository } from '../../../auth/modules/role-by-user/RoleByUser.repository';
import { ResultRegionRepository } from '../result-regions/result-regions.repository';
import { ClarisaRegionsRepository } from '../../../clarisa/clarisa-regions/ClariasaRegions.repository';
import { ClarisaRegion } from '../../../clarisa/clarisa-regions/entities/clarisa-region.entity';
import { ResultRegion } from '../result-regions/entities/result-region.entity';

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
      result_object: {
        result_region_array: {
          region_object: true,
        },
      },
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
    private readonly _roleByUseRepository: RoleByUserRepository,
    private readonly _resultByInitiativesRepository: ResultByInitiativesRepository,
    private readonly _resultRegionRepository: ResultRegionRepository,
    private readonly _knowledgeProductFairBaselineRepository: KnowledgeProductFairBaselineRepository,
    private readonly _clarisaRegionsRepository: ClarisaRegionsRepository,
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

      const last_code = await this._resultRepository.getLastResultCode();
      const newResultHeader: Result = await this._resultRepository.save({
        created_by: user.id,
        last_updated_by: user.id,
        result_type_id: resultType.id,
        version_id: currentVersion.id,
        title: createResultDto.result_name,
        reported_year_id: year.year,
        result_level_id: rl.id,
        result_code: last_code + 1,
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

  async syncAgain(resultId: number, user: TokenDto) {
    try {
      const resultKnowledgeProduct: ResultsKnowledgeProduct =
        await this._resultsKnowledgeProductRepository.findOne({
          where: {
            results_id: resultId,
          },
          relations: this._resultsKnowledgeProductRelations,
        });

      if (!resultKnowledgeProduct) {
        return {
          response: { title: resultKnowledgeProduct.name },
          message: `A Result Knowledge Product with result_id '${resultId}' does not exist.`,
          status: HttpStatus.BAD_REQUEST,
        };
      }

      let isAdmin: any = await this._roleByUseRepository.isUserAdmin(user.id);

      if (isAdmin?.is_admin == false) {
        if (
          resultKnowledgeProduct.knowledge_product_type == 'Journal Article'
        ) {
          throw {
            response: {},
            message: `The Result with id ${resultId} cannot be manually updated right now`,
            status: HttpStatus.PRECONDITION_FAILED,
          };
        }
      }

      const cgspaceResponse = await this.findOnCGSpace(
        resultKnowledgeProduct.handle,
        false,
      );

      if (cgspaceResponse.status !== HttpStatus.OK) {
        throw this._handlersError.returnErrorRes({ error: cgspaceResponse });
      }

      const newMetadata =
        cgspaceResponse.response as ResultsKnowledgeProductDto;

      let updatedKnowledgeProduct =
        this._resultsKnowledgeProductMapper.updateEntity(
          resultKnowledgeProduct,
          newMetadata,
          user.id,
          resultKnowledgeProduct.results_id,
          resultKnowledgeProduct.version_id,
        );

      updatedKnowledgeProduct.result_knowledge_product_id =
        resultKnowledgeProduct.result_knowledge_product_id;

      this._resultsKnowledgeProductMapper.patchAltmetricData(
        updatedKnowledgeProduct,
        newMetadata,
        true,
      );
      this._resultsKnowledgeProductMapper.patchAuthors(
        updatedKnowledgeProduct,
        newMetadata,
        true,
      );
      this._resultsKnowledgeProductMapper.patchInstitutions(
        updatedKnowledgeProduct,
        newMetadata,
        true,
      );
      this._resultsKnowledgeProductMapper.patchKeywords(
        updatedKnowledgeProduct,
        newMetadata,
        true,
      );
      this._resultsKnowledgeProductMapper.patchMetadata(
        updatedKnowledgeProduct,
        newMetadata,
        true,
      );
      this._resultsKnowledgeProductMapper.patchRegions(
        updatedKnowledgeProduct,
        newMetadata,
        true,
      );
      updatedKnowledgeProduct =
        await this._resultsKnowledgeProductRepository.save(
          updatedKnowledgeProduct,
        );

      //updating general result tables
      await this._resultRepository.update(
        { id: resultId },
        {
          title: newMetadata.title,
          description: newMetadata.description,
        },
      );

      //updating relations
      await this._resultsKnowledgeProductAltmetricRepository.save(
        updatedKnowledgeProduct.result_knowledge_product_altmetric_array ?? [],
      );
      await this._resultsKnowledgeProductAuthorRepository.save(
        updatedKnowledgeProduct.result_knowledge_product_author_array ?? [],
      );
      await this._resultsKnowledgeProductInstitutionRepository.save(
        updatedKnowledgeProduct.result_knowledge_product_institution_array ??
          {},
      );
      await this._resultsKnowledgeProductKeywordRepository.save(
        updatedKnowledgeProduct.result_knowledge_product_keyword_array ?? [],
      );
      await this._resultsKnowledgeProductMetadataRepository.save(
        updatedKnowledgeProduct.result_knowledge_product_metadata_array ?? [],
      );

      //geolocation
      await this.updateGeoLocation(
        updatedKnowledgeProduct.result_object,
        updatedKnowledgeProduct,
        newMetadata,
      );

      await this._resultRegionRepository.save(
        updatedKnowledgeProduct.result_object.result_region_array ?? [],
      );

      return {
        response: updatedKnowledgeProduct,
        message: 'The Result Knowledge Product has been updated successfully',
        status: HttpStatus.CREATED,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  async findOnCGSpace(handle: string, validateExisting: boolean = true) {
    try {
      if (!handle) {
        throw {
          response: {},
          message: 'Missing data: handle',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      const hasQuery = (handle ?? '').indexOf('?');
      const linkSplit = (handle ?? '')
        .slice(0, hasQuery != -1 ? hasQuery : handle.length)
        .split('/');
      const handleId = linkSplit.slice(linkSplit.length - 2).join('/');

      let response: ResultsKnowledgeProductDto = null;
      if (validateExisting) {
        const resultKnowledgeProduct: ResultsKnowledgeProduct =
          await this._resultsKnowledgeProductRepository.findOne({
            where: {
              handle: Like(handleId),
              result_object: {
                is_active: true,
              },
            },
            relations: this._resultsKnowledgeProductRelations,
          });

        if (resultKnowledgeProduct) {
          const infoToMap = await this._resultRepository.getResultInfoToMap(
            resultKnowledgeProduct.results_id,
          );
          return {
            response: infoToMap,
            message: 'The Result Knowledge Product has already been created.',
            status: HttpStatus.CONFLICT,
          };
        }
      }

      const mqapResponse: MQAPResultDto =
        await this._mqapService.getDataFromCGSpaceHandle(handle);

      if (!mqapResponse) {
        throw {
          response: {},
          message: `Please add a valid handle (received: ${handle}). Only handles from CGSpace can be reported.`,
          status: HttpStatus.BAD_REQUEST,
        };
      }

      const cgYear =
        this._resultsKnowledgeProductMapper.getPublicationYearFromMQAPResponse(
          mqapResponse,
        ) ?? 0;

      if (cgYear < 2022) {
        throw {
          response: { title: mqapResponse?.Title },
          message:
            "You can't report knowledge products older than 2022 for the current reporting " +
            'cycle. In case you need support to correct the publication year of ' +
            'this knowledge product, please contact the librarian of your Center.',
          status: HttpStatus.UNPROCESSABLE_ENTITY,
        };
      } else if (
        cgYear > 2022 &&
        (mqapResponse?.Type ?? '') != 'Journal Article'
      ) {
        throw {
          response: { title: mqapResponse?.Title },
          message:
            'Only Journal Articles from 2022 and 2023 will be allowed for this ' +
            "reporting cycle. The knowledge product's type you are trying to create is " +
            `"${
              mqapResponse?.Type ?? 'Not Defined'
            }" and the issue year is "${cgYear}". ` +
            'In case you need support to correct the issue year of ' +
            'this knowledge product, please contact the librarian of your Center.',
          status: HttpStatus.UNPROCESSABLE_ENTITY,
        };
      }

      response =
        this._resultsKnowledgeProductMapper.mqapResponseToKnowledgeProductDto(
          mqapResponse,
        );

      return {
        response: response,
        message: `The Result Knowledge Product ${
          !validateExisting ? 'is yet to be created' : 'can be updated'
        }`,
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
        new ResultsKnowledgeProduct();
      newKnowledgeProduct = this._resultsKnowledgeProductMapper.updateEntity(
        newKnowledgeProduct,
        resultsKnowledgeProductDto,
        user.id,
        newResult.id,
        currentVersion.id,
      );

      newKnowledgeProduct.is_melia = false;
      newKnowledgeProduct.result_object = newResult;

      newKnowledgeProduct = await this._resultsKnowledgeProductRepository.save(
        newKnowledgeProduct,
      );

      resultsKnowledgeProductDto.id = newResult.id;

      newKnowledgeProduct =
        this._resultsKnowledgeProductMapper.populateKPRelations(
          newKnowledgeProduct,
          resultsKnowledgeProductDto,
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

      //geolocation
      await this.updateGeoLocation(
        newResult,
        newKnowledgeProduct,
        resultsKnowledgeProductDto,
      );

      await this._resultRegionRepository.save(
        newResult.result_region_array ?? [],
      );

      const fairBaseline = new KnowledgeProductFairBaseline();

      fairBaseline.findable = newKnowledgeProduct.findable;
      fairBaseline.accesible = newKnowledgeProduct.accesible;
      fairBaseline.interoperable = newKnowledgeProduct.interoperable;
      fairBaseline.reusable = newKnowledgeProduct.reusable;
      fairBaseline.created_by = newKnowledgeProduct.created_by;
      fairBaseline.knowledge_product_id =
        newKnowledgeProduct.result_knowledge_product_id;

      await this._knowledgeProductFairBaselineRepository.save(fairBaseline);

      //updating general result tables
      this._resultRepository.update(
        { id: newResult.id },
        {
          title: resultsKnowledgeProductDto.title,
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
                {
                  knowledge_product_related: newResult.id,
                  result_id: newResult.id,
                },
              );
            }),
          );
        })
        .catch((error) => this._handlersError.returnErrorRes({ error }));

      //creating own evidence linking it to itself
      this._evidenceRepository.save({
        link: `https://cgspace.cgiar.org/handle/${resultsKnowledgeProductDto.handle}`,
        result_id: newResult.id,
        created_by: user.id,
        version_id: currentVersion.id,
        is_supplementary: false,
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

  private async updateGeoLocation(
    newResult: Result,
    newKnowledgeProduct: ResultsKnowledgeProduct,
    resultsKnowledgeProductDto: ResultsKnowledgeProductDto,
  ) {
    //load up the world region tree
    const worldTree = await this._clarisaRegionsRepository.loadWorldTree();

    //cleaning regions
    let resultRegions = (newResult.result_region_array ?? [])
      .filter((rr) => rr.region_id)
      .map((rr) => {
        rr.region_object = worldTree.findById(rr.region_id)?.data;
        return rr;
      });
    let regions = resultRegions.map((rr) => rr.region_object);

    let cleanedCGRegions = [];
    for (const region of regions) {
      //1. we check if the region has been added before. if so, we ignore it
      if (cleanedCGRegions.some((r) => r.um49Code == region.um49Code)) {
        continue;
      }

      //2. we check if the cleanedRegions array at least one descendant.
      if (cleanedCGRegions.some((r) => worldTree.isDescendant(r, region))) {
        //2.a we ignore it, as it has a descendant already in the list
        continue;
      }

      //3. we check if the cleanedRegions array has one or multiple ancestors
      const ancestors = cleanedCGRegions.filter((r) =>
        worldTree.isAncestor(r, region),
      );
      //3.a if there are ancestors, we remove them from the cleanedRegions list
      cleanedCGRegions = cleanedCGRegions.filter(
        (r) => !ancestors.find((a) => a.um49Code == r.um49Code),
      );

      //4. we add it to the cleanedRegions list
      cleanedCGRegions.push(region);
    }

    /*
      now that we have all the "leafs" from the regions coming from CGSpace,
      we need to verify if the regions are indeed leafs or not. so, using the
      worldTree, we find the region on the tree and get all the descendants
      that are leaves. if the region itself is a leaf, it should prevail. if
      not, the region descendants will be used instead
    */
    let processedCleanedRegions: ClarisaRegion[] = cleanedCGRegions.flatMap(
      (crn) => {
        const descendants = worldTree.getAllDescendantRegions(crn, true);
        return descendants.length == 0 ? [crn] : descendants;
      },
    );

    /* 
      we check if the region was already mapped to the result. if it was, we 
      remove it from the processedCleanedRegions and add the mapped region to the
      final cleanedResultRegions. if not, nothing happens
    */
    let cleanedResultRegions: ResultRegion[] = [];
    for (const rr of resultRegions) {
      const inProcessed = processedCleanedRegions.findIndex(
        (cr) => rr.region_id == cr.um49Code,
      );
      if (inProcessed > -1) {
        cleanedResultRegions.push(rr);
        processedCleanedRegions.splice(inProcessed, 1);
      } else {
        if (rr.result_region_id) {
          rr.is_active = false;
          cleanedResultRegions.push(rr);
        }
      }
    }

    /*
      if there are still regions that are not mapped to the result, we create them
    */
    for (const pcr of processedCleanedRegions) {
      const newResultRegion = new ResultRegion();
      newResultRegion.result_id = newResult.id;
      newResultRegion.region_id = pcr.um49Code;

      cleanedResultRegions.push(newResultRegion);
    }
    //end cleaning regions

    newResult.result_region_array = cleanedResultRegions;
    newResult.has_regions = (newResult.result_region_array ?? []).length != 0;
    const country_array = (newKnowledgeProduct.cgspace_countries ?? '').split(
      '; ',
    );
    newResult.has_countries =
      (newKnowledgeProduct.cgspace_countries ?? '').length != 0;
    //newResult.has_regions = (newKnowledgeProduct.cgspace_regions??'').length != 0;

    if (resultsKnowledgeProductDto.is_global_geoscope) {
      newResult.geographic_scope_id = 1;
    } else if (!newResult.has_countries && !newResult.has_regions) {
      /*
      in case we do not explicitly receive "global" as a region from M-QAP,
      but the countries and regions array is empty, we are going to flag this
      as "to be determined"
      */
      newResult.geographic_scope_id = 50;
    } else {
      if (newResult.has_regions) {
        newResult.geographic_scope_id = 2;
      } else {
        newResult.geographic_scope_id = country_array.length > 1 ? 3 : 4;
      }
    }

    //updating general result tables
    this._resultRepository.update(
      { id: newResult.id },
      {
        geographic_scope_id: newResult.geographic_scope_id,
        has_countries: newResult.has_countries,
        has_regions: newResult.has_regions,
      },
    );
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

      const response =
        this._resultsKnowledgeProductMapper.entityToDto(knowledgeProduct);
      return {
        response,
        message: 'The Result Knowledge Product has already been created.',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  async findOneByKnowledgeProductId(id: number) {
    try {
      if (id < 1) {
        throw {
          response: {},
          message: 'missing data: id',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      const knowledgeProduct =
        await this._resultsKnowledgeProductRepository.findOneBy({
          result_knowledge_product_id: id,
        });

      if (!knowledgeProduct) {
        throw {
          response: {},
          message: `There is not a Knowledge Product with the id ${id}`,
          status: HttpStatus.NOT_FOUND,
        };
      }

      const response =
        this._resultsKnowledgeProductMapper.entityToDto(knowledgeProduct);

      // validations
      response.warnings = this.getWarnings(response);

      return {
        response,
        message: 'The Result Knowledge Product has already been created.',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  async findOneByResultId(id: number) {
    try {
      if (id < 1) {
        throw {
          response: {},
          message: 'missing data: id',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      const result = await this._resultRepository.findOneBy({
        id,
      });

      if (!result) {
        throw {
          response: {},
          message: `There is not a Result with the id ${id}`,
          status: HttpStatus.NOT_FOUND,
        };
      }

      const knowledgeProduct =
        await this._resultsKnowledgeProductRepository.findOne({
          where: { results_id: result.id },
          relations: this._resultsKnowledgeProductRelations,
        });

      if (!knowledgeProduct) {
        throw {
          response: {},
          message: `The Result with id ${id} does not have a linked Knowledge Product Details`,
          status: HttpStatus.NOT_FOUND,
        };
      }

      const response =
        this._resultsKnowledgeProductMapper.entityToDto(knowledgeProduct);

      // validations
      response.warnings = this.getWarnings(response);

      return {
        response,
        message: 'The Result Knowledge Product has already been created.',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  getWarnings(response: ResultsKnowledgeProductDto): string[] {
    const warnings: string[] = [];

    if (response.doi?.length < 1) {
      warnings.push(
        'Journal articles without the DOI will directly go to ' +
          'the Quality Assurance. In case you need support to add the DOI in CGSPACE, ' +
          'please contact the librarian of your Center.',
      );
    }

    if (response.doi?.length > 1 && !response.altmetric_detail_url) {
      warnings.push(
        'Please make sure the DOI is valid otherwise the journal article will directly go ' +
          'to the Quality Assurance. In case you need support to correct the DOI in CGSPACE, ' +
          'please contact the librarian of your Center.',
      );
    }

    const cgspaceMetadata = response.metadata.find(
      (m) => m.source === 'CGSpace',
    );
    const wosMetadata = response.metadata.find((m) => m.source !== 'CGSpace');

    if (response.type == 'Journal Article') {
      if (
        (cgspaceMetadata?.issue_year ?? 0) !== (wosMetadata?.issue_year ?? 0)
      ) {
        warnings.push(
          'The year of publication is automatically retrieved from an external service (Web ' +
            'of Science or Scopus). In case of inconsistencies, the CGIAR Quality Assurance ' +
            'team will manually validate the record. We remind you that only knowledge products ' +
            'published in 2022 can be reported.',
        );
      }

      if ((wosMetadata?.issue_year ?? 0) < 1) {
        warnings.push(
          'The year of publication is automatically retrieved from an external service (Web ' +
            'of Science or Scopus). If the year does not show, it might be due to a delay in ' +
            'the indexing. The CGIAR Quality Assurance team will validate this information at ' +
            'the end of the reporting cycle.',
        );
      }
    }

    return warnings;
  }

  async upsert(
    id: number,
    user: TokenDto,
    sectionSevenData: ResultsKnowledgeProductSaveDto,
  ) {
    try {
      if (id < 1) {
        throw {
          response: {},
          message: 'missing data: id',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      const result = await this._resultRepository.findOneBy({
        id,
      });

      if (!result) {
        throw {
          response: {},
          message: `There is not a Result with the id ${id}`,
          status: HttpStatus.NOT_FOUND,
        };
      }

      let knowledgeProduct =
        await this._resultsKnowledgeProductRepository.findOne({
          where: { results_id: result.id },
        });

      if (!knowledgeProduct) {
        throw {
          response: {},
          message: `The Result with id ${id} does not have a linked Knowledge Product Details`,
          status: HttpStatus.NOT_FOUND,
        };
      }

      if (!sectionSevenData.isMeliaProduct) {
        sectionSevenData.ostSubmitted = null;
        sectionSevenData.ostMeliaId = null;
        sectionSevenData.clarisaMeliaTypeId = null;
      }

      if (sectionSevenData.ostSubmitted) {
        sectionSevenData.clarisaMeliaTypeId = null;
      } else {
        sectionSevenData.ostMeliaId = null;
      }

      await this._resultsKnowledgeProductRepository.update(
        {
          result_knowledge_product_id:
            knowledgeProduct.result_knowledge_product_id,
        },
        {
          last_updated_by: user.id,
          is_melia: sectionSevenData.isMeliaProduct,
          melia_previous_submitted: sectionSevenData.ostSubmitted,
          melia_type_id: sectionSevenData.clarisaMeliaTypeId,
          ost_melia_study_id: sectionSevenData.ostMeliaId,
        },
      );

      knowledgeProduct = await this._resultsKnowledgeProductRepository.findOne({
        where: { results_id: result.id },
        relations: this._resultsKnowledgeProductRelations,
      });

      return {
        response: {},
        message: 'The section has been updated successfully.',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  async findAllActiveKps() {
    try {
      const kps = await this._resultsKnowledgeProductRepository.find({
        where: {
          is_active: true,
          result_object: {
            is_active: true,
          },
        },
        relations: {
          result_object: true,
        },
      });

      return {
        response: kps,
        message:
          'The active knowledge products have been retrieved successfully',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }
}
