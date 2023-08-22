import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ResultsInvestmentDiscontinuedOptionsService } from './results-investment-discontinued-options.service';
import { CreateResultsInvestmentDiscontinuedOptionDto } from './dto/create-results-investment-discontinued-option.dto';
import { UpdateResultsInvestmentDiscontinuedOptionDto } from './dto/update-results-investment-discontinued-option.dto';

@Controller()
export class ResultsInvestmentDiscontinuedOptionsController {
  constructor(
    private readonly resultsInvestmentDiscontinuedOptionsService: ResultsInvestmentDiscontinuedOptionsService,
  ) {}

  @Post()
  create(
    @Body()
    createResultsInvestmentDiscontinuedOptionDto: CreateResultsInvestmentDiscontinuedOptionDto,
  ) {
    return this.resultsInvestmentDiscontinuedOptionsService.create(
      createResultsInvestmentDiscontinuedOptionDto,
    );
  }

  @Get()
  findAll() {
    return this.resultsInvestmentDiscontinuedOptionsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.resultsInvestmentDiscontinuedOptionsService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    updateResultsInvestmentDiscontinuedOptionDto: UpdateResultsInvestmentDiscontinuedOptionDto,
  ) {
    return this.resultsInvestmentDiscontinuedOptionsService.update(
      +id,
      updateResultsInvestmentDiscontinuedOptionDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.resultsInvestmentDiscontinuedOptionsService.remove(+id);
  }
}
