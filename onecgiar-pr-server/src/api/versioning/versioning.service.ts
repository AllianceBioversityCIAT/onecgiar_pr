import { Injectable, HttpStatus, Logger } from '@nestjs/common';
import { CreateVersioningDto } from './dto/create-versioning.dto';
import { UpdateVersioningDto } from './dto/update-versioning.dto';
import { Version } from './entities/version.entity';
import { VersionRepository } from './versioning.repository';
import { Result } from '../results/entities/result.entity';
import { ResultRepository } from '../results/result.repository';
import { ApplicationModules } from './entities/application-modules.entity';
import { ApplicationModulesRepository } from './repositories/application-modules.repository';
import {
  ReturnResponse,
  ReturnResponseDto,
} from '../../shared/handlers/error.utils';
import { env } from 'process';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';
import { NonPooledProjectRepository } from '../results/non-pooled-projects/non-pooled-projects.repository';
import { ResultsCenterRepository } from '../results/results-centers/results-centers.repository';
import { ResultsTocResultRepository } from '../results/results-toc-results/results-toc-results.repository';
import { ResultByInitiativesRepository } from '../results/results_by_inititiatives/resultByInitiatives.repository';
import { ResultByIntitutionsRepository } from '../results/results_by_institutions/result_by_intitutions.repository';
import { ResultByInstitutionsByDeliveriesTypeRepository } from '../results/result-by-institutions-by-deliveries-type/result-by-institutions-by-deliveries-type.repository';
import { ResultByIntitutionsTypeRepository } from '../results/results_by_institution_types/result_by_intitutions_type.repository';
import { ResultCountryRepository } from '../results/result-countries/result-countries.repository';
import { ResultRegionRepository } from '../results/result-regions/result-regions.repository';
import { LinkedResultRepository } from '../results/linked-results/linked-results.repository';

@Injectable()
export class VersioningService {
  private readonly _logger: Logger = new Logger(VersioningService.name);

  constructor(
    private readonly _versionRepository: VersionRepository,
    private readonly _resultRepository: ResultRepository,
    private readonly _applicationModulesRepository: ApplicationModulesRepository,
    private readonly _returnResponse: ReturnResponse,
    private readonly _nonPooledProjectRepository: NonPooledProjectRepository,
    private readonly _resultsCenterRepository: ResultsCenterRepository,
    private readonly _resultsTocResultRepository: ResultsTocResultRepository,
    private readonly _resultByInitiativesRepository: ResultByInitiativesRepository,
    private readonly _resultByIntitutionsRepository: ResultByIntitutionsRepository,
    private readonly _resultByInstitutionsByDeliveriesTypeRepository: ResultByInstitutionsByDeliveriesTypeRepository,
    private readonly _resultByIntitutionsTypeRepository: ResultByIntitutionsTypeRepository,
    private readonly _resultCountryRepository: ResultCountryRepository,
    private readonly _resultRegionRepository: ResultRegionRepository,
    private readonly _linkedResultRepository: LinkedResultRepository,
  ) {}

  /**
   *  @important The prefix $_ indicates that this method is for internal
   *  application use only.
   */

  /**
   *  Retrieves the active version from the database.
   *  @important This method should only be used internally.
   *  @returns {Promise<Version>} The active version.
   *  @throws {Error} If an error occurs while retrieving the active version
   *  and return null.
   */
  async $_findActivePhase(): Promise<Version> {
    try {
      const version = await this._versionRepository.findOne({
        where: {
          status: true,
          is_active: true,
        },
      });

      return version;
    } catch (error) {
      return null;
    }
  }

  async $_genericValidation(
    result_code: number,
    phase_id: number,
  ): Promise<boolean> {
    try {
      const res = await this._resultRepository.findOne({
        where: {
          version_id: phase_id,
          result_code: result_code,
          is_active: true,
        },
      });
      return res ? false : true;
    } catch (error) {
      return false;
    }
  }

  async $_phaseChangeReporting(result: Result, phase: Version, user: TokenDto) {
    try {
      this._logger.log(
        `REPORTING: Phase change in the ${result.id} result to the ${phase.phase_name} phase[${phase.id}].`,
      );
      /*const data = await this._resultRepository.replicable({
        old_result_id: result.id,
        phase: phase.id,
        user: user,
      });*/
      const data = { id: 4880, result_code: 224 };
      const config = {
        old_result_id: result.id,
        new_result_id: data.id,
        phase: phase.id,
        user: user,
      };
      //await this._resultByInitiativesRepository.replicable(config);
      //await this._nonPooledProjectRepository.replicable(config);
      //await this._resultsCenterRepository.replicable(config);
      //await this._resultsTocResultRepository.replicable(config);
      //await this._resultByIntitutionsRepository.replicable(config);
      //await this._resultByInstitutionsByDeliveriesTypeRepository.replicable(
      //  config,
      //);
      //await this._resultByIntitutionsTypeRepository.replicable(config);
      //await this._resultCountryRepository.replicable(config);
      //await this._resultRegionRepository.replicable(config);
      //await this._linkedResultRepository.replicable(config);
    } catch (error) {}
  }

  async $_phaseChangeIPSR(result: Result, phase: Version, user: TokenDto) {}

  async $_versionManagement(
    result: Result,
    phase: Version,
    user: TokenDto,
    module_id: number,
  ) {
    switch (module_id) {
      case 1:
        await this.$_phaseChangeReporting(result, phase, user);
        break;
      case 2:
        await this.$_phaseChangeIPSR(result, phase, user);
        break;
      default:
        break;
    }
  }

  $_validationModule(result_type_id: number) {
    if ([1, 2, 3, 4, 5, 6, 7, 8, 9].includes(result_type_id)) return 1;
    if ([10, 11].includes(result_type_id)) return 2;
    return null;
  }

  async versionProcess(result_id: number, user: TokenDto) {
    try {
      const legacy_result = await this._resultRepository.findOne({
        where: {
          id: result_id,
          is_active: true,
        },
      });

      if (!legacy_result) {
        throw this._returnResponse.format({
          message: `Result ID: ${result_id} not found`,
          response: result_id,
          statusCode: HttpStatus.NOT_FOUND,
        });
      }

      const module_id = this.$_validationModule(legacy_result.result_type_id);

      const phase = await this._versionRepository.findOne({
        where: {
          is_active: true,
          status: true,
        },
      });
      //! @important: Quitar el true cuando se haya terminado de validar
      if (
        (await this.$_genericValidation(legacy_result.result_code, phase.id)) ||
        true
      ) {
        await this.$_versionManagement(legacy_result, phase, user, module_id);
      } else {
        throw this._returnResponse.format({
          message: `The result ${legacy_result.result_code} is already in the ${phase.phase_name} phase`,
          response: result_id,
          statusCode: HttpStatus.CONFLICT,
        });
      }
    } catch (error) {
      return this._returnResponse.format(error, !env.IS_PRODUCTION);
    }
  }

  async findAppModules(): Promise<ReturnResponseDto<ApplicationModules>> {
    try {
      const res = await this._applicationModulesRepository.find({
        where: {
          is_active: true,
        },
      });
      return this._returnResponse.format({
        message: `Application Modules Retrieved Successfully`,
        response: res,
        statusCode: HttpStatus.OK,
      });
    } catch (error) {
      return this._returnResponse.format(error, !env.IS_PRODUCTION);
    }
  }

  create(createVersioningDto: CreateVersioningDto) {
    return 'This action adds a new versioning';
  }

  update(id: number, updateVersioningDto: UpdateVersioningDto) {
    return `This action updates a #${id} versioning`;
  }

  delete(id: number) {
    return `This action removes a #${id} versioning`;
  }
}
