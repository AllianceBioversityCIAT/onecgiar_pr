import { Module } from '@nestjs/common';
import { InnovationUseService } from './innovation-use.service';
import { InnovationUseController } from './innovation-use.controller';
import { SummaryModule } from '../../results/summary/summary.module';
import { ResultIpMeasuresModule } from '../../ipsr/result-ip-measures/result-ip-measures.module';
import { ResultsByInstitutionTypesModule } from '../../results/results_by_institution_types/results_by_institution_types.module';
import { ResultActorsModule } from '../../results/result-actors/result-actors.module';
import { LinkedResultsModule } from '../../results/linked-results/linked-results.module';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultsModule } from '../../results/results.module';
import { ResultScalingStudyUrlsModule } from '../result_scaling_study_urls/result_scaling_study_urls.module';
import { ResultScalingStudyUrl } from '../result_scaling_study_urls/entities/result_scaling_study_url.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResultsByInititiativesModule } from '../../results/results_by_inititiatives/results_by_inititiatives.module';
import { NonPooledProjectsModule } from '../../results/non-pooled-projects/non-pooled-projects.module';
import { ResultInstitutionsBudgetRepository } from '../../results/result_budget/repositories/result_institutions_budget.repository';
import { ResultInitiativeBudgetRepository } from '../../results/result_budget/repositories/result_initiative_budget.repository';
import { NonPooledProjectBudgetRepository } from '../../results/result_budget/repositories/non_pooled_proyect_budget.repository';
import { ResultBudgetModule } from '../../results/result_budget/result_budget.module';
import { ResultsByInstitutionsModule } from '../../results/results_by_institutions/results_by_institutions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ResultScalingStudyUrl]),
    ResultsModule,
    ResultActorsModule,
    LinkedResultsModule,
    ResultsByInstitutionTypesModule,
    ResultIpMeasuresModule,
    SummaryModule,
    ResultScalingStudyUrlsModule,
    ResultsByInititiativesModule,
    ResultBudgetModule,
    NonPooledProjectsModule,
    ResultsByInstitutionsModule,
  ],
  controllers: [InnovationUseController],
  providers: [
    InnovationUseService,
    HandlersError,
    ResultInstitutionsBudgetRepository,
    ResultInitiativeBudgetRepository,
    NonPooledProjectBudgetRepository,],
})
export class InnovationUseModule {}
