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
  ) {}

  async createOwnerResult(
    createResultDto: CreateResultDto,
    user: TokenDto,
  ): Promise<returnFormatResult | returnErrorDto> {
    try {
      if (
        !createResultDto?.result_name ||
        !createResultDto?.initiative_id ||
        !createResultDto?.result_type_id
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
          message: 'Initiative Not fount',
          status: HttpStatus.NOT_FOUND,
        };
      }

      const resultType = await this._resultTypesService.findOneResultType(
        createResultDto.result_type_id,
      );
      if (resultType.status >= 300) {
        throw this._handlersError.returnErrorRes({ error: resultType });
      }
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
          message: 'Active year Not fount',
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

  async createResultGeneralInformation(
    resultGI: CreateGeneralInformationResultDto,
  ) {
    try {
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

  async creatFullResult() {
    try {
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
      const results: DepthSearch[] = await this._customResultRepository.AllResultsLegacyNewByTitle(title);
      if(!results.length){
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

  update(id: number, updateResultDto: UpdateResultDto) {
    return `This action updates a #${id} result ${updateResultDto}`;
  }

  remove(id: number) {
    return `This action removes a #${id} result`;
  }
}
