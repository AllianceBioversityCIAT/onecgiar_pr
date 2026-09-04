import { Module } from '@nestjs/common';
import { ContributorsPartnersService } from './contributors-partners.service';
import { ContributorsPartnersController } from './contributors-partners.controller';
import { ResultRepository } from '../../results/result.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultByInitiativesRepository } from '../../results/results_by_inititiatives/resultByInitiatives.repository';
import { ResultByIntitutionsRepository } from '../../results/results_by_institutions/result_by_intitutions.repository';
import { ResultsByInstitutionsModule } from '../../results/results_by_institutions/results_by_institutions.module';
import { ResultsTocResultsModule } from '../../results/results-toc-results/results-toc-results.module';
import { LinkedResultRepository } from '../../results/linked-results/linked-results.repository';
import { LinkedResultsModule } from '../../results/linked-results/linked-results.module';
import { ResultsInnovationsDevRepository } from '../../results/summary/repositories/results-innovations-dev.repository';
import { ResultsInnovationsUseRepository } from '../../results/summary/repositories/results-innovations-use.repository';

import { ContributionConsistencyService } from './contribution-consistency.service';
import { ResultsCapacityDevelopmentsRepository } from '../../results/summary/repositories/results-capacity-developments.repository';
import { ResultActorRepository } from '../../results/result-actors/repositories/result-actors.repository';
import { ResultsPolicyChangesRepository } from '../../results/summary/repositories/results-policy-changes.repository';
import { ResultAnswerRepository } from '../../results/result-questions/repository/result-answers.repository';
@Module({
  controllers: [ContributorsPartnersController],
  providers: [
    ContributorsPartnersService,
    HandlersError,
    ResultRepository,
    ResultByInitiativesRepository,
    ResultByIntitutionsRepository,
    LinkedResultRepository,
    ResultsInnovationsDevRepository,
    ResultsInnovationsUseRepository,
    // P2-2932 — the Section 2 vs Section 4 consistency check and the two repositories it reads.
    ContributionConsistencyService,
    ResultsCapacityDevelopmentsRepository,
    ResultActorRepository,
    ResultsPolicyChangesRepository,
    ResultAnswerRepository,
  ],
  imports: [
    ResultsByInstitutionsModule,
    ResultsTocResultsModule,
    LinkedResultsModule,
  ],
  exports: [ContributorsPartnersService, ContributionConsistencyService],
})
export class ContributorsPartnersModule {}
