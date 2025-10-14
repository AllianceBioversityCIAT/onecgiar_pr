import { Module } from '@nestjs/common';
import { ContributorsPartnersService } from './contributors-partners.service';
import { ContributorsPartnersController } from './contributors-partners.controller';
import { ResultRepository } from '../../results/result.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultByInitiativesRepository } from '../../results/results_by_inititiatives/resultByInitiatives.repository';
import { ResultsCenterRepository } from '../../results/results-centers/results-centers.repository';
import { ResultByIntitutionsRepository } from '../../results/results_by_institutions/result_by_intitutions.repository';
import { ResultsByProjectsRepository } from '../../results/results_by_projects/results_by_projects.repository';

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
  ],
  imports: [],
})
export class ContributorsPartnersModule {}
