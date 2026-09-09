import { Module } from '@nestjs/common';
import { ResultBudgetService } from './result_budget.service';
import { ResultBudgetController } from './result_budget.controller';
import {
  HandlersError,
  ReturnResponse,
} from '../../../shared/handlers/error.utils';
import { ResultInstitutionsBudgetRepository } from './repositories/result_institutions_budget.repository';
import { ResultInitiativeBudgetRepository } from './repositories/result_initiative_budget.repository';
import { NonPooledProjectBudgetRepository } from './repositories/non_pooled_proyect_budget.repository';
import { ResultInvestmentService } from './result-investment.service';
import { ResultByInitiativesRepository } from '../results_by_inititiatives/resultByInitiatives.repository';
import { ResultByIntitutionsRepository } from '../results_by_institutions/result_by_intitutions.repository';
import { ResultsByProjectsRepository } from '../results_by_projects/results_by_projects.repository';

@Module({
  controllers: [ResultBudgetController],
  providers: [
    ResultBudgetService,
    ReturnResponse,
    ResultInstitutionsBudgetRepository,
    ResultInitiativeBudgetRepository,
    NonPooledProjectBudgetRepository,
    HandlersError,
    // P2-3390: the shared investment writer/reader plus the three link repositories it needs.
    // The module stays a leaf — these are repositories, not other modules' services — so both
    // SummaryModule (bilateral) and InnovationUseModule can import it without a cycle.
    ResultInvestmentService,
    ResultByInitiativesRepository,
    ResultByIntitutionsRepository,
    ResultsByProjectsRepository,
  ],
  exports: [ResultInvestmentService],
})
export class ResultBudgetModule {}
