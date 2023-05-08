import { Injectable } from '@nestjs/common';
import { CreateResultBudgetDto } from './dto/create-result_budget.dto';
import { UpdateResultBudgetDto } from './dto/update-result_budget.dto';

@Injectable()
export class ResultBudgetService {
  create(createResultBudgetDto: CreateResultBudgetDto) {
    return 'This action adds a new resultBudget';
  }

  findAll() {
    return `This action returns all resultBudget`;
  }

  findOne(id: number) {
    return `This action returns a #${id} resultBudget`;
  }

  update(id: number, updateResultBudgetDto: UpdateResultBudgetDto) {
    return `This action updates a #${id} resultBudget`;
  }

  remove(id: number) {
    return `This action removes a #${id} resultBudget`;
  }
}
