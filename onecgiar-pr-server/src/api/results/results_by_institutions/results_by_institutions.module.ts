import { Module } from '@nestjs/common';
import { ResultsByInstitutionsService } from './results_by_institutions.service';
import { ResultsByInstitutionsController } from './results_by_institutions.controller';
import { ResultByIntitutionsRepository } from './result_by_intitutions.repository';
import {
  HandlersError,
  ReturnResponse,
} from '../../../shared/handlers/error.utils';
import { ResultRepository } from '../result.repository';
import { VersionsService } from '../versions/versions.service';
import { VersionRepository } from '../../versioning/versioning.repository';
import { ResultByInstitutionsByDeliveriesTypeRepository } from '../result-by-institutions-by-deliveries-type/result-by-institutions-by-deliveries-type.repository';
import { UserRepository } from '../../../auth/modules/user/repositories/user.repository';
import { ResultsKnowledgeProductsRepository } from '../results-knowledge-products/repositories/results-knowledge-products.repository';
import { ResultsKnowledgeProductInstitutionRepository } from '../results-knowledge-products/repositories/results-knowledge-product-institution.repository';
import { ResultInstitutionsBudgetRepository } from '../result_budget/repositories/result_institutions_budget.repository';
import { GlobalParameterRepository } from '../../global-parameter/repositories/global-parameter.repository';
import { NonPooledProjectRepository } from '../non-pooled-projects/non-pooled-projects.repository';
import { ResultsCenterRepository } from '../results-centers/results-centers.repository';
import { NonPooledProjectBudgetRepository } from '../result_budget/repositories/non_pooled_proyect_budget.repository';
import { ResultsByProjectsModule } from '../results_by_projects/results_by_projects.module';

@Module({
  controllers: [ResultsByInstitutionsController],
  providers: [
    ResultsByInstitutionsService,
    ResultByIntitutionsRepository,
    ResultRepository,
    VersionsService,
    VersionRepository,
    HandlersError,
    ResultByInstitutionsByDeliveriesTypeRepository,
    UserRepository,
    ResultsKnowledgeProductsRepository,
    ResultsKnowledgeProductInstitutionRepository,
    ReturnResponse,
    ResultInstitutionsBudgetRepository,
    GlobalParameterRepository,
    NonPooledProjectRepository,
    ResultsCenterRepository,
    NonPooledProjectBudgetRepository,
  ],
  imports: [ResultsByProjectsModule],
  exports: [ResultsByInstitutionsService, ResultByIntitutionsRepository],
})
export class ResultsByInstitutionsModule {}
