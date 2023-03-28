import { HttpStatus, Injectable, Type } from '@nestjs/common';
import { ResultRepository } from '../../results/result.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultRegionRepository } from '../../results/result-regions/result-regions.repository';
import { ResultCountryRepository } from '../../results/result-countries/result-countries.repository';
import { ExpertisesRepository } from '../innovation-packaging-experts/repositories/expertises.repository';
import { InnovationPackagingExpertRepository } from '../innovation-packaging-experts/repositories/innovation-packaging-expert.repository';
import { ResultInnovationPackageRepository } from '../result-innovation-package/repositories/result-innovation-package.repository';
import { VersionsService } from '../../results/versions/versions.service';
import { getInnovationComInterface, IpsrRepository } from '../ipsr.repository';
import { ResultByIntitutionsRepository } from '../../results/results_by_institutions/result_by_intitutions.repository';
import { ResultByInstitutionsByDeliveriesTypeRepository } from '../../results/result-by-institutions-by-deliveries-type/result-by-institutions-by-deliveries-type.repository';
import { ResultIpSdgTargetRepository } from './repository/result-ip-sdg-targets.repository';
import { ResultIpEoiOutcomeRepository } from './repository/result-ip-eoi-outcomes.repository';
import { ResultIpAAOutcomeRepository } from './repository/result-ip-action-area-outcome.repository';
import { ResultActorRepository } from '../../results/result-actors/repositories/result-actors.repository';
import { ResultByIntitutionsTypeRepository } from '../../results/results_by_institution_types/result_by_intitutions_type.repository';
import { ResultIpMeasureRepository } from '../result-ip-measures/result-ip-measures.repository';
import { ResultIpImpactAreaRepository } from './repository/result-ip-impact-area-targets.repository';
import { In } from 'typeorm';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { Ipsr } from '../entities/ipsr.entity';
import { Version } from '../../results/versions/entities/version.entity';

@Injectable()
export class InnovationPathwayStepTwoService {
  constructor(
    protected readonly _versionsService: VersionsService,
    protected readonly _handlersError: HandlersError,
    protected readonly _resultRepository: ResultRepository,
    protected readonly _resultRegionRepository: ResultRegionRepository,
    protected readonly _resultCountryRepository: ResultCountryRepository,
    protected readonly _innovationPackagingExpertRepository: InnovationPackagingExpertRepository,
    protected readonly _expertisesRepository: ExpertisesRepository,
    protected readonly _resultInnovationPackageRepository: ResultInnovationPackageRepository,
    protected readonly _innovationByResultRepository: IpsrRepository,
    protected readonly _resultByIntitutionsRepository: ResultByIntitutionsRepository,
    protected readonly _resultByInstitutionsByDeliveriesTypeRepository: ResultByInstitutionsByDeliveriesTypeRepository,
    protected readonly _resultIpEoiOutcomes: ResultIpEoiOutcomeRepository,
    protected readonly _resultIpAAOutcomes: ResultIpAAOutcomeRepository,
    protected readonly _resultIpSdgsTargetsRepository: ResultIpSdgTargetRepository,
    protected readonly _resultActorRepository: ResultActorRepository,
    protected readonly _resultByIntitutionsTypeRepository: ResultByIntitutionsTypeRepository,
    protected readonly _resultIpMeasureRepository: ResultIpMeasureRepository,
    protected readonly _resultIpImpactAreas: ResultIpImpactAreaRepository,
  ) { }

  async findInnovationsAndComplementary() {
    try {
      const results = await this._resultRepository.getResultByTypes([7, 11]);
      return {
        response: results,
        message: 'Successful response',
        status: HttpStatus.OK,
      }
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async getStepTwoOne(resultId: number) {
    try {
      const result = await this._resultRepository.findOne({
        where: {
          id: resultId,
          is_active: true
        }
      });
      if (!result) {
        throw {
          response: result,
          message: 'The result was not found',
          status: HttpStatus.NOT_FOUND,
        };
      }
      const comInnovation = await this._innovationByResultRepository.getStepTwoOne(result.id);

      return {
        response: comInnovation,
        message: 'Successful response',
        status: HttpStatus.OK,
      }

    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }


  async saveSetepTowOne(resultId: number, user: TokenDto, saveData: getInnovationComInterface[]) {
    try {
      const result = await this._resultRepository.findOne({
        where: {
          id: resultId,
          is_active: true
        }
      });

      if (!result) {
        throw {
          response: result,
          message: 'The result was not found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      const vTemp = await this._versionsService.findBaseVersion();
      if (vTemp.status >= 300) {
        throw this._handlersError.returnErrorRes({ error: vTemp });
      }
      const version: Version = <Version>vTemp.response;

      if (saveData?.length) {
        for (const rbip of saveData) {
          let exists: Ipsr = null;
          if (rbip?.result_by_innovation_package_id) {
            exists = await this._innovationByResultRepository.findOne({
              where: {
                result_by_innovation_package_id: rbip.result_by_innovation_package_id,
                ipsr_role_id: 2
              }
            });
          } else {
            exists = await this._innovationByResultRepository.findOne({
              where: {
                result_id: rbip.result_id,
                ipsr_role_id: 2
              }
            });
          }

          if (exists) {
            await this._innovationByResultRepository.update(
              exists.result_by_innovation_package_id,
              {
                is_active: rbip.is_active,
                last_updated_by: user.id
              }
            );
          } else {
            await this._innovationByResultRepository.save({
              version_id: version.id,
              last_updated_by: user.id,
              created_by: user.id,
              result_id: rbip.result_id,
              result_innovation_package_id: result.id,
              ipsr_role_id: 2
            });
          }
        }
      }
    } catch (error) {

    }
  }
}
