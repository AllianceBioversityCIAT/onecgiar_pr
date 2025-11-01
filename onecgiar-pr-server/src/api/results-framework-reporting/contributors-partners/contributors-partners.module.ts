import { Module } from '@nestjs/common';
import { ContributorsPartnersService } from './contributors-partners.service';
import { ContributorsPartnersController } from './contributors-partners.controller';
import { ResultRepository } from '../../results/result.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultByInitiativesRepository } from '../../results/results_by_inititiatives/resultByInitiatives.repository';
import { ResultsCenterRepository } from '../../results/results-centers/results-centers.repository';
import { ResultByIntitutionsRepository } from '../../results/results_by_institutions/result_by_intitutions.repository';
import { ResultsByProjectsRepository } from '../../results/results_by_projects/results_by_projects.repository';
import { ResultsByInstitutionsModule } from '../../results/results_by_institutions/results_by_institutions.module';
import { ResultsTocResultsModule } from '../../results/results-toc-results/results-toc-results.module';
import { LinkedResultRepository } from '../../results/linked-results/linked-results.repository';
import { ResultsInnovationsDevRepository } from '../../results/summary/repositories/results-innovations-dev.repository';
import { ResultsInnovationsUseRepository } from '../../results/summary/repositories/results-innovations-use.repository';

@Module({
  controllers: [ContributorsPartnersController],
  providers: [
    ContributorsPartnersService,
    HandlersError,
    ResultRepository,
    ResultByInitiativesRepository,
    ResultByIntitutionsRepository,
    ResultsCenterRepository,
    ResultsByProjectsRepository,
    LinkedResultRepository,
    ResultsInnovationsDevRepository,
    ResultsInnovationsUseRepository,
  ],
  imports: [ResultsByInstitutionsModule, ResultsTocResultsModule],
})
export class ContributorsPartnersModule {}
