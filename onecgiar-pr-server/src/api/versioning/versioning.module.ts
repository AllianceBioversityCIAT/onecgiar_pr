import { Module } from '@nestjs/common';
import { VersioningService } from './versioning.service';
import { VersioningController } from './versioning.controller';
import { VersionRepository } from './versioning.repository';
import {
  HandlersError,
  ReturnResponse,
} from '../../shared/handlers/error.utils';
import { ResponseInterceptor } from '../../shared/Interceptors/Return-data.interceptor';
import { ApplicationModulesRepository } from './repositories/application-modules.repository';
import { ResultRepository } from '../results/result.repository';
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

@Module({
  controllers: [VersioningController],
  providers: [
    VersioningService,
    VersionRepository,
    HandlersError,
    ResponseInterceptor,
    ApplicationModulesRepository,
    ResultRepository,
    ReturnResponse,
    NonPooledProjectRepository,
    ResultsCenterRepository,
    ResultsTocResultRepository,
    ResultByInitiativesRepository,
    ResultByIntitutionsRepository,
    ResultByInstitutionsByDeliveriesTypeRepository,
    ResultByIntitutionsTypeRepository,
    ResultCountryRepository,
    ResultRegionRepository,
    LinkedResultRepository,
  ],
})
export class VersioningModule {}
