import { Module } from '@nestjs/common';
import { SummaryService } from './summary.service';
import { SummaryController } from './summary.controller';
import { ResultsInnovationsUseRepository } from './repositories/results-innovations-use.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultsInnovationsUseMeasuresRepository } from './repositories/results-innovations-use-measures.repository';
import { VersionsService } from '../versions/versions.service';
import { VersionRepository } from '../versions/version.repository';
import { ResultsCapacityDevelopmentsRepository } from './repositories/results-capacity-developments.repository';
import { ResultByIntitutionsRepository } from '../results_by_institutions/result_by_intitutions.repository';

@Module({
  controllers: [SummaryController],
  providers: [
    SummaryService, 
    ResultsInnovationsUseRepository, 
    HandlersError,
    ResultsInnovationsUseMeasuresRepository,
    ResultsInnovationsUseMeasuresRepository,
    ResultsCapacityDevelopmentsRepository,
    ResultByIntitutionsRepository,
    VersionsService,
    VersionRepository
  ],
  exports: [
    ResultsInnovationsUseRepository
  ]
})
export class SummaryModule {}
