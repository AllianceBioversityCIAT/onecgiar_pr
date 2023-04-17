import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ResultBudgetService } from './result_budget.service';
import { CreateResultBudgetDto } from './dto/create-result_budget.dto';
import { UpdateResultBudgetDto } from './dto/update-result_budget.dto';

@Controller('result-budget')
export class ResultBudgetController {
  constructor(private readonly resultBudgetService: ResultBudgetService) {}

  @Post()
  create(@Body() createResultBudgetDto: CreateResultBudgetDto) {
    return this.resultBudgetService.create(createResultBudgetDto);
  }

  @Get()
  findAll() {
    return this.resultBudgetService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.resultBudgetService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateResultBudgetDto: UpdateResultBudgetDto) {
    return this.resultBudgetService.update(+id, updateResultBudgetDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.resultBudgetService.remove(+id);
  }
}
