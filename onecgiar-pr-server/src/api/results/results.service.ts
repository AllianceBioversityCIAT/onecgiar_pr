import { ConsoleLogger, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { returnFormatUser } from 'src/auth/modules/user/dto/return-create-user.dto';
import { CreateResultDto } from './dto/create-result.dto';
import { FullResultsRequestDto } from './dto/full-results-request.dto';
import { UpdateResultDto } from './dto/update-result.dto';
import { ResultRepository } from './result.repository';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';
import { ClarisaInitiativesRepository } from '../../clarisa/clarisa-initiatives/ClarisaInitiatives.repository';
import {
  HandlersError,
  returnErrorDto,
} from '../../shared/handlers/error.utils';
import { ResultTypesService } from './result_types/result_types.service';
import { ResultType } from './result_types/entities/result_type.entity';
import { VersionsService } from './versions/versions.service';
import { Version } from './versions/entities/version.entity';
import { returnFormatResult } from './dto/return-format-result.dto';
import { Result } from './entities/result.entity';
import { CreateGeneralInformationResultDto } from './dto/create-general-information-result.dto';
import { ResultsByInititiativesService } from './results_by_inititiatives/results_by_inititiatives.service';
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
import { DepthSearchOne } from './dto/depth-search-one.dto';
import { MapLegacy } from './dto/map-legacy.dto';
import { ClarisaInstitutionsRepository } from '../../clarisa/clarisa-institutions/ClariasaInstitutions.repository';
import { ClarisaInstitutionsTypeRepository } from '../../clarisa/clarisa-institutions-type/ClariasaInstitutionsType.repository';
import { GenderTagRepository } from './gender_tag_levels/genderTag.repository';
import { In } from 'typeorm';
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
import { ResultSimpleDto } from './dto/result-simple.dto';
import { ElasticService } from '../../elastic/elastic.service';
import { ElasticOperationDto } from '../../elastic/dto/elastic-operation.dto';
import process from 'process';

@Injectable()
export class ResultsService {
  private readonly _logger: Logger = new Logger(ResultsService.name);
  constructor(
    private readonly _resultRepository: ResultRepository,
    private readonly _clarisaInitiativesRepository: ClarisaInitiativesRepository,
    private readonly _resultTypesService: ResultTypesService,
    private readonly _versionsService: VersionsService,
    private readonly _handlersError: HandlersError,
    private readonly _customResultRepository: ResultRepository,
    private readonly _resultsByInititiativesService: ResultsByInititiativesService,
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
    private readonly _resultRegionRepository: ResultRegionRepository,
    private readonly _resultCountryRepository: ResultCountryRepository,
    private readonly _resultKnowledgeProductRepository: ResultsKnowledgeProductsRepository,
    private readonly _elasticService: ElasticService,
  ) {}

  /**
   * !endpoint createOwnerResult
   */
  async createOwnerResult(
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

      const version = await this._versionsService.findBaseVersion();
      if (version.status >= 300) {
        throw this._handlersError.returnErrorRes({
          error: version,
          debug: true,
        });
      }
      const vrs: Version = <Version>version.response;

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
        result_type_id: rt.id,
        version_id: vrs.id,
        title: createResultDto.result_name,
        reported_year_id: year.year,
        result_level_id: rl.id,
      });

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

          const elasticJson =
            this._elasticService.getBulkElasticOperationResults(
              process.env.ELASTIC_DOCUMENT_NAME,
              elasticOperations,
            );

          const bulk = await this._elasticService.sendBulkOperationToElastic(
            elasticJson,
          );
        } catch (error) {
          this._logger.warn(
            `the elastic upload failed for the result #${newResultHeader.id}`,
          );
        }
      }

      const resultByInitiative = await this._resultByInitiativesRepository.save(
        {
          created_by: newResultHeader.created_by,
          initiative_id: initiative.id,
          initiative_role_id: 1,
          result_id: newResultHeader.id,
          version_id: vrs.id,
        },
      );

      return {
        response: newResultHeader,
        message: 'The Result has been created successfully',
        status: HttpStatus.CREATED,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
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

  async createResultGeneralInformation(
    resultGeneralInformation: CreateGeneralInformationResultDto,
    user: TokenDto,
  ) {
    try {
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

      const version = await this._versionsService.findBaseVersion();
      if (version.status >= 300) {
        throw this._handlersError.returnErrorRes({
          error: version,
          debug: true,
        });
      }
      const vrs: Version = <Version>version.response;

      const updateResult = await this._resultRepository.save({
        id: result.id,
        title: resultGeneralInformation.result_name,
        result_type_id: resultByLevel.result_type_id,
        result_level_id: resultByLevel.result_level_id,
        description: resultGeneralInformation.result_description,
        gender_tag_level_id: resultGeneralInformation.gender_tag_id
          ? genderTag.id
          : null,
        climate_change_tag_level_id:
          resultGeneralInformation.climate_change_tag_id ? climateTag.id : null,
        krs_url: resultGeneralInformation.krs_url,
        is_krs: resultGeneralInformation.is_krs,
        last_updated_by: user.id,
        lead_contact_person: resultGeneralInformation.lead_contact_person,
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

          const bulk = await this._elasticService.sendBulkOperationToElastic(
            elasticJson,
          );
        } catch (error) {
          this._logger.warn(
            `the elastic update failed for the result #${updateResult.id}`,
          );
        }
      }

      const institutions =
        await this._resultByIntitutionsRepository.updateIstitutions(
          resultGeneralInformation.result_id,
          resultGeneralInformation.institutions,
          true,
          user.id,
        );
      let saveInstitutions: ResultsByInstitution[] = [];
      for (
        let index = 0;
        index < resultGeneralInformation.institutions.length;
        index++
      ) {
        const isInstitutions =
          await this._resultByIntitutionsRepository.getResultByInstitutionExists(
            resultGeneralInformation.result_id,
            resultGeneralInformation.institutions[index].institutions_id,
            true,
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
          institutionsNew.version_id = vrs.id;
          institutionsNew.is_active = true;
          saveInstitutions.push(institutionsNew);
        }
      }
      const updateInstitutions = await this._resultByIntitutionsRepository.save(
        saveInstitutions,
      );

      const institutionsType =
        await this._resultByIntitutionsTypeRepository.updateIstitutionsType(
          resultGeneralInformation.result_id,
          resultGeneralInformation.institutions_type,
          true,
          user.id,
        );
      let saveInstitutionsType: ResultsByInstitutionType[] = [];
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
          institutionsTypeNew.version_id = vrs.id;
          institutionsTypeNew.is_active = true;
          saveInstitutionsType.push(institutionsTypeNew);
        }
      }
      const updateInstitutionsType =
        await this._resultByIntitutionsTypeRepository.save(
          saveInstitutionsType,
        );
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

  async deleteResult(resultId: number) {
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
      result.is_active = false;

      await this._resultRepository.save(result);
      await this._resultByInitiativesRepository.logicalElimination(resultId);
      await this._resultByIntitutionsTypeRepository.logicalElimination(
        result.id,
      );
      await this._resultByIntitutionsRepository.logicalElimination(result.id);
      await this._resultByEvidencesRepository.logicalElimination(result.id);

      return {
        response: result,
        message: 'The result has been successfully deleted',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
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
    try {
      const queryResult =
        await this._customResultRepository.resultsForElasticSearch(id);

      if (!queryResult.length) {
        throw {
          response: {},
          message: 'Results Not Found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      const operations: ElasticOperationDto<ResultSimpleDto>[] =
        queryResult.map((r) => new ElasticOperationDto('PATCH', r));

      const elasticJson: string =
        this._elasticService.getBulkElasticOperationResults(
          documentName,
          operations,
        );

      return {
        response: elasticJson,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async findAllSimplified(id?: string) {
    try {
      const result = await this._customResultRepository.resultsForElasticSearch(
        id,
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

  async findResultById(id: number): Promise<returnFormatUser> {
    try {
      const result: Result = await this._customResultRepository.getResultById(
        id,
      );

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

  async findAllByRole(userId: number) {
    try {
      const result: any[] =
        await this._customResultRepository.AllResultsByRoleUsers(userId);

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

      const version = await this._versionsService.findBaseVersion();
      if (version.status >= 300) {
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
      const vrs: Version = <Version>version.response;

      const legacyResult = await this._resultLegacyRepository.findOne({
        where: { legacy_id: mapLegacy.legacy_id },
      });
      legacyResult.is_migrated = true;

      const partner = await this._customResultRepository.findLegacyPartner(
        mapLegacy.legacy_id,
      );

      const newResultHeader: Result = await this._resultRepository.save({
        created_by: user.id,
        last_updated_by: user.id,
        result_type_id: rt.id,
        version_id: vrs.id,
        title: legacyResult.title,
        description: legacyResult.description,
        reported_year_id: year.year,
        result_level_id: rl.id,
        legacy_id: legacyResult.legacy_id,
        is_retrieved: true,
      });

      const resultByInitiative = await this._resultByInitiativesRepository.save(
        {
          created_by: newResultHeader.created_by,
          initiative_id: initiative.id,
          initiative_role_id: 1,
          result_id: newResultHeader.id,
          version_id: vrs.id,
        },
      );

      await this._resultLegacyRepository.save(legacyResult);

      let saveInstitutions: ResultsByInstitution[] = [];
      for (let index = 0; index < partner.length; index++) {
        const isInstitutions =
          await this._resultByIntitutionsRepository.getResultByInstitutionExists(
            newResultHeader.id,
            partner[index].clarisa_id,
            true,
          );
        if (!isInstitutions) {
          const institutionsNew: ResultsByInstitution =
            new ResultsByInstitution();
          institutionsNew.created_by = user.id;
          institutionsNew.institution_roles_id = 1;
          institutionsNew.institutions_id = partner[index].clarisa_id;
          institutionsNew.last_updated_by = user.id;
          institutionsNew.result_id = newResultHeader.id;
          institutionsNew.version_id = vrs.id;
          institutionsNew.is_active = true;
          saveInstitutions.push(institutionsNew);
        }
      }
      const newInstitutions = await this._resultByIntitutionsRepository.save(
        saveInstitutions,
      );

      const toRemoveFromElastic = await this.findAllSimplified(
        legacyResult.legacy_id,
      );

      if (toRemoveFromElastic.status !== HttpStatus.OK) {
        this._logger.warn(
          `the result #${legacyResult.legacy_id} could not be found to be updated in the elastic search`,
        );
      } else {
        try {
          const elasticOperations = [
            new ElasticOperationDto('DELETE', toRemoveFromElastic.response[0]),
          ];

          const elasticJson =
            this._elasticService.getBulkElasticOperationResults(
              process.env.ELASTIC_DOCUMENT_NAME,
              elasticOperations,
            );

          const bulk = await this._elasticService.sendBulkOperationToElastic(
            elasticJson,
          );
        } catch (error) {
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

  async getGeneralInformation(resultId: number) {
    try {
      const result = await this._resultRepository.getResultAndLevelTypeById(
        resultId,
      );
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
      console.log(result);
      return {
        response: {
          result_id: result.id,
          initiative_id: initiativa.id,
          result_type_id: result.result_type_id,
          result_type_name: result.result_type_name,
          result_level_id: result.result_level_id,
          result_level_name: result.result_level_name,
          result_name: result.title ?? null,
          result_description: result.description ?? null,
          gender_tag_id: result.gender_tag_level_id || null,
          climate_change_tag_id: result.climate_change_tag_level_id || null,
          institutions: institutions,
          institutions_type: institutionsType,
          krs_url: result.krs_url ?? null,
          is_krs: result.is_krs ? true : false,
          lead_contact_person: result.lead_contact_person ?? null,
        },
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async saveGeoScope(createResultGeo: CreateResultGeoDto) {
    try {
      await this._resultRegionsService.create(createResultGeo);
      await this._resultCountriesService.create(createResultGeo);

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

      let regions: (ResultRegion | string)[] =
        await this._resultRegionRepository.getResultRegionByResultId(resultId);
      let contries: (ResultCountry | string)[] =
        await this._resultCountryRepository.getResultCountriesByResultId(
          resultId,
        );

      const knowledgeProduct =
        await this._resultKnowledgeProductRepository.findOneBy({
          results_id: resultId,
        });

      if (knowledgeProduct) {
        contries = knowledgeProduct.cgspace_countries?.split('; ') ?? [];
        regions = knowledgeProduct.cgspace_regions?.split('; ') ?? [];
      }

      let scope: number = 0;
      if (result.geographic_scope_id == 1 || result.geographic_scope_id == 2) {
        scope = result.geographic_scope_id;
      } else if (
        result.geographic_scope_id == 3 ||
        result.geographic_scope_id == 4
      ) {
        scope = 3;
      } else if (result.geographic_scope_id == 50) {
        scope = 4;
      } else {
        scope = null;
      }
      return {
        response: {
          regions: regions,
          countries: contries,
          scope_id: scope,
          has_countries: result?.has_countries ? true : false ?? null,
          has_regions: result?.has_regions ? true : false ?? null,
        },
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async reportingList(initDate: Date, endDate: Date) {
    try {
      const result = await this._resultRepository.reportingResultList(initDate, endDate);

      return {
        response: result,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  update(id: number, updateResultDto: UpdateResultDto) {
    return `This action updates a #${id} result ${updateResultDto}`;
  }

  remove(id: number) {
    return `This action removes a #${id} result`;
  }
}
