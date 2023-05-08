import { PartialType } from '@nestjs/mapped-types';
import { CreateResultBudgetDto } from './create-result_budget.dto';

export class UpdateResultBudgetDto extends PartialType(CreateResultBudgetDto) {}
