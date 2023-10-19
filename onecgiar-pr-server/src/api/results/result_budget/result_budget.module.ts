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

@Module({
  controllers: [ResultBudgetController],
  providers: [
    ResultBudgetService,
    ReturnResponse,
    ResultInstitutionsBudgetRepository,
    ResultInitiativeBudgetRepository,
    NonPooledProjectBudgetRepository,
    HandlersError,
  ],
})
export class ResultBudgetModule {}
