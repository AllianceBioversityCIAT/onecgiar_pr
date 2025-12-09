import { Module } from '@nestjs/common';
import { InnovationDevService } from './innovation_dev.service';
import { InnovationDevController } from './innovation_dev.controller';
import { ResultRepository } from '../../results/result.repository';
import { EvidencesRepository } from '../../results/evidences/evidences.repository';
import { ResultActorRepository } from '../../results/result-actors/repositories/result-actors.repository';
import { ResultByIntitutionsTypeRepository } from '../../results/results_by_institution_types/result_by_intitutions_type.repository';
import { ResultIpMeasureRepository } from '../../ipsr/result-ip-measures/result-ip-measures.repository';
import { ResultInitiativeBudgetRepository } from '../../results/result_budget/repositories/result_initiative_budget.repository';
import { NonPooledProjectBudgetRepository } from '../../results/result_budget/repositories/non_pooled_proyect_budget.repository';
import { ResultInstitutionsBudgetRepository } from '../../results/result_budget/repositories/result_institutions_budget.repository';
import { ResultByInitiativesRepository } from '../../results/results_by_inititiatives/resultByInitiatives.repository';
import { NonPooledProjectRepository } from '../../results/non-pooled-projects/non-pooled-projects.repository';
import { InnoDevService } from '../../results/summary/innovation_dev.service';
import { ResultsPolicyChangesRepository } from '../../results/summary/repositories/results-policy-changes.repository';
import { ResultByIntitutionsRepository } from '../../results/results_by_institutions/result_by_intitutions.repository';
import { ResultsInnovationsDevRepository } from '../../results/summary/repositories/results-innovations-dev.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultAnswerRepository } from '../../results/result-questions/repository/result-answers.repository';
import { ResultScalingStudyUrlsModule } from '../result_scaling_study_urls/result_scaling_study_urls.module';
import { ResultScalingStudyUrl } from '../result_scaling_study_urls/entities/result_scaling_study_url.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EvidencesModule } from '../../results/evidences/evidences.module';
import { SharePointModule } from '../../../shared/services/share-point/share-point.module';
import { EvidencesService } from '../../results/evidences/evidences.service';
import { VersioningModule } from '../../versioning/versioning.module';
import { ResultsByProjectsRepository } from '../../results/results_by_projects/results_by_projects.repository';
import { InnovationUseService } from '../innovation-use/innovation-use.service';
import { LinkedResultsModule } from '../../results/linked-results/linked-results.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ResultScalingStudyUrl]),
    ResultScalingStudyUrlsModule,
    EvidencesModule,
    SharePointModule,
    VersioningModule,
    LinkedResultsModule,
  ],
  controllers: [InnovationDevController],
  providers: [
    HandlersError,
    InnovationDevService,
    ResultRepository,
    EvidencesRepository,
    ResultAnswerRepository,
    ResultActorRepository,
    ResultByIntitutionsTypeRepository,
    ResultIpMeasureRepository,
    ResultInitiativeBudgetRepository,
    NonPooledProjectBudgetRepository,
    ResultInstitutionsBudgetRepository,
    ResultsInnovationsDevRepository,
    ResultByIntitutionsRepository,
    ResultByInitiativesRepository,
    NonPooledProjectRepository,
    InnoDevService,
    ResultsPolicyChangesRepository,
    EvidencesService,
    ResultsByProjectsRepository,
    InnovationUseService,
  ],
})
export class InnovationDevModule {}
