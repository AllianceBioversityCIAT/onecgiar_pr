import { Module } from '@nestjs/common';
import { SummaryService } from './summary.service';
import { SummaryController } from './summary.controller';
import { ResultsInnovationsUseRepository } from './repositories/results-innovations-use.repository';
import {
  HandlersError,
  ReturnResponse,
} from '../../../shared/handlers/error.utils';
import { ResultsInnovationsUseMeasuresRepository } from './repositories/results-innovations-use-measures.repository';
import { VersionsService } from '../versions/versions.service';
import { VersionRepository } from '../../versioning/versioning.repository';
import { ResultsCapacityDevelopmentsRepository } from './repositories/results-capacity-developments.repository';
import { ResultByIntitutionsRepository } from '../results_by_institutions/result_by_intitutions.repository';
import { ResultsInnovationsDevRepository } from './repositories/results-innovations-dev.repository';
import { ResultRepository } from '../result.repository';
import { ResultsPolicyChangesRepository } from './repositories/results-policy-changes.repository';
import { ResultAnswerRepository } from '../result-questions/repository/result-answers.repository';
import { EvidencesRepository } from '../evidences/evidences.repository';
import { ResultActorRepository } from '../result-actors/repositories/result-actors.repository';
import { ResultByIntitutionsTypeRepository } from '../results_by_institution_types/result_by_intitutions_type.repository';
import { ResultIpMeasureRepository } from '../../ipsr/result-ip-measures/result-ip-measures.repository';
import { NonPooledProjectRepository } from '../non-pooled-projects/non-pooled-projects.repository';
import { NonPooledProjectBudgetRepository } from '../result_budget/repositories/non_pooled_proyect_budget.repository';
import { ResultInitiativeBudgetRepository } from '../result_budget/repositories/result_initiative_budget.repository';
import { ResultInstitutionsBudgetRepository } from '../result_budget/repositories/result_institutions_budget.repository';
import { ResultByInitiativesRepository } from '../results_by_inititiatives/resultByInitiatives.repository';
import { InnoDevService } from './innovation_dev.service';

@Module({
  controllers: [SummaryController],
  providers: [
    SummaryService,
    InnoDevService,
    ResultsInnovationsUseRepository,
    HandlersError,
    ResultsInnovationsUseMeasuresRepository,
    ResultsInnovationsUseMeasuresRepository,
    ResultsCapacityDevelopmentsRepository,
    ResultByIntitutionsRepository,
    ResultsInnovationsDevRepository,
    ResultsPolicyChangesRepository,
    ResultAnswerRepository,
    EvidencesRepository,
    ResultRepository,
    VersionsService,
    VersionRepository,
    ReturnResponse,
    ResultActorRepository,
    ResultByIntitutionsTypeRepository,
    ResultIpMeasureRepository,
    ResultInitiativeBudgetRepository,
    ResultByInitiativesRepository,
    NonPooledProjectBudgetRepository,
    NonPooledProjectRepository,
    ResultInstitutionsBudgetRepository,
  ],
  exports: [ResultsInnovationsUseRepository, SummaryService],
})
export class SummaryModule {}
