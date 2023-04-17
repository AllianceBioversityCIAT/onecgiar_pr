import { Module } from '@nestjs/common';
import { ResultBudgetService } from './result_budget.service';
import { ResultBudgetController } from './result_budget.controller';

@Module({
  controllers: [ResultBudgetController],
  providers: [ResultBudgetService]
})
export class ResultBudgetModule {}
