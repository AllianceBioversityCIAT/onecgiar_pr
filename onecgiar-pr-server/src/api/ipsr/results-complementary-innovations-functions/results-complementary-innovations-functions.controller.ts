import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ResultsComplementaryInnovationsFunctionsService } from './results-complementary-innovations-functions.service';
import { CreateResultsComplementaryInnovationsFunctionDto } from './dto/create-results-complementary-innovations-function.dto';
import { UpdateResultsComplementaryInnovationsFunctionDto } from './dto/update-results-complementary-innovations-function.dto';

@Controller('results-complementary-innovations-functions')
export class ResultsComplementaryInnovationsFunctionsController {
  constructor(
    private readonly resultsComplementaryInnovationsFunctionsService: ResultsComplementaryInnovationsFunctionsService,
  ) {}

  @Post()
  create(
    @Body()
    createResultsComplementaryInnovationsFunctionDto: CreateResultsComplementaryInnovationsFunctionDto,
  ) {
    return this.resultsComplementaryInnovationsFunctionsService.create(
      createResultsComplementaryInnovationsFunctionDto,
    );
  }

  @Get()
  findAll() {
    return this.resultsComplementaryInnovationsFunctionsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.resultsComplementaryInnovationsFunctionsService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    updateResultsComplementaryInnovationsFunctionDto: UpdateResultsComplementaryInnovationsFunctionDto,
  ) {
    return this.resultsComplementaryInnovationsFunctionsService.update(
      +id,
      updateResultsComplementaryInnovationsFunctionDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.resultsComplementaryInnovationsFunctionsService.remove(+id);
  }
}
