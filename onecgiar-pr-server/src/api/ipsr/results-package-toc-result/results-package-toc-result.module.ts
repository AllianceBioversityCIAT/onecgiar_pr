import { Module } from '@nestjs/common';
import { ResultsPackageTocResultService } from './results-package-toc-result.service';
import { ResultsPackageTocResultController } from './results-package-toc-result.controller';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultRepository } from '../../results/result.repository';
import { VersionsService } from '../../results/versions/versions.service';
import { VersionRepository } from '../../results/versions/version.repository';
import { IpsrRepository } from '../repository/ipsr.repository';
import { ResultsCenterRepository } from '../../results/results-centers/results-centers.repository';
import { ResultByInitiativesRepository } from '../../results/results_by_inititiatives/resultByInitiatives.repository';
import { ResultsTocResultRepository } from '../../results/results-toc-results/results-toc-results.repository';
import { ShareResultRequestService } from '../../results/share-result-request/share-result-request.service';
import { ShareResultRequestRepository } from '../../results/share-result-request/share-result-request.repository';
import { NonPooledProjectRepository } from '../../results/non-pooled-projects/non-pooled-projects.repository';
import { ResultByIntitutionsRepository } from '../../results/results_by_institutions/result_by_intitutions.repository';
import { ResultByInstitutionsByDeliveriesTypeRepository } from '../../results/result-by-institutions-by-deliveries-type/result-by-institutions-by-deliveries-type.repository';

@Module({
  controllers: [ResultsPackageTocResultController],
  providers: [
    ResultsPackageTocResultService, 
    ResultRepository, 
    VersionsService,
    VersionRepository,
    IpsrRepository,
    ResultsCenterRepository,
    ResultByInitiativesRepository,
    ResultsTocResultRepository,
    ShareResultRequestService,
    ShareResultRequestRepository,
    NonPooledProjectRepository,
    ResultByIntitutionsRepository,
    ResultByInstitutionsByDeliveriesTypeRepository,
    HandlersError],
  exports: []
})
export class ResultsPackageTocResultModule {}
