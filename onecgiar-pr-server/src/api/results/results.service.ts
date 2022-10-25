import { HttpStatus, Injectable } from '@nestjs/common';
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

@Injectable()
export class ResultsService {
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
    private readonly _genderTagRepository: GenderTagRepository
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
        throw this._handlersError.returnErrorRes({ error: resultType });
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

      if (rt.name === 'Knowledge Product') {
        /** aca va la funcion de QAP */
        /** funcion para mapear el Knowledge Product */
        /**
         * !cambiar esta funcion apenas se tenga MQAP
         */
        throw {
          response: {},
          message: 'Knowledge Product not working!',
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        };
      }

      const version = await this._versionsService.findBaseVersion();
      if (version.status >= 300) {
        throw this._handlersError.returnErrorRes({ error: version });
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
      return this._handlersError.returnErrorRes({ error });
    }
  }

  /**
   * ! endpoint getAllInstitutions
   * @returns 
   */
  async getAllInstitutions(){
    try {
      const entities = await this._clarisaInstitutionsRepository.getAllInstitutions();
      if(!entities.length){
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
      return this._handlersError.returnErrorRes({ error });
    }
  }

  async getAllInstitutionsType(){
    try {
      const entities = await this._clarisaInstitutionsTypeRepository.getInstitutionsType();
      if(!entities.length){
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
      return this._handlersError.returnErrorRes({ error });
    }
  }

  async createResultGeneralInformation(
    resultGeneralInformation: CreateGeneralInformationResultDto,
    user: TokenDto
  ) {
    try {
      const result = await this._resultRepository.getResultById(resultGeneralInformation.result_id);
      if(!result){
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
        throw this._handlersError.returnErrorRes({ error: resultType });
      }

      const resultByLevel = await this._resultByLevelRepository.getByTypeAndLevel(resultGeneralInformation.result_level_id, resultGeneralInformation.result_type_id);
      if(!resultByLevel){
        throw {
          response: {},
          message: 'The type or level is not compatible',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      const genderTag = await this._genderTagRepository.findOne({where:{id: resultGeneralInformation.gender_tag_id}});
      if(!genderTag){
        throw {
          response: {},
          message: 'The Gender tag does not exist',
          status: HttpStatus.NOT_FOUND,
        };
      }

      const climateTag = await this._genderTagRepository.findOne({where:{id: resultGeneralInformation.climate_change_tag_id}});
      if(!climateTag){
        throw {
          response: {},
          message: 'The Climate change tag does not exist',
          status: HttpStatus.NOT_FOUND,
        };
      }
      if(resultGeneralInformation.institutions.length){
        const validInstitutions = await this._clarisaInstitutionsRepository.getValidInstitution(resultGeneralInformation.institutions);
  
        const isValidInst: any[] = validInstitutions.filter(el => el.valid === '0');
        if(isValidInst.length){
          throw {
            response: isValidInst,
            message: 'Institutions do not exist that are intended to assign',
            status: HttpStatus.BAD_REQUEST,
          };
        }

      }

      if(resultGeneralInformation.institutions_type.length){
        const validInstitutionType = await this._clarisaInstitutionsTypeRepository.getValidInstitutionType(resultGeneralInformation.institutions_type);
        const isValidInstType: any[] = validInstitutionType.filter(el => el.valid === '0');
        if(isValidInstType.length){
          throw {
            response: isValidInstType,
            message: 'Institutions type do not exist that are intended to assign',
            status: HttpStatus.BAD_REQUEST,
          };
        }
        
      }

      if(!resultGeneralInformation.is_krs){
        resultGeneralInformation.krs_url = null;
      }

      const version = await this._versionsService.findBaseVersion();
      if (version.status >= 300) {
        throw this._handlersError.returnErrorRes({ error: version });
      }
      const vrs: Version = <Version>version.response;

      const updateResult = await this._resultRepository.save({
        id: result.id,
        title: resultGeneralInformation.result_name,
        result_type_id: resultByLevel.result_type_id,
        result_level_id: resultByLevel.result_level_id,
        description: resultGeneralInformation.result_description,
        gender_tag_level_id: genderTag.id,
        climate_change_tag_level_id: climateTag.id,
        krs_url: resultGeneralInformation.krs_url,
        is_krs: resultGeneralInformation.is_krs,
        last_updated_by: user.id
      });

      const institutions = await this._resultByIntitutionsRepository.updateIstitutions(resultGeneralInformation.result_id, resultGeneralInformation.institutions, true, user.id);
      let saveInstitutions: ResultsByInstitution[] = [];
      for (let index = 0; index < resultGeneralInformation.institutions.length; index++) {
        const isInstitutions = await this._resultByIntitutionsRepository.getResultByInstitutionExists(resultGeneralInformation.result_id, resultGeneralInformation.institutions[index], true);
        if(!isInstitutions){
          const institutionsNew: ResultsByInstitution = new ResultsByInstitution();
          institutionsNew.created_by = user.id;
          institutionsNew.institution_roles_id = 1;
          institutionsNew.institutions_id = resultGeneralInformation.institutions[index];
          institutionsNew.last_updated_by = user.id;
          institutionsNew.result_id = resultGeneralInformation.result_id;
          institutionsNew.version_id = vrs.id;
          institutionsNew.is_active = true;
          saveInstitutions.push(institutionsNew);
        }
        
      }
      const updateInstitutions = await this._resultByIntitutionsRepository.save(saveInstitutions);

      const institutionsType = await this._resultByIntitutionsTypeRepository.updateIstitutionsType(resultGeneralInformation.result_id, resultGeneralInformation.institutions_type, true, user.id);
      let saveInstitutionsType: ResultsByInstitutionType[] = [];
      for (let index = 0; index < resultGeneralInformation.institutions_type.length; index++) {
        const institutionsType = await this._resultByIntitutionsTypeRepository.getResultByInstitutionTypeExists(resultGeneralInformation.result_id, resultGeneralInformation.institutions_type[index], true);
        if(!institutionsType){
          const institutionsTypeNew: ResultsByInstitutionType = new ResultsByInstitutionType();
          institutionsTypeNew.created_by = user.id;
          institutionsTypeNew.institution_roles_id = 1;
          institutionsTypeNew.institution_types_id = resultGeneralInformation.institutions_type[index];
          institutionsTypeNew.last_updated_by = user.id;
          institutionsTypeNew.results_id = resultGeneralInformation.result_id;
          institutionsTypeNew.version_id = vrs.id;
          institutionsTypeNew.is_active = true;
          saveInstitutionsType.push(institutionsTypeNew);
        }
        
      }
      const updateInstitutionsType = await this._resultByIntitutionsTypeRepository.save(saveInstitutionsType);
      return {
        response: {
          updateResult,
          institutions:{
            institutions,
            updateInstitutions
          },
          institutionsType:{
            institutionsType,
            saveInstitutionsType
          }

        },
        message: `Updated the general information of result ${resultGeneralInformation.result_id}`,
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
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
      return this._handlersError.returnErrorRes({ error });
    }
  }

  async findAll(): Promise<returnFormatUser> {
    try {
      const result: FullResultsRequestDto[] =
        await this._customResultRepository.AllResults();

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
      return this._handlersError.returnErrorRes({ error });
    }
  }

  async findResultById(id: number): Promise<returnFormatUser> {
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
      return this._handlersError.returnErrorRes({ error });
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
      return this._handlersError.returnErrorRes({ error });
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
      return this._handlersError.returnErrorRes({ error });
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
      const results: DepthSearchOne =
        await this._customResultRepository.findResultsLegacyNewById(
          mapLegacy.legacy_id,
        );
      if (!results?.id) {
        throw {
          response: {},
          message: 'Results Not Found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      if (results.legacy == '0') {
        throw {
          response: {},
          message: 'This result is already part of the PRMS reporting',
          status: HttpStatus.BAD_REQUEST,
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
        throw this._handlersError.returnErrorRes({ error: resultType });
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
        throw this._handlersError.returnErrorRes({ error: version });
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

      const newResultHeader: Result = await this._resultRepository.save({
        created_by: user.id,
        last_updated_by: user.id,
        result_type_id: rt.id,
        version_id: vrs.id,
        title: legacyResult.title,
        reported_year_id: year.year,
        result_level_id: rl.id,
        legacy_id: legacyResult.legacy_id,
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

      return {
        response: results,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  async getGeneralInformation(resultId: number){
    try {
      const result = await this._resultRepository.getResultAndLevelTypeById(resultId);
      if(!result?.id){
        throw {
          response: {},
          message: 'Results Not Found',
          status: HttpStatus.NOT_FOUND,
        };
      }
      const initiativa = await this._resultByInitiativesRepository.getResultByInitiativeOwnerFull(result.id);
      const institutions = await this._resultByIntitutionsRepository.getResultByInstitutionActorsFull(result.id);
      const institutionsType = await this._resultByIntitutionsTypeRepository.getResultByInstitutionTypeActorFull(result.id);

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
          gender_tag_id: result.gender_tag_level_id ?? null,
          climate_change_tag_id: result.climate_change_tag_level_id ?? null,
          institutions: institutions.map(el => el.institutions_id),
          institutions_type:institutionsType.map(el => el.institution_types_id),
          krs_url: result.krs_url ?? null,
          is_krs: result.is_krs? true: false
        },
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  update(id: number, updateResultDto: UpdateResultDto) {
    return `This action updates a #${id} result ${updateResultDto}`;
  }

  remove(id: number) {
    return `This action removes a #${id} result`;
  }
}
