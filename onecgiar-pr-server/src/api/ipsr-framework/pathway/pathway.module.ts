import { forwardRef, Module } from '@nestjs/common';
import { PathwayService } from './pathway.service';
import { PathwayController } from './pathway.controller';
import { VersioningModule } from '../../versioning/versioning.module';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultRepository } from '../../results/result.repository';
import { ResultInnovationPackageRepository } from '../../ipsr/result-innovation-package/repositories/result-innovation-package.repository';
import { NonPooledProjectRepository } from '../../results/non-pooled-projects/non-pooled-projects.repository';
import { EvidencesRepository } from '../../results/evidences/evidences.repository';
import { ResultByInitiativesRepository } from '../../results/results_by_inititiatives/resultByInitiatives.repository';
import { ResultsByProjectsRepository } from '../../results/results_by_projects/results_by_projects.repository';
import { ResultInitiativeBudgetRepository } from '../../results/result_budget/repositories/result_initiative_budget.repository';
import { NonPooledProjectBudgetRepository } from '../../results/result_budget/repositories/non_pooled_proyect_budget.repository';
import { ResultByIntitutionsRepository } from '../../results/results_by_institutions/result_by_intitutions.repository';
import { ResultInstitutionsBudgetRepository } from '../../results/result_budget/repositories/result_institutions_budget.repository';
import { ResultScalingStudyUrl } from '../../results-framework-reporting/result_scaling_study_urls/entities/result_scaling_study_url.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IpsrPathwayStepFourService } from './ipsr-pathway-step-four.service';

@Module({
  controllers: [PathwayController],
  providers: [
    PathwayService,
    HandlersError,
    ResultRepository,
    ResultInnovationPackageRepository,
    EvidencesRepository,
    NonPooledProjectRepository,
    ResultByInitiativesRepository,
    ResultsByProjectsRepository,
    ResultInitiativeBudgetRepository,
    NonPooledProjectBudgetRepository,
    ResultByIntitutionsRepository,
    ResultInstitutionsBudgetRepository,
    IpsrPathwayStepFourService,
  ],
  imports: [
    forwardRef(() => VersioningModule),
    TypeOrmModule.forFeature([ResultScalingStudyUrl]),
  ],
})
export class PathwayModule {}
