import { Module } from '@nestjs/common';
import { IpsrContributorsPartnersService } from './ipsr_contributors-partners.service';
import { IpsrContributorsPartnersController } from './ipsr_contributors-partners.controller';
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

@Module({
  controllers: [IpsrContributorsPartnersController],
  providers: [
    IpsrContributorsPartnersService,
    HandlersError,
    ResultRepository,
    ResultByInitiativesRepository,
    ResultByIntitutionsRepository,
    LinkedResultRepository,
    ResultsInnovationsDevRepository,
    ResultsInnovationsUseRepository,
  ],
  imports: [
    ResultsByInstitutionsModule,
    ResultsTocResultsModule,
    LinkedResultsModule,
  ],
})
export class IpsrContributorsPartnersModule {}
