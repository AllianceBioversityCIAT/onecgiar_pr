import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ResultsImpactAreaTargetService } from './results-impact-area-target.service';
import { CreateResultsImpactAreaTargetDto } from './dto/create-results-impact-area-target.dto';
import { UpdateResultsImpactAreaTargetDto } from './dto/update-results-impact-area-target.dto';

@Controller()
export class ResultsImpactAreaTargetController {
  constructor(
    private readonly resultsImpactAreaTargetService: ResultsImpactAreaTargetService,
  ) {}

  @Post()
  create(
    @Body() createResultsImpactAreaTargetDto: CreateResultsImpactAreaTargetDto,
  ) {
    return this.resultsImpactAreaTargetService.create(
      createResultsImpactAreaTargetDto,
    );
  }

  @Get()
  findAll() {
    return this.resultsImpactAreaTargetService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.resultsImpactAreaTargetService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateResultsImpactAreaTargetDto: UpdateResultsImpactAreaTargetDto,
  ) {
    return this.resultsImpactAreaTargetService.update(
      +id,
      updateResultsImpactAreaTargetDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.resultsImpactAreaTargetService.remove(+id);
  }
}
