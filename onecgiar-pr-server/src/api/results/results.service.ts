import {
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  Optional,
} from '@nestjs/common';
import { CreateResultDto } from './dto/create-result.dto';
import { ResultRepository } from './result.repository';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';
import { ClarisaInitiativesRepository } from '../../clarisa/clarisa-initiatives/ClarisaInitiatives.repository';
import { ClarisaInitiative } from '../../clarisa/clarisa-initiatives/entities/clarisa-initiative.entity';
import {
  HandlersError,
  ReturnResponse,
  ReturnResponseDto,
  returnErrorDto,
} from '../../shared/handlers/error.utils';
import { ResultTypesService } from './result_types/result_types.service';
import { ResultType } from './result_types/entities/result_type.entity';
import { returnFormatResult } from './dto/return-format-result.dto';
import {
  ScienceProgramProgressDto,
  ScienceProgramProgressResponseDto,
  StatusBreakdownDto,
  VersionProgressDto,
} from './dto/science-program-progress.dto';
import { Result } from './entities/result.entity';
import { CreateGeneralInformationResultDto } from './dto/create-general-information-result.dto';
import { YearRepository } from './years/year.repository';
import { Year } from './years/entities/year.entity';
import { ResultByEvidencesRepository } from './results_by_evidences/result_by_evidences.repository';
import { ResultByIntitutionsRepository } from './results_by_institutions/result_by_intitutions.repository';
import { ResultByInitiativesRepository } from './results_by_inititiatives/resultByInitiatives.repository';
import { ResultByIntitutionsTypeRepository } from './results_by_institution_types/result_by_intitutions_type.repository';
import { DepthSearch } from './dto/depth-search.dto';
import { ResultLevelRepository } from './result_levels/resultLevel.repository';
import { ResultByLevelRepository } from './result-by-level/result-by-level.repository';
import { ResultLevel } from './result_levels/entities/result_level.entity';
import { ResultLegacyRepository } from './legacy-result/legacy-result.repository';
import { MapLegacy } from './dto/map-legacy.dto';
import { ClarisaInstitutionsRepository } from '../../clarisa/clarisa-institutions/ClariasaInstitutions.repository';
import { ClarisaInstitutionsTypeRepository } from '../../clarisa/clarisa-institutions-type/ClariasaInstitutionsType.repository';
import { GenderTagRepository } from './gender_tag_levels/genderTag.repository';
import { ResultsByInstitution } from './results_by_institutions/entities/results_by_institution.entity';
import { ResultsByInstitutionType } from './results_by_institution_types/entities/results_by_institution_type.entity';
import { CreateResultGeoDto } from './dto/create-result-geo-scope.dto';
import { ResultRegionsService } from './result-regions/result-regions.service';
import { ResultCountriesService } from './result-countries/result-countries.service';
import { ResultRegionRepository } from './result-regions/result-regions.repository';
import { ResultCountryRepository } from './result-countries/result-countries.repository';
import { ResultsKnowledgeProductsRepository } from './results-knowledge-products/repositories/results-knowledge-products.repository';
import { ResultCountry } from './result-countries/entities/result-country.entity';
import { ResultRegion } from './result-regions/entities/result-region.entity';
import { ElasticService } from '../../elastic/elastic.service';
import { ElasticOperationDto } from '../../elastic/dto/elastic-operation.dto';
import process from 'process';
import { resultValidationRepository } from './results-validation-module/results-validation-module.repository';
import { ResultsKnowledgeProductAuthorRepository } from './results-knowledge-products/repositories/results-knowledge-product-authors.repository';
import { ResultsKnowledgeProductInstitutionRepository } from './results-knowledge-products/repositories/results-knowledge-product-institution.repository';
import { ResultsKnowledgeProductMetadataRepository } from './results-knowledge-products/repositories/results-knowledge-product-metadata.repository';
import { ResultsKnowledgeProductKeywordRepository } from './results-knowledge-products/repositories/results-knowledge-product-keywords.repository';
import { ResultsKnowledgeProductAltmetricRepository } from './results-knowledge-products/repositories/results-knowledge-product-altmetrics.repository';
import { LogRepository } from '../../connection/dynamodb-logs/dynamodb-logs.repository';
import { Actions } from 'src/connection/dynamodb-logs/dto/enumAction.const';
import { VersioningService } from '../versioning/versioning.service';
import { AppModuleIdEnum, RoleEnum } from 'src/shared/constants/role-type.enum';
import { InstitutionRoleEnum } from './results_by_institutions/entities/institution_role.enum';
import { ResultsKnowledgeProductFairScoreRepository } from './results-knowledge-products/repositories/results-knowledge-product-fair-scores.repository';
import { ResultsInvestmentDiscontinuedOptionRepository } from './results-investment-discontinued-options/results-investment-discontinued-options.repository';
import { ResultInitiativeBudgetRepository } from './result_budget/repositories/result_initiative_budget.repository';
import { ResultsCenterRepository } from './results-centers/results-centers.repository';
import { GeneralInformationDto } from './dto/general-information.dto';
import { EnvironmentExtractor } from '../../shared/utils/environment-extractor';
import { AdUserRepository, AdUserService } from '../ad_users';
import { InitiativeEntityMapRepository } from '../initiative_entity_map/initiative_entity_map.repository';
import { In, IsNull } from 'typeorm';
import { RoleByUserRepository } from '../../auth/modules/role-by-user/RoleByUser.repository';
import { NotificationService } from '../notification/notification.service';
import {
  NotificationLevelEnum,
  NotificationTypeEnum,
} from '../notification/enum/notification.enum';
import { ImpactAreasScoresComponentRepository } from './impact_areas_scores_components/repositories/impact_areas_scores_components.repository';
import { ResultsInnovationsDev } from './summary/entities/results-innovations-dev.entity';
import { ResultTypeEnum } from '../../shared/constants/result-type.enum';
import { ResultsTocResultRepository } from './results-toc-results/repositories/results-toc-results.repository';
import { ResultsInnovationsDevRepository } from './summary/repositories/results-innovations-dev.repository';

@Injectable()
export class ResultsService {
  private readonly _logger: Logger = new Logger(ResultsService.name);
  constructor(
    private readonly _resultRepository: ResultRepository,
    private readonly _clarisaInitiativesRepository: ClarisaInitiativesRepository,
    private readonly _resultTypesService: ResultTypesService,
    private readonly _handlersError: HandlersError,
    private readonly _customResultRepository: ResultRepository,
    private readonly _yearRepository: YearRepository,
    private readonly _resultByEvidencesRepository: ResultByEvidencesRepository,
    private readonly _resultByIntitutionsRepository: ResultByIntitutionsRepository,
    private readonly _resultByInitiativesRepository: ResultByInitiativesRepository,
    private readonly _resultByIntitutionsTypeRepository: ResultByIntitutionsTypeRepository,
    private readonly _resultLevelRepository: ResultLevelRepository,
    private readonly _resultByLevelRepository: ResultByLevelRepository,
    private readonly _resultLegacyRepository: ResultLegacyRepository,
    private readonly _clarisaInstitutionsRepository: ClarisaInstitutionsRepository,
    private readonly _clarisaInstitutionsTypeRepository: ClarisaInstitutionsTypeRepository,
    private readonly _resultRegionsService: ResultRegionsService,
    private readonly _resultCountriesService: ResultCountriesService,
    private readonly _genderTagRepository: GenderTagRepository,
    private readonly _impactAreasScoresComponentRepository: ImpactAreasScoresComponentRepository,
    private readonly _resultRegionRepository: ResultRegionRepository,
    private readonly _resultCountryRepository: ResultCountryRepository,
    private readonly _resultKnowledgeProductRepository: ResultsKnowledgeProductsRepository,
    private readonly _elasticService: ElasticService,
    private readonly _resultValidationRepository: resultValidationRepository,
    private readonly _resultsKnowledgeProductAltmetricRepository: ResultsKnowledgeProductAltmetricRepository,
    private readonly _resultsKnowledgeProductAuthorRepository: ResultsKnowledgeProductAuthorRepository,
    private readonly _resultsKnowledgeProductInstitutionRepository: ResultsKnowledgeProductInstitutionRepository,
    private readonly _resultsKnowledgeProductKeywordRepository: ResultsKnowledgeProductKeywordRepository,
    private readonly _resultsKnowledgeProductMetadataRepository: ResultsKnowledgeProductMetadataRepository,
    private readonly _resultsKnowledgeProductFairScoreRepository: ResultsKnowledgeProductFairScoreRepository,
    private readonly _logRepository: LogRepository,
    private readonly _versioningService: VersioningService,
    private readonly _returnResponse: ReturnResponse,
    private readonly _resultsInvestmentDiscontinuedOptionRepository: ResultsInvestmentDiscontinuedOptionRepository,
    private readonly _resultInitiativeBudgetRepository: ResultInitiativeBudgetRepository,
    private readonly _resultsCenterRepository: ResultsCenterRepository,
    private readonly _resultsTocResultRepository: ResultsTocResultRepository,
    private readonly _initiativeEntityMapRepository?: InitiativeEntityMapRepository,
    private readonly _roleByUserRepository?: RoleByUserRepository,
    private readonly _resultsInnovationsDevRepository?: ResultsInnovationsDevRepository,
    @Optional()
    @Inject(AdUserService)
    private readonly _adUserService?: AdUserService,
    @Optional() private readonly _adUserRepository?: AdUserRepository,
    @Optional() private readonly _notificationService?: NotificationService,
  ) {}

  async createOwnerResult(
    createResultDto: CreateResultDto,
    user: TokenDto,
    isAdmin?: boolean,
    versionId?: number,
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
          message: 'Missing data: Result name, Initiative or Result type',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      if (createResultDto?.result_type_id == 3) {
        throw {
          response: createResultDto?.result_type_id,
          message: 'Result type not allowed',
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
      const resultType = await this._resultTypesService.findOneResultType(
        createResultDto.result_type_id,
      );
      if (!resultLevel) {
        throw {
          response: {},
          message: 'Result Level not found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      if (resultType.status >= 300) {
        throw this._handlersError.returnErrorRes({
          error: resultType,
          debug: true,
        });
      }

      if (!resultByLevel) {
        throw {
          response: {},
          message: 'The type or level is not compatible',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      const rl: ResultLevel = <ResultLevel>resultLevel;
      const rt: ResultType = <ResultType>resultType.response;

      const version = await this._versioningService.$_findActivePhase(
        AppModuleIdEnum.REPORTING,
      );
      if (!version) {
        throw this._handlersError.returnErrorRes({
          error: version,
          debug: true,
        });
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
        result_type_id: rt.id,
        version_id:
          isAdmin != undefined && Boolean(isAdmin) && versionId
            ? versionId
            : version.id,
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
        },
      );

      await this._resultInitiativeBudgetRepository.save({
        result_initiative_id: resultByInitiative.id,
        created_by: user.id,
        last_updated_by: user.id,
      });

      await this.insertResultIntoElastic(newResultHeader);

      await this.emitResultCreatedNotification(
        newResultHeader,
        Number(initiative.id),
        user.id,
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

  private async insertResultIntoElastic(newResultHeader: Result) {
    const toAddFromElastic = await this.findAllSimplified(
      newResultHeader.id.toString(),
    );

    if (toAddFromElastic.status !== HttpStatus.OK) {
      this._logger.warn(
        `the result #${newResultHeader.id} could not be found to be inserted in the elastic search`,
      );
    } else {
      try {
        const elasticOperations = [
          new ElasticOperationDto('PATCH', toAddFromElastic.response[0]),
        ];

        const elasticJson = this._elasticService.getBulkElasticOperationResults(
          process.env.ELASTIC_DOCUMENT_NAME,
          elasticOperations,
        );

        await this._elasticService.sendBulkOperationToElastic(elasticJson);
      } catch (_error) {
        this._logger.warn(
          `the elastic upload failed for the result #${newResultHeader.id}`,
        );
      }
    }
  }

  /**
   * ! endpoint getAllInstitutions
   * @returns
   */
  async getAllInstitutions() {
    try {
      const entities =
        await this._clarisaInstitutionsRepository.getAllInstitutions();
      if (!entities.length) {
        throw {
          response: {},
          message: 'Institutions Not Found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      return {
        response: entities,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async getChildlessInstitutionTypes() {
    try {
      const institutionTypes =
        await this._clarisaInstitutionsTypeRepository.getChildlessInstitutionTypes();
      return {
        response: institutionTypes,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async getAllInstitutionsType(legacy?: boolean) {
    try {
      const entities =
        await this._clarisaInstitutionsTypeRepository.getInstitutionsType(
          legacy,
        );
      if (!entities.length) {
        throw {
          response: {},
          message: 'Institutions Type Not Found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      return {
        response: entities,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  /**
   * Create a new result general information
   * @param resultGeneralInformation
   * @param user
   */
  async createResultGeneralInformation(
    resultGeneralInformation: CreateGeneralInformationResultDto,
    user: TokenDto,
  ) {
    try {
      const {
        gender_impact_area_id,
        climate_impact_area_id,
        nutrition_impact_area_id,
        environmental_biodiversity_impact_area_id,
        poverty_impact_area_id,
      } = resultGeneralInformation;
      const result = await this._resultRepository.getResultById(
        resultGeneralInformation.result_id,
      );
      if (!result) {
        throw {
          response: {},
          message: 'The result does not exist',
          status: HttpStatus.NOT_FOUND,
        };
      }
      const resultType = await this._resultTypesService.findOneResultType(
        resultGeneralInformation.result_type_id,
      );
      if (resultType.status >= 300) {
        throw this._handlersError.returnErrorRes({
          error: resultType,
          debug: true,
        });
      }

      const resultByLevel =
        await this._resultByLevelRepository.getByTypeAndLevel(
          resultGeneralInformation.result_level_id,
          resultGeneralInformation.result_type_id,
        );
      if (!resultByLevel) {
        throw {
          response: {},
          message: 'The type or level is not compatible',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      const genderTag = await this._genderTagRepository.findOne({
        where: { id: resultGeneralInformation.gender_tag_id },
      });
      if (!genderTag) {
        throw {
          response: {},
          message: 'The Gender tag does not exist',
          status: HttpStatus.NOT_FOUND,
        };
      }

      let genderTagComponent = null;
      if (Number(genderTag?.id) === 3 && gender_impact_area_id != null) {
        genderTagComponent =
          await this._impactAreasScoresComponentRepository.findOne({
            where: { id: gender_impact_area_id },
          });
        if (!genderTagComponent) {
          throw {
            response: {},
            message: 'The Gender tag component does not exist',
            status: HttpStatus.NOT_FOUND,
          };
        }
      }

      const climateTag = await this._genderTagRepository.findOne({
        where: { id: resultGeneralInformation.climate_change_tag_id },
      });
      if (!climateTag) {
        throw {
          response: {},
          message: 'The Climate change tag does not exist',
          status: HttpStatus.NOT_FOUND,
        };
      }

      let climateTagComponent = null;
      if (Number(climateTag?.id) === 3 && climate_impact_area_id != null) {
        climateTagComponent =
          await this._impactAreasScoresComponentRepository.findOne({
            where: { id: climate_impact_area_id },
          });
        if (!climateTagComponent) {
          throw {
            response: {},
            message: 'The Climate change tag component does not exist',
            status: HttpStatus.NOT_FOUND,
          };
        }
      }

      const nutritionTag = await this._genderTagRepository.findOne({
        where: { id: resultGeneralInformation.nutrition_tag_level_id },
      });
      if (!nutritionTag) {
        throw {
          response: {},
          message: 'The Nutrition tag does not exist',
          status: HttpStatus.NOT_FOUND,
        };
      }

      let nutritionTagComponent = null;
      if (Number(nutritionTag?.id) === 3 && nutrition_impact_area_id != null) {
        nutritionTagComponent =
          await this._impactAreasScoresComponentRepository.findOne({
            where: { id: nutrition_impact_area_id },
          });
        if (!nutritionTagComponent) {
          throw {
            response: {},
            message: 'The Nutrition tag component does not exist',
            status: HttpStatus.NOT_FOUND,
          };
        }
      }

      const environmentalBiodiversityTag =
        await this._genderTagRepository.findOne({
          where: {
            id: resultGeneralInformation.environmental_biodiversity_tag_level_id,
          },
        });
      if (!environmentalBiodiversityTag) {
        throw {
          response: {},
          message: 'The Environmental or/and biodiversity tag does not exist',
          status: HttpStatus.NOT_FOUND,
        };
      }

      let environmentalBiodiversityTagComponent = null;
      if (
        Number(environmentalBiodiversityTag?.id) === 3 &&
        environmental_biodiversity_impact_area_id != null
      ) {
        environmentalBiodiversityTagComponent =
          await this._impactAreasScoresComponentRepository.findOne({
            where: {
              id: environmental_biodiversity_impact_area_id,
            },
          });
        if (!environmentalBiodiversityTagComponent) {
          throw {
            response: {},
            message:
              'The Environmental or/and biodiversity tag component does not exist',
            status: HttpStatus.NOT_FOUND,
          };
        }
      }

      const povertyTag = await this._genderTagRepository.findOne({
        where: { id: resultGeneralInformation.poverty_tag_level_id },
      });
      if (!povertyTag) {
        throw {
          response: {},
          message: 'The Poverty tag does not exist',
          status: HttpStatus.NOT_FOUND,
        };
      }

      let povertyTagComponent = null;
      if (Number(povertyTag?.id) === 3 && poverty_impact_area_id != null) {
        povertyTagComponent =
          await this._impactAreasScoresComponentRepository.findOne({
            where: { id: poverty_impact_area_id },
          });
        if (!povertyTagComponent) {
          throw {
            response: {},
            message: 'The Poverty tag component does not exist',
            status: HttpStatus.NOT_FOUND,
          };
        }
      }

      if (resultGeneralInformation.institutions.length) {
        const validInstitutions =
          await this._clarisaInstitutionsRepository.getValidInstitution(
            resultGeneralInformation.institutions,
          );

        const isValidInst: any[] = validInstitutions.filter(
          (el) => el.valid === '0',
        );
        if (isValidInst.length) {
          throw {
            response: isValidInst,
            message: 'Institutions do not exist that are intended to assign',
            status: HttpStatus.BAD_REQUEST,
          };
        }
      }

      if (resultGeneralInformation.institutions_type.length) {
        const validInstitutionType =
          await this._clarisaInstitutionsTypeRepository.getValidInstitutionType(
            resultGeneralInformation.institutions_type,
          );
        const isValidInstType: any[] = validInstitutionType.filter(
          (el) => el.valid === '0',
        );
        if (isValidInstType.length) {
          throw {
            response: isValidInstType,
            message:
              'Institutions type do not exist that are intended to assign',
            status: HttpStatus.BAD_REQUEST,
          };
        }
      }

      if (!resultGeneralInformation.is_krs) {
        resultGeneralInformation.krs_url = null;
      }

      const version = await this._versioningService.$_findActivePhase(
        AppModuleIdEnum.REPORTING,
      );
      if (!version) {
        throw this._handlersError.returnErrorRes({
          error: version,
          debug: true,
        });
      }
      if (
        resultGeneralInformation?.is_discontinued &&
        result.result_type_id == 7
      ) {
        await this._resultsInvestmentDiscontinuedOptionRepository.inactiveData(
          resultGeneralInformation.discontinued_options.map(
            (el) => el.investment_discontinued_option_id,
          ),
          result.id,
          user.id,
        );
        for (const i of resultGeneralInformation.discontinued_options) {
          const res =
            await this._resultsInvestmentDiscontinuedOptionRepository.findOne({
              where: {
                result_id: resultGeneralInformation.result_id,
                investment_discontinued_option_id:
                  i.investment_discontinued_option_id,
              },
            });

          if (res) {
            await this._resultsInvestmentDiscontinuedOptionRepository.update(
              res.results_investment_discontinued_option_id,
              {
                is_active: i.is_active,
                description: i?.description,
                last_updated_by: user.id,
              },
            );
          } else {
            await this._resultsInvestmentDiscontinuedOptionRepository.save({
              result_id: result.id,
              investment_discontinued_option_id:
                i.investment_discontinued_option_id,
              description: i?.description,
              created_by: user.id,
              last_updated_by: user.id,
            });
          }
        }
      } else if (result.result_type_id == 7) {
        await this._resultsInvestmentDiscontinuedOptionRepository.inactiveData(
          [],
          result.id,
          user.id,
        );
      }

      let leadContactPersonId: number = null;

      if (
        resultGeneralInformation.lead_contact_person_data?.mail &&
        this._adUserService
      ) {
        try {
          let adUser = await this._adUserService.getUserByIdentifier(
            resultGeneralInformation.lead_contact_person_data.mail,
          );

          if (!adUser) {
            const adUserRepository = this._adUserService['adUserRepository'];
            if (adUserRepository && adUserRepository.saveFromADUser) {
              adUser = await adUserRepository.saveFromADUser(
                resultGeneralInformation.lead_contact_person_data,
              );

              this._logger.log(
                `Created new AD user: ${adUser.mail} with ID: ${adUser.id}`,
              );
            }
          } else {
            this._logger.log(
              `Found existing AD user: ${adUser.mail} with ID: ${adUser.id}`,
            );
          }

          leadContactPersonId = adUser?.id || null;
        } catch (error) {
          this._logger.warn(
            `Failed to process lead_contact_person_data: ${error.message}`,
          );
        }
      } else if (
        resultGeneralInformation.lead_contact_person_data?.mail &&
        !this._adUserService
      ) {
        this._logger.warn(
          'AdUserService not available, skipping lead_contact_person_data processing',
        );
      }

      const updateResult = await this._resultRepository.save({
        id: result.id,
        is_discontinued: resultGeneralInformation?.is_discontinued,
        title: resultGeneralInformation.result_name,
        result_type_id: resultByLevel.result_type_id,
        result_level_id: resultByLevel.result_level_id,
        description: resultGeneralInformation.result_description,
        gender_tag_level_id: resultGeneralInformation.gender_tag_id
          ? genderTag.id
          : null,
        gender_impact_area_id: genderTagComponent
          ? genderTagComponent.id
          : null,
        climate_change_tag_level_id:
          resultGeneralInformation.climate_change_tag_id ? climateTag.id : null,
        climate_impact_area_id: climateTagComponent
          ? climateTagComponent.id
          : null,
        nutrition_tag_level_id: resultGeneralInformation.nutrition_tag_level_id
          ? nutritionTag.id
          : null,
        nutrition_impact_area_id: nutritionTagComponent
          ? nutritionTagComponent.id
          : null,
        environmental_biodiversity_tag_level_id:
          resultGeneralInformation.environmental_biodiversity_tag_level_id
            ? environmentalBiodiversityTag.id
            : null,
        environmental_biodiversity_impact_area_id:
          environmentalBiodiversityTagComponent
            ? environmentalBiodiversityTagComponent.id
            : null,
        poverty_tag_level_id: resultGeneralInformation.poverty_tag_level_id
          ? povertyTag.id
          : null,
        poverty_impact_area_id: povertyTagComponent
          ? povertyTagComponent.id
          : null,
        krs_url: resultGeneralInformation.krs_url,
        is_krs: resultGeneralInformation.is_krs,
        last_updated_by: user.id,
        lead_contact_person: resultGeneralInformation.lead_contact_person,
        lead_contact_person_id: leadContactPersonId,
        status_id:
          result.result_type_id == 7
            ? resultGeneralInformation?.is_discontinued
              ? 4
              : result.status_id == 4
                ? 1
                : result.status_id
            : result.status_id,
      });

      const toAddFromElastic = await this.findAllSimplified(
        updateResult.id.toString(),
      );

      if (toAddFromElastic.status !== HttpStatus.OK) {
        this._logger.warn(
          `the result #${updateResult.id} could not be found to be updated in the elastic search`,
        );
      } else {
        try {
          const elasticOperations = [
            new ElasticOperationDto('PATCH', toAddFromElastic.response[0]),
          ];

          const elasticJson =
            this._elasticService.getBulkElasticOperationResults(
              process.env.ELASTIC_DOCUMENT_NAME,
              elasticOperations,
            );

          await this._elasticService.sendBulkOperationToElastic(elasticJson);
        } catch (_error) {
          this._logger.warn(
            `the elastic update failed for the result #${updateResult.id}`,
          );
        }
      }

      const institutions =
        await this._resultByIntitutionsRepository.updateInstitutions(
          resultGeneralInformation.result_id,
          resultGeneralInformation.institutions,
          user.id,
          false,
          [InstitutionRoleEnum.ACTOR],
        );
      const saveInstitutions: ResultsByInstitution[] = [];
      for (
        let index = 0;
        index < resultGeneralInformation.institutions.length;
        index++
      ) {
        const isInstitutions =
          await this._resultByIntitutionsRepository.getResultByInstitutionExists(
            resultGeneralInformation.result_id,
            resultGeneralInformation.institutions[index].institutions_id,
            InstitutionRoleEnum.ACTOR,
          );
        if (!isInstitutions) {
          const institutionsNew: ResultsByInstitution =
            new ResultsByInstitution();
          institutionsNew.created_by = user.id;
          institutionsNew.institution_roles_id = 1;
          institutionsNew.institutions_id =
            resultGeneralInformation.institutions[index].institutions_id;
          institutionsNew.last_updated_by = user.id;
          institutionsNew.result_id = resultGeneralInformation.result_id;
          institutionsNew.is_active = true;
          saveInstitutions.push(institutionsNew);
        }
      }
      const updateInstitutions =
        await this._resultByIntitutionsRepository.save(saveInstitutions);

      const institutionsType =
        await this._resultByIntitutionsTypeRepository.updateInstitutionsType(
          resultGeneralInformation.result_id,
          resultGeneralInformation.institutions_type,
          true,
          user.id,
        );
      const saveInstitutionsType: ResultsByInstitutionType[] = [];
      for (
        let index = 0;
        index < resultGeneralInformation.institutions_type.length;
        index++
      ) {
        const institutionsType =
          await this._resultByIntitutionsTypeRepository.getResultByInstitutionTypeExists(
            resultGeneralInformation.result_id,
            resultGeneralInformation.institutions_type[index]
              .institutions_type_id,
            true,
          );
        if (!institutionsType) {
          const institutionsTypeNew: ResultsByInstitutionType =
            new ResultsByInstitutionType();
          institutionsTypeNew.created_by = user.id;
          institutionsTypeNew.institution_roles_id = 1;
          institutionsTypeNew.institution_types_id =
            resultGeneralInformation.institutions_type[
              index
            ].institutions_type_id;
          institutionsTypeNew.last_updated_by = user.id;
          institutionsTypeNew.results_id = resultGeneralInformation.result_id;
          institutionsTypeNew.is_active = true;
          saveInstitutionsType.push(institutionsTypeNew);
        }
      }

      await this._resultByIntitutionsTypeRepository.save(saveInstitutionsType);
      return {
        response: {
          updateResult,
          institutions: {
            institutions,
            updateInstitutions,
          },
          institutionsType: {
            institutionsType,
            saveInstitutionsType,
          },
        },
        message: `Updated the general information of result ${resultGeneralInformation.result_id}`,
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  /**
   * !dIMPORTANTE REVISAR
   * @param resultId
   * @returns
   */

  async deleteResult(resultId: number, user: TokenDto) {
    try {
      const result: Result = await this._resultRepository.findOne({
        where: { id: resultId },
      });
      if (!result) {
        throw {
          response: {},
          message: 'The result does not exist',
          status: HttpStatus.NOT_FOUND,
        };
      }

      if (result.status_id == 2)
        throw this._returnResponse.format({
          message: 'Is already Quality Assessed',
          statusCode: HttpStatus.BAD_REQUEST,
          response: result,
        });

      result.is_active = false;

      await this._resultRepository.save(result);

      if (result?.legacy_id) {
        await this._resultLegacyRepository.update(result.legacy_id, {
          is_migrated: false,
        });
      }

      await this._resultByInitiativesRepository.logicalElimination(resultId);
      await this._resultByIntitutionsTypeRepository.logicalElimination(
        result.id,
      );
      await this._resultByIntitutionsRepository.logicalElimination(result.id);
      await this._resultByEvidencesRepository.logicalElimination(result.id);
      await this._resultValidationRepository.inactiveOldInserts(result.id);
      const toUpdateFromElastic = await this.findAllSimplified(
        result.id.toString(),
        true,
      );

      if (result.result_type_id == 6) {
        const { result_knowledge_product_id: kpId } =
          await this._resultKnowledgeProductRepository.findOne({
            where: { results_id: result.id },
          });
        await this._resultsKnowledgeProductAltmetricRepository.statusElement(
          kpId,
          false,
        );
        await this._resultsKnowledgeProductAuthorRepository.statusElement(
          kpId,
          false,
        );
        await this._resultsKnowledgeProductInstitutionRepository.statusElement(
          kpId,
          false,
        );
        await this._resultsKnowledgeProductKeywordRepository.statusElement(
          kpId,
          false,
        );
        await this._resultsKnowledgeProductMetadataRepository.statusElement(
          kpId,
          false,
        );
        await this._resultsKnowledgeProductFairScoreRepository.statusElement(
          kpId,
          false,
        );
        await this._resultKnowledgeProductRepository.statusElement(kpId, false);
      }

      if (toUpdateFromElastic.status !== HttpStatus.OK) {
        this._logger.warn(
          `the result #${result.id} could not be found to be deleted in the elastic search`,
        );
      } else {
        try {
          const elasticOperations = [
            new ElasticOperationDto('DELETE', toUpdateFromElastic.response[0]),
          ];

          const elasticJson =
            this._elasticService.getBulkElasticOperationResults(
              process.env.ELASTIC_DOCUMENT_NAME,
              elasticOperations,
            );

          await this._elasticService.sendBulkOperationToElastic(elasticJson);
          await this._logRepository.createLog(result, user, Actions.DELETE, {
            class: ResultsService.name,
            method: `deleteResult`,
          });
        } catch (_error) {
          this._logger.warn(
            `the elastic removal failed for the result #${result.id}`,
          );
        }
      }

      return {
        response: result,
        message: 'The result has been successfully deleted',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  async findAll() {
    try {
      const result = await this._customResultRepository.AllResults();

      if (!result.length) {
        throw {
          response: {},
          message: 'Results Not Found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      return {
        response: result,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async findForElasticSearch(documentName: string, id?: string) {
    return this._elasticService.findForElasticSearch(documentName, id);
  }

  async findAllSimplified(id?: string, allowDeleted = false) {
    try {
      const result = await this._customResultRepository.resultsForElasticSearch(
        id,
        allowDeleted,
      );

      if (!result.length) {
        throw {
          response: {},
          message: 'Results Not Found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      return {
        response: result,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async findResultById(
    id: number,
  ): Promise<returnFormatResult | returnErrorDto> {
    try {
      const result: Result =
        await this._customResultRepository.getResultById(id);

      if (!result) {
        throw {
          response: {},
          message: 'Results Not Found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      return {
        response: result,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async findAllByRole(userId: number, initiativeCode?: string) {
    try {
      let result: any[] =
        await this._customResultRepository.AllResultsByRoleUserAndInitiative(
          userId,
          undefined,
          initiativeCode,
        );

      const entity_init_map = await this._initiativeEntityMapRepository.find({
        where: { initiativeId: In(result.map((item) => item.submitter_id)) },
        relations: ['entity_obj'],
      });

      const userInitiatives = await this._roleByUserRepository.find({
        where: { user: userId, active: true },
        relations: ['obj_initiative'],
      });

      const initiativesPortfolio3 = userInitiatives.filter(
        (rbu) => rbu.obj_initiative?.portfolio_id === 3,
      );

      result = result.map((item) => {
        const entityMaps = entity_init_map.filter(
          (map) => map.initiativeId === item.submitter_id,
        );
        return {
          ...item,
          initiative_entity_map: entityMaps.length
            ? entityMaps.map((entityMap) => ({
                id: entityMap.id,
                entityId: entityMap.entityId,
                initiativeId: entityMap.initiativeId,
                entityName: entityMap.entity_obj?.name ?? null,
              }))
            : [],
          initiative_entity_user: initiativesPortfolio3,
        };
      });

      if (!result.length) {
        throw {
          response: {},
          message: 'Results Not Found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      return {
        response: result,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async findAllByRoleFiltered(userId: number, query: Record<string, any> = {}) {
    try {
      const pageNum = Number(query.page);
      const limitNum = Number(query.limit);
      const page =
        Number.isFinite(pageNum) && pageNum > 0 ? pageNum : undefined;
      const limit =
        Number.isFinite(limitNum) && limitNum > 0 ? limitNum : undefined;
      const offset = page && limit ? (page - 1) * limit : undefined;

      const toNumberArray = (val: any): number[] | undefined => {
        if (val === undefined || val === null || val === '') return undefined;
        const asArray = Array.isArray(val) ? val : String(val).split(',');
        const nums = asArray
          .map((v) => Number(v))
          .filter((n) => Number.isFinite(n));
        return nums.length ? nums : undefined;
      };

      const toStringArray = (val: any): string[] | undefined => {
        if (val === undefined || val === null || val === '') return undefined;
        const asArray = Array.isArray(val) ? val : String(val).split(',');
        const strs = asArray
          .map((v) => String(v).trim())
          .filter((s) => s.length > 0);
        return strs.length ? strs : undefined;
      };

      const initiativeCode = toStringArray(
        query.initiative ?? query.initiativeCode ?? undefined,
      );

      const filters = {
        initiativeCode,
        versionId: toNumberArray(
          query.phase ?? query.version_id ?? query.versionId,
        ),
        submitterId: toNumberArray(query.submitter ?? query.submitter_id),
        resultTypeId: toNumberArray(
          query.result_type ?? query.result_type_id ?? query.type,
        ),
        portfolioId: toNumberArray(
          query.portfolio ?? query.portfolio_id ?? query.portfolioId,
        ),
        statusId: toNumberArray(query.status_id ?? query.status),
      };

      const repoRes =
        await this._customResultRepository.AllResultsByRoleUserAndInitiativeFiltered(
          userId,
          filters,
          undefined,
          limit !== undefined ? { limit, offset: offset ?? 0 } : undefined,
        );
      let result: any[] = repoRes.results ?? [];
      const total = repoRes.total ?? result.length;

      const entity_init_map = await this._initiativeEntityMapRepository.find({
        where: { initiativeId: In(result.map((item) => item.submitter_id)) },
        relations: ['entity_obj'],
      });

      const userInitiatives = await this._roleByUserRepository.find({
        where: { user: userId, active: true },
        relations: ['obj_initiative'],
      });

      const initiativesPortfolio3 = userInitiatives.filter(
        (rbu) => rbu.obj_initiative?.portfolio_id === 3,
      );

      result = result.map((item) => {
        const entityMaps = entity_init_map.filter(
          (map) => map.initiativeId === item.submitter_id,
        );
        return {
          ...item,
          initiative_entity_map: entityMaps.length
            ? entityMaps.map((entityMap) => ({
                id: entityMap.id,
                entityId: entityMap.entityId,
                initiativeId: entityMap.initiativeId,
                entityName: entityMap.entity_obj?.name ?? null,
              }))
            : [],
          initiative_entity_user: initiativesPortfolio3,
        };
      });

      if (!result.length) {
        throw {
          response: {},
          message: 'Results Not Found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      return {
        response:
          limit !== undefined
            ? {
                items: result,
                meta: {
                  total,
                  page: page ?? 1,
                  limit,
                  totalPages: Math.max(1, Math.ceil(total / limit)),
                },
              }
            : { items: result },
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  private buildScienceProgramBuckets(
    rows: any[],
    initiativesSeed: ClarisaInitiative[],
    userRoles: Map<number, { hasEdit: boolean }>,
  ): ScienceProgramProgressResponseDto {
    const DEFAULT_PROGRESS = 80;
    const metadata = new Map<
      number,
      {
        initiativeId: number;
        initiativeCode: string;
        initiativeName: string;
        initiativeShortName?: string;
        portfolioId?: number;
        portfolioName?: string;
        portfolioAcronym?: string;
        entityTypeCode?: number;
        entityTypeName?: string;
      }
    >();

    initiativesSeed?.forEach((initiative) => {
      metadata.set(initiative.id, {
        initiativeId: initiative.id,
        initiativeCode: initiative.official_code ?? '',
        initiativeName: initiative.name ?? '',
        initiativeShortName: initiative.short_name ?? undefined,
        portfolioId: initiative.portfolio_id ?? undefined,
        portfolioName: initiative.obj_portfolio?.name ?? undefined,
        portfolioAcronym: initiative.obj_portfolio?.acronym ?? undefined,
        entityTypeCode: initiative.obj_cgiar_entity_type?.code ?? undefined,
        entityTypeName: initiative.obj_cgiar_entity_type?.name ?? undefined,
      });
    });

    const initiatives = new Map<
      number,
      {
        dto: ScienceProgramProgressDto;
        editable: boolean;
        versionsMap: Map<
          number,
          {
            version: VersionProgressDto;
            statusesMap: Map<number, StatusBreakdownDto>;
          }
        >;
      }
    >();

    const resolveMetadata = (
      initiativeId: number,
      override?: Partial<{
        initiativeCode: string;
        initiativeName: string;
        initiativeShortName?: string;
        portfolioId?: number;
        portfolioName?: string;
        portfolioAcronym?: string;
        entityTypeCode?: number;
        entityTypeName?: string;
      }>,
    ) => {
      const current = metadata.get(initiativeId);
      const merged = {
        initiativeId,
        initiativeCode:
          override?.initiativeCode ?? current?.initiativeCode ?? '',
        initiativeName:
          override?.initiativeName ?? current?.initiativeName ?? '',
        initiativeShortName:
          override?.initiativeShortName ??
          current?.initiativeShortName ??
          undefined,
        portfolioId: override?.portfolioId ?? current?.portfolioId,
        portfolioName: override?.portfolioName ?? current?.portfolioName,
        portfolioAcronym:
          override?.portfolioAcronym ?? current?.portfolioAcronym,
        entityTypeCode: override?.entityTypeCode ?? current?.entityTypeCode,
        entityTypeName: override?.entityTypeName ?? current?.entityTypeName,
      };
      metadata.set(initiativeId, merged);
      return merged;
    };

    const ensureContainer = (
      initiativeId: number,
      meta?: ReturnType<typeof resolveMetadata>,
    ) => {
      let container = initiatives.get(initiativeId);
      if (!container) {
        const info =
          meta ?? metadata.get(initiativeId) ?? resolveMetadata(initiativeId);
        container = {
          dto: {
            initiativeId,
            initiativeCode: info.initiativeCode,
            initiativeName: info.initiativeName,
            initiativeShortName: info.initiativeShortName,
            portfolioId: info.portfolioId,
            portfolioName: info.portfolioName,
            portfolioAcronym: info.portfolioAcronym,
            entityTypeCode: info.entityTypeCode,
            entityTypeName: info.entityTypeName,
            totalResults: 0,
            progress: 0,
            versions: [],
          },
          editable: false,
          versionsMap: new Map(),
        };
        initiatives.set(initiativeId, container);
      } else if (meta) {
        container.dto.initiativeCode =
          container.dto.initiativeCode || meta.initiativeCode;
        container.dto.initiativeName =
          container.dto.initiativeName || meta.initiativeName;
        container.dto.initiativeShortName =
          container.dto.initiativeShortName || meta.initiativeShortName;
        container.dto.portfolioId =
          container.dto.portfolioId ?? meta.portfolioId;
        container.dto.portfolioName =
          container.dto.portfolioName ?? meta.portfolioName;
        container.dto.portfolioAcronym =
          container.dto.portfolioAcronym ?? meta.portfolioAcronym;
        container.dto.entityTypeCode =
          container.dto.entityTypeCode ?? meta.entityTypeCode;
        container.dto.entityTypeName =
          container.dto.entityTypeName ?? meta.entityTypeName;
      }
      return container;
    };

    rows.forEach((row) => {
      const initiativeId = Number(row?.submitter_id);
      if (!initiativeId) {
        return;
      }

      const meta = resolveMetadata(initiativeId, {
        initiativeCode: row?.submitter ?? undefined,
        initiativeName: row?.submitter_name ?? undefined,
        initiativeShortName: row?.submitter_short_name ?? undefined,
        portfolioId:
          row?.portfolio_id !== undefined
            ? Number(row.portfolio_id)
            : undefined,
        portfolioName: row?.portfolio_name ?? undefined,
        portfolioAcronym: row?.acronym ?? undefined,
        entityTypeCode:
          row?.entity_type_code !== undefined
            ? Number(row.entity_type_code)
            : undefined,
        entityTypeName: row?.entity_type_name ?? undefined,
      });

      const container = ensureContainer(initiativeId, meta);

      const roleId =
        row?.role_id !== null && row?.role_id !== undefined
          ? Number(row.role_id)
          : undefined;
      if (
        !container.editable &&
        roleId !== undefined &&
        roleId !== RoleEnum.GUEST
      ) {
        container.editable = true;
      }

      container.dto.totalResults += 1;

      const versionId = Number(row?.version_id);
      const phaseName = row?.phase_name ?? '';
      const phaseYear =
        row?.phase_year !== null && row?.phase_year !== undefined
          ? Number(row.phase_year)
          : null;

      let versionContainer = container.versionsMap.get(versionId);
      if (!versionContainer) {
        versionContainer = {
          version: {
            versionId,
            phaseName,
            phaseYear,
            totalResults: 0,
            statuses: [],
          },
          statusesMap: new Map(),
        };
        container.versionsMap.set(versionId, versionContainer);
      }

      versionContainer.version.totalResults += 1;

      const statusId = Number(row?.status_id);
      const statusName = row?.status_name ?? '';
      let statusContainer = versionContainer.statusesMap.get(statusId);
      if (!statusContainer) {
        statusContainer = {
          statusId,
          statusName,
          count: 0,
        };
        versionContainer.statusesMap.set(statusId, statusContainer);
      }
      statusContainer.count += 1;
    });

    metadata.forEach((_value, initiativeId) => {
      ensureContainer(initiativeId);
    });

    const sortByCode = (
      a: ScienceProgramProgressDto,
      b: ScienceProgramProgressDto,
    ) =>
      a.initiativeCode.localeCompare(b.initiativeCode, undefined, {
        numeric: true,
        sensitivity: 'base',
      });

    const mySciencePrograms: ScienceProgramProgressDto[] = [];
    const otherSciencePrograms: ScienceProgramProgressDto[] = [];

    initiatives.forEach((container) => {
      const versions: VersionProgressDto[] = Array.from(
        container.versionsMap.values(),
      ).map(({ version, statusesMap }) => {
        const statuses = Array.from(statusesMap.values()).sort(
          (a, b) => a.statusId - b.statusId,
        );
        return {
          ...version,
          statuses,
        };
      });

      versions.sort((a, b) => {
        const yearDiff = (b.phaseYear ?? 0) - (a.phaseYear ?? 0);
        if (yearDiff !== 0) {
          return yearDiff;
        }
        return b.versionId - a.versionId;
      });

      const userRole = userRoles.get(container.dto.initiativeId);
      if (userRole?.hasEdit) {
        container.editable = true;
      }

      container.dto.versions = versions;

      const hasResults = (container.dto.totalResults ?? 0) > 0;
      container.dto.progress = hasResults ? DEFAULT_PROGRESS : 0;
      container.dto.totalResults = hasResults
        ? container.dto.totalResults
        : null;

      if (container.editable) {
        mySciencePrograms.push(container.dto);
      } else {
        otherSciencePrograms.push(container.dto);
      }
    });

    mySciencePrograms.sort(sortByCode);
    otherSciencePrograms.sort(sortByCode);

    return {
      mySciencePrograms,
      otherSciencePrograms,
    };
  }

  async getScienceProgramProgress(
    user: TokenDto,
    versionId?: number,
  ): Promise<
    ReturnResponseDto<ScienceProgramProgressResponseDto> | returnErrorDto
  > {
    try {
      const filters: Record<string, number | number[]> = { portfolioId: 3 };

      let effectiveVersionId = versionId;
      if (
        !(
          typeof effectiveVersionId === 'number' &&
          Number.isFinite(effectiveVersionId)
        )
      ) {
        const activePhase = await this._versioningService.$_findActivePhase(
          AppModuleIdEnum.REPORTING,
        );
        if (activePhase?.id) {
          effectiveVersionId = Number(activePhase.id);
        }
      }

      if (
        typeof effectiveVersionId === 'number' &&
        Number.isFinite(effectiveVersionId)
      ) {
        filters.versionId = effectiveVersionId;
      }

      const initiativesSeed = await this._clarisaInitiativesRepository.find({
        where: {
          portfolio_id: 3,
          active: true,
          cgiar_entity_type_id: In([22, 23, 24]),
        },
        relations: ['obj_portfolio', 'obj_cgiar_entity_type'],
      });

      const userRoleMap = new Map<number, { hasEdit: boolean }>();
      if (this._roleByUserRepository) {
        const userRoles = await this._roleByUserRepository.find({
          where: { user: user.id, active: true },
        });

        userRoles.forEach((role) => {
          if (!role?.initiative_id) {
            return;
          }
          const roleId = Number(role.role);
          if (!Number.isFinite(roleId)) {
            return;
          }
          const existing = userRoleMap.get(role.initiative_id) ?? {
            hasEdit: false,
          };
          if (roleId !== RoleEnum.GUEST) {
            existing.hasEdit = true;
          }
          userRoleMap.set(role.initiative_id, existing);
        });
      }

      const { results } =
        await this._customResultRepository.AllResultsByRoleUserAndInitiativeFiltered(
          user.id,
          filters,
        );

      const response = this.buildScienceProgramBuckets(
        results ?? [],
        initiativesSeed,
        userRoleMap,
      );

      return {
        response: response,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async findAllResultsLegacyNew(title: string) {
    try {
      const results: DepthSearch[] =
        await this._customResultRepository.AllResultsLegacyNewByTitle(title);
      if (!results.length) {
        throw {
          response: {},
          message: 'Results Not Found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      return {
        response: results,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  /**
   *
   * @param mapLegacy
   * @param user
   * @returns
   */
  async mapResultLegacy(mapLegacy: MapLegacy, user: TokenDto) {
    try {
      const results =
        await this._customResultRepository.findResultsLegacyNewById(
          mapLegacy.legacy_id,
        );
      if (!results.id) {
        throw {
          response: {},
          message: 'This result is already part of the PRMS reporting',
          status: HttpStatus.NOT_FOUND,
        };
      }

      const initiative = await this._clarisaInitiativesRepository.findOne({
        where: { id: mapLegacy.initiative_id },
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
          mapLegacy.result_level_id,
          mapLegacy.result_type_id,
        );
      const resultLevel = await this._resultLevelRepository.findOne({
        where: { id: mapLegacy.result_level_id },
      });
      const resultType = await this._resultTypesService.findOneResultType(
        mapLegacy.result_type_id,
      );
      if (!resultLevel) {
        throw {
          response: {},
          message: 'Result Level not found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      if (resultType.status >= 300) {
        throw this._handlersError.returnErrorRes({
          error: resultType,
          debug: true,
        });
      }

      if (!resultByLevel) {
        throw {
          response: {},
          message: 'The type or level is not compatible',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      const version = await this._versioningService.$_findActivePhase(
        AppModuleIdEnum.REPORTING,
      );
      if (!version) {
        throw this._handlersError.returnErrorRes({
          error: version,
          debug: true,
        });
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

      const rl: ResultLevel = <ResultLevel>resultLevel;
      const rt: ResultType = <ResultType>resultType.response;

      const legacyResult = await this._resultLegacyRepository.findOne({
        where: { legacy_id: mapLegacy.legacy_id },
      });
      legacyResult.is_migrated = true;

      const partner = await this._customResultRepository.findLegacyPartner(
        mapLegacy.legacy_id,
      );

      const last_code = await this._resultRepository.getLastResultCode();
      const newResultHeader: Result = await this._resultRepository.save({
        created_by: user.id,
        last_updated_by: user.id,
        result_type_id: rt.id,
        version_id: version.id,
        title: legacyResult.title,
        description: legacyResult.description,
        reported_year_id: year.year,
        result_level_id: rl.id,
        legacy_id: legacyResult.legacy_id,
        is_retrieved: true,
        result_code: last_code + 1,
      });

      await this._resultByInitiativesRepository.save({
        created_by: newResultHeader.created_by,
        initiative_id: initiative.id,
        initiative_role_id: 1,
        result_id: newResultHeader.id,
      });

      await this._resultLegacyRepository.save(legacyResult);

      const saveInstitutions: ResultsByInstitution[] = [];
      for (let index = 0; index < partner.length; index++) {
        const isInstitutions =
          await this._resultByIntitutionsRepository.getResultByInstitutionExists(
            newResultHeader.id,
            partner[index].clarisa_id,
            InstitutionRoleEnum.ACTOR,
          );
        if (!isInstitutions) {
          const institutionsNew: ResultsByInstitution =
            new ResultsByInstitution();
          institutionsNew.created_by = user.id;
          institutionsNew.institution_roles_id = 1;
          institutionsNew.institutions_id = partner[index].clarisa_id;
          institutionsNew.last_updated_by = user.id;
          institutionsNew.result_id = newResultHeader.id;
          institutionsNew.is_active = true;
          saveInstitutions.push(institutionsNew);
        }
      }
      const newInstitutions =
        await this._resultByIntitutionsRepository.save(saveInstitutions);

      const toRemoveFromElastic = await this.findAllSimplified(
        legacyResult.legacy_id,
      );

      const toAddFromElastic = await this.findAllSimplified(
        newResultHeader.id.toString(),
      );

      if (toRemoveFromElastic.status !== HttpStatus.OK) {
        this._logger.warn(
          `the result #${legacyResult.legacy_id} could not be found to be removed in the elastic search`,
        );
      } else if (toAddFromElastic.status !== HttpStatus.OK) {
        this._logger.warn(
          `the result #${newResultHeader.id} could not be found to be added in the elastic search`,
        );
      } else {
        try {
          const elasticOperations = [
            new ElasticOperationDto('DELETE', toRemoveFromElastic.response[0]),
            new ElasticOperationDto('PATCH', toAddFromElastic.response[0]),
          ];

          const elasticJson =
            this._elasticService.getBulkElasticOperationResults(
              process.env.ELASTIC_DOCUMENT_NAME,
              elasticOperations,
            );

          await this._elasticService.sendBulkOperationToElastic(elasticJson);
        } catch (_error) {
          this._logger.warn(
            `the elastic update failed for the result #${legacyResult.legacy_id}`,
          );
        }
      }

      return {
        response: {
          newResultHeader,
          newInstitutions,
        },
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  /**
   * Get general information of a result
   * @param resultId
   * @returns
   */
  async getGeneralInformation(
    resultId: number,
  ): Promise<ReturnResponseDto<GeneralInformationDto> | returnErrorDto> {
    try {
      const result =
        await this._resultRepository.getResultAndLevelTypeById(resultId);
      if (!result?.id) {
        throw {
          response: {},
          message: 'Results Not Found',
          status: HttpStatus.NOT_FOUND,
        };
      }
      const initiativa =
        await this._resultByInitiativesRepository.getResultByInitiativeOwnerFull(
          result.id,
        );
      const institutions =
        await this._resultByIntitutionsRepository.getResultByInstitutionActorsFull(
          result.id,
        );
      const institutionsType =
        await this._resultByIntitutionsTypeRepository.getResultByInstitutionTypeActorFull(
          result.id,
        );
      const discontinued_options =
        await this._resultsInvestmentDiscontinuedOptionRepository.find({
          where: {
            result_id: result.id,
            is_active: true,
          },
        });

      let leadContactPersonData = null;
      if (result.lead_contact_person_id && this._adUserRepository) {
        try {
          leadContactPersonData = await this._adUserRepository.findOne({
            where: { id: result.lead_contact_person_id, is_active: true },
          });
        } catch (error) {
          this._logger.warn(
            `Failed to get lead contact person data: ${error.message}`,
          );
        }
      }

      return {
        response: {
          result_id: result.id,
          is_replicated: result.is_replicated,
          initiative_id: initiativa.id,
          result_type_id: result.result_type_id,
          result_type_name: result.result_type_name,
          result_level_id: result.result_level_id,
          result_level_name: result.result_level_name,
          result_name: result.title ?? null,
          result_description: result.description ?? null,
          gender_tag_id: result.gender_tag_level_id || null,
          gender_impact_area_id: result.gender_impact_area_id || null,
          climate_change_tag_id: result.climate_change_tag_level_id || null,
          climate_impact_area_id: result.climate_impact_area_id || null,
          nutrition_tag_level_id: result.nutrition_tag_level_id || null,
          nutrition_impact_area_id: result.nutrition_impact_area_id || null,
          environmental_biodiversity_tag_level_id:
            result.environmental_biodiversity_tag_level_id || null,
          environmental_biodiversity_impact_area_id:
            result.environmental_biodiversity_impact_area_id || null,
          poverty_tag_level_id: result.poverty_tag_level_id || null,
          poverty_impact_area_id: result.poverty_impact_area_id || null,
          institutions: institutions,
          institutions_type: institutionsType,
          krs_url: result.krs_url ?? null,
          is_krs: result.is_krs ? true : false,
          lead_contact_person: result.lead_contact_person ?? null,
          lead_contact_person_data: leadContactPersonData,
          phase_name: result['phase_name'],
          phase_year: result['phase_year'],
          is_discontinued: result['is_discontinued'],
          discontinued_options: discontinued_options,
        },
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async saveGeoScope(createResultGeo: CreateResultGeoDto, user: TokenDto) {
    try {
      await this._resultRegionsService.create(createResultGeo);
      await this._resultCountriesService.create(createResultGeo, user);

      const toUpdateFromElastic = await this.findAllSimplified(
        createResultGeo.result_id.toString(),
      );

      if (toUpdateFromElastic.status !== HttpStatus.OK) {
        this._logger.warn(
          `the result #${createResultGeo.result_id} could not be found to be updated in the elastic search`,
        );
      } else {
        try {
          const elasticOperations = [
            new ElasticOperationDto('PATCH', toUpdateFromElastic.response[0]),
          ];

          const elasticJson =
            this._elasticService.getBulkElasticOperationResults(
              process.env.ELASTIC_DOCUMENT_NAME,
              elasticOperations,
            );

          await this._elasticService.sendBulkOperationToElastic(elasticJson);
        } catch (_error) {
          this._logger.warn(
            `the elastic update of the geoscope failed for the result #${createResultGeo.result_id}`,
          );
        }
      }

      return {
        response: createResultGeo,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async getGeoScope(resultId: number) {
    try {
      const result = await this._resultRepository.getResultById(resultId);

      if (!result?.id) {
        throw {
          response: {},
          message: 'Results Not Found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      const regions: (ResultRegion | string)[] =
        await this._resultRegionRepository.getResultRegionByResultId(resultId);
      const countries: (ResultCountry | string)[] =
        await this._resultCountryRepository.getResultCountriesByResultId(
          resultId,
        );

      const knowledgeProduct =
        await this._resultKnowledgeProductRepository.findOneBy({
          results_id: resultId,
        });

      if (knowledgeProduct) {
        //contries = knowledgeProduct.cgspace_countries?.split('; ') ?? [];
        //regions = knowledgeProduct.cgspace_regions?.split('; ') ?? [];
      }

      let scope = 0;
      if (
        result.geographic_scope_id == 1 ||
        result.geographic_scope_id == 2 ||
        result.geographic_scope_id == 5
      ) {
        scope = result.geographic_scope_id;
      } else if (
        result.geographic_scope_id == 3 ||
        result.geographic_scope_id == 4
      ) {
        scope = 3;
      } else if (result.geographic_scope_id == 50) {
        scope = 50;
      }
      return {
        response: {
          regions: regions,
          countries,
          geo_scope_id: scope,
          has_countries: result?.has_countries,
          has_regions: result?.has_regions,
        },
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async getResultDataForBasicReport(initDate: Date, endDate: Date) {
    try {
      const result = await this._resultRepository.getResultDataForBasicReport(
        initDate,
        endDate,
      );

      return {
        response: result,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async transformResultCode(resultCode: number, phase_id: number = null) {
    try {
      const phase = await this._versioningService.$_findPhase(phase_id);
      const result = await this._resultRepository.transformResultCode(
        resultCode,
        phase ? phase.id : null,
      );

      if (!result) {
        throw this._returnResponse.format({
          message: 'Result Not Found',
          statusCode: HttpStatus.NOT_FOUND,
          response: resultCode,
        });
      }

      return this._returnResponse.format({
        message: 'Successful response',
        statusCode: HttpStatus.OK,
        response: result,
      });
    } catch (error) {
      return this._returnResponse.format(
        error,
        !EnvironmentExtractor.isProduction(),
      );
    }
  }

  async versioningResultsById(resultId: number, user: TokenDto) {
    const { id: result_id, result_code } = await this._resultRepository.findOne(
      { where: { id: resultId } },
    );
    this._logger.verbose(
      `The versioning process of the result with id ${result_id} and code ${result_code} was started by ${user.id}: ${user.first_name} ${user.last_name}.`,
    );
  }

  async getCenters(resultId: number) {
    try {
      const centers =
        await this._resultsCenterRepository.getAllResultsCenterByResultId(
          resultId,
        );

      return this._returnResponse.format({
        message: 'Successful response',
        statusCode: HttpStatus.OK,
        response: centers,
      });
    } catch (error) {
      return this._returnResponse.format(
        error,
        !EnvironmentExtractor.isProduction(),
      );
    }
  }

  private async emitResultCreatedNotification(
    result: Result,
    initiativeId: number,
    userId: number,
  ) {
    try {
      const recipientIds = new Set<number>(
        await this.getInitiativeUserIds(initiativeId),
      );
      const applicationRecipientIds = await this.getApplicationUserIds();
      applicationRecipientIds.forEach((id) => recipientIds.add(id));

      if (!recipientIds.size) {
        return;
      }

      this._logger.verbose(
        `Emitting result created notification for result ${result.id}`,
      );
      await this._notificationService.emitResultNotification(
        NotificationLevelEnum.RESULT,
        NotificationTypeEnum.RESULT_CREATED,
        Array.from(recipientIds.values()),
        userId,
        result.id,
      );
    } catch (error) {
      this._logger.warn(
        `Failed to emit result created notification for result ${result.id}`,
        error as Error,
      );
    }
  }

  private async getInitiativeUserIds(initiativeId: number): Promise<number[]> {
    if (!this._roleByUserRepository) {
      return [];
    }

    try {
      const roles = await this._roleByUserRepository.find({
        where: { initiative_id: initiativeId, active: true },
      });

      const ids = new Set<number>();
      roles.forEach((role) => {
        if (role?.user) {
          ids.add(Number(role.user));
        }
      });

      return Array.from(ids.values());
    } catch (error) {
      this._logger.warn(
        `Failed to resolve users for initiative ${initiativeId}`,
        error as Error,
      );
      return [];
    }
  }

  private async getApplicationUserIds(): Promise<number[]> {
    if (!this._roleByUserRepository) {
      return [];
    }

    try {
      const roles = await this._roleByUserRepository.find({
        select: ['user'],
        where: {
          active: true,
          initiative_id: IsNull(),
          action_area_id: IsNull(),
          role: In([RoleEnum.ADMIN]),
        },
      });

      const ids = new Set<number>();
      roles.forEach((role) => {
        if (role?.user) {
          ids.add(Number(role.user));
        }
      });

      return Array.from(ids.values());
    } catch (error) {
      this._logger.warn(
        'Failed to resolve application-level notification recipients',
        error as Error,
      );
      return [];
    }
  }

  async createOwnerResultV2(
    createResultDto: CreateResultDto,
    user: TokenDto,
    isAdmin?: boolean,
    versionId?: number,
  ): Promise<returnFormatResult | returnErrorDto> {
    const result = await this.createOwnerResult(
      createResultDto,
      user,
      isAdmin,
      versionId,
    );

    if (
      result.status === HttpStatus.CREATED &&
      result.response &&
      (result.response as Result).id
    ) {
      try {
        await this._resultsTocResultRepository.save({
          planned_result: false,
          toc_level_id: null,
          result_id: (result.response as Result).id,
          initiative_ids: createResultDto.initiative_id,
          created_by: user.id,
          last_updated_by: user.id,
          is_active: true,
        });
      } catch (error) {
        this._logger.error(
          `Failed to create ResultsTocResult for result ${(result.response as Result).id}`,
          error,
        );
      }
    }

    return result;
  }

  async getAllResultsForInnovUse() {
    try {
      const results = await this._resultRepository.getResultsForInnovUse();

      return {
        response: results,
        message: 'Results retrieved successfully',
        status: 200,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  private async getTocMetadata(activeTocResults: any[], phaseYear: number) {
    if (!activeTocResults.length) return [];

    const tocResultIds = activeTocResults.map((toc) => toc.toc_result_id);

    const query = `
      SELECT
        tr.id as toc_result_id,
        tr.result_title,
        tri.related_node_id,
        tri.unit_messurament,
        tri.type_name,
        tri.indicator_description,
        trit.target_date,
        trit.target_value
      FROM ${process.env.DB_TOC}.toc_results tr
      LEFT JOIN ${process.env.DB_TOC}.toc_results_indicators tri ON tri.toc_results_id = tr.id
      LEFT JOIN ${process.env.DB_TOC}.toc_result_indicator_target trit ON tri.id = trit.id_indicator
        AND CONVERT(trit.toc_result_indicator_id USING utf8mb4) = CONVERT(tri.related_node_id USING utf8mb4)
        AND trit.target_date = ${phaseYear}
      WHERE tr.id IN (${tocResultIds.map(() => '?').join(',')})
        AND tri.is_active = 1
    `;

    try {
      const tocData = await this._resultRepository.query(query, tocResultIds);

      const groupedTocData = new Map();

      for (const toc of activeTocResults) {
        const tocResultData = tocData.filter(
          (td: any) => td.toc_result_id === toc.toc_result_id,
        );
        const indicators =
          toc.obj_results_toc_result_indicators?.filter(
            (ind: any) => ind.is_active,
          ) || [];

        const indicatorsWithContributions = indicators.map((indicator: any) => {
          const targets =
            indicator.obj_result_indicator_targets?.filter(
              (target: any) => target.is_active,
            ) || [];
          const contributingIndicator = targets.reduce(
            (sum: number, target: any) =>
              sum + (Number(target.contributing_indicator) || 0),
            0,
          );

          const tocIndicatorData = tocResultData.find(
            (td: any) =>
              td.related_node_id === indicator.toc_results_indicator_id,
          );

          return {
            indicator_description:
              tocIndicatorData?.indicator_description || null,
            type_name: tocIndicatorData?.type_name || null,
            unit_messurament: tocIndicatorData?.unit_messurament || null,
            target_date: tocIndicatorData?.target_date || null,
            target_value: tocIndicatorData?.target_value || null,
            contributing_indicator: contributingIndicator,
          };
        });

        groupedTocData.set(toc.toc_result_id, {
          toc_result_id: toc.toc_result_id,
          result_title: tocResultData[0]?.result_title || null,
          indicators: indicatorsWithContributions,
        });
      }

      return Array.from(groupedTocData.values());
    } catch (error) {
      this._logger.error('Error fetching TOC metadata:', error);
      return [];
    }
  }

  async getAIContext(resultId: number) {
    try {
      const result = await this._resultRepository.findOne({
        where: { id: resultId, is_active: true },
        relations: [
          'obj_result_type',
          'obj_result_level',
          'obj_gender_tag_level',
          'obj_gender_impact_area',
          'obj_climate_change_tag_level',
          'obj_climate_impact_area',
          'obj_nutrition_tag_level',
          'obj_nutrition_impact_area',
          'obj_environmental_biodiversity_tag_level',
          'obj_environmental_biodiversity_impact_area',
          'obj_poverty_tag_level_id',
          'obj_poverty_impact_area',
          'obj_geographic_scope',
          'result_region_array.region_object',
          'result_country_array.country_object',
          'obj_result_by_initiatives.obj_initiative',
          'evidence_array',
          'obj_results_toc_result.obj_results_toc_result_indicators.obj_result_indicator_targets',
          'obj_version',
          'result_center_array.clarisa_center_object.clarisa_institution',
        ],
      });

      if (!result) {
        throw {
          response: {},
          message: 'Result not found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      let innovationsDev: ResultsInnovationsDev = null;
      if (result.result_type_id === ResultTypeEnum.INNOVATION_DEVELOPMENT) {
        innovationsDev = await this._resultsInnovationsDevRepository.query(
          `
            SELECT short_title, result_innovation_dev_id, results_id
            FROM results_innovations_dev
            WHERE results_id = ?
            ORDER BY is_active DESC, result_innovation_dev_id DESC
            LIMIT 1
          `,
          [resultId],
        );
      }
      console.log(innovationsDev);

      const activeInitiatives =
        result.obj_result_by_initiatives?.filter((rbi) => rbi.is_active) || [];
      const primarySubmitter =
        activeInitiatives.find((rbi) => Number(rbi.initiative_role_id) === 1)
          ?.obj_initiative?.name || null;
      const primarySubmitterOfficialCode =
        activeInitiatives.find((rbi) => Number(rbi.initiative_role_id) === 1)
          ?.obj_initiative?.official_code || null;

      const activeEvidence =
        result.evidence_array?.filter((e) => e.is_active) || [];
      const evidence = activeEvidence
        .map((e) => ({
          link: e.link,
          description: e.description,
        }))
        .filter((e) => e.link || e.description);

      const tocMetadata = await this.getTocMetadata(
        result.obj_results_toc_result?.filter((toc) => toc.is_active) || [],
        result.obj_version.phase_year,
      );

      const activeCenters =
        result.result_center_array?.filter((c) => c.is_active) || [];
      const centers = activeCenters
        .map((c) => ({
          code: c.clarisa_center_object?.code || null,
          financial_code: c.clarisa_center_object?.financial_code || null,
          is_primary: c.is_primary || false,
          institution_name:
            c.clarisa_center_object?.clarisa_institution?.name || null,
          institution_acronym:
            c.clarisa_center_object?.clarisa_institution?.acronym || null,
          institution_website:
            c.clarisa_center_object?.clarisa_institution?.website_link || null,
        }))
        .filter((c) => c.code);

      const response = {
        id: result.id,
        result_code: result.result_code,
        result_type_name: result.obj_result_type?.name || null,
        result_level_id: result.result_level_id,
        result_level_name: result.obj_result_level?.name || null,
        result_name: result.title,
        result_description: result.description,
        short_title: innovationsDev?.[0]?.short_title || null,
        geographic_scope_name: result.obj_geographic_scope?.name || null,
        geographic_scope_description:
          result.obj_geographic_scope?.description || null,
        regions:
          result.result_region_array
            ?.filter((r) => r.is_active)
            .map((r) => r.region_object?.name)
            .filter(Boolean)
            .join(', ') || null,
        countries:
          result.result_country_array
            ?.filter((c) => c.is_active)
            .map((c) => c.country_object?.name)
            .filter(Boolean)
            .join(', ') || null,
        primary_submitter_initiative: primarySubmitter,
        primary_submitter_initiative_official_code:
          primarySubmitterOfficialCode,
        gender_tag_level_description:
          result.obj_gender_tag_level?.description || null,
        gender_impact_area_impact_area:
          result.obj_gender_impact_area?.impact_area || null,
        climate_change_tag_level_description:
          result.obj_climate_change_tag_level?.description || null,
        climate_impact_area_impact_area:
          result.obj_climate_impact_area?.impact_area || null,
        nutrition_tag_level_description:
          result.obj_nutrition_tag_level?.description || null,
        nutrition_impact_area_impact_area:
          result.obj_nutrition_impact_area?.impact_area || null,
        environmental_biodiversity_tag_level_description:
          result.obj_environmental_biodiversity_tag_level?.description || null,
        environmental_biodiversity_impact_area_impact_area:
          result.obj_environmental_biodiversity_impact_area?.impact_area ||
          null,
        poverty_tag_level_description:
          result.obj_poverty_tag_level_id?.description || null,
        poverty_impact_area_impact_area:
          result.obj_poverty_impact_area?.impact_area || null,
        evidence: evidence,
        centers: centers,
        toc_metadata: tocMetadata,
      };

      return {
        response,
        message: 'AI context retrieved successfully',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }
}
