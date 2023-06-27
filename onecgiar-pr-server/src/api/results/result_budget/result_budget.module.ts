import { Module } from '@nestjs/common';
import { ResultBudgetService } from './result_budget.service';
import { ResultBudgetController } from './result_budget.controller';
import { ReturnResponse } from '../../../shared/handlers/error.utils';

@Module({
  controllers: [ResultBudgetController],
  providers: [ResultBudgetService, ReturnResponse],
})
export class ResultBudgetModule {}
