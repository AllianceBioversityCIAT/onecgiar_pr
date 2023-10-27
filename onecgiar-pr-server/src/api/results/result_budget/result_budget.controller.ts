import { Controller } from '@nestjs/common';
import { ResultBudgetService } from './result_budget.service';

@Controller('result-budget')
export class ResultBudgetController {
  constructor(private readonly resultBudgetService: ResultBudgetService) {}
}
