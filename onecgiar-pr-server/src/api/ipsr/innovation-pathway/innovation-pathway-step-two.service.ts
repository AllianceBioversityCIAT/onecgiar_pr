import { HttpStatus, Injectable, Type } from '@nestjs/common';
import { ResultRepository } from '../../results/result.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultRegionRepository } from '../../results/result-regions/result-regions.repository';
import { ResultCountryRepository } from '../../results/result-countries/result-countries.repository';
import { ExpertisesRepository } from '../innovation-packaging-experts/repositories/expertises.repository';
import { InnovationPackagingExpertRepository } from '../innovation-packaging-experts/repositories/innovation-packaging-expert.repository';
import { ResultInnovationPackageRepository } from '../result-innovation-package/repositories/result-innovation-package.repository';
import { VersionsService } from '../../results/versions/versions.service';
import { IpsrRepository } from '../ipsr.repository';
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

    async findInnovationsAndComplementary(){
      try {
        const results = await this._resultRepository.find({
          where:{
            result_type_id: In([7, 11]),
            is_active: true
          },
          order: {
            result_code: 'DESC'
          }
        });

        return {
          response: results,
          message: 'Successful response',
          status: HttpStatus.OK,
        }
      } catch (error) {
        return this._handlersError.returnErrorRes({ error, debug: true });
      }
    }

    async getStepTwoOne(resultId: number){
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
}
