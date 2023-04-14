import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ResultsIpActorsService } from './results-ip-actors.service';
import { CreateResultsIpActorDto } from './dto/create-results-ip-actor.dto';
import { UpdateResultsIpActorDto } from './dto/update-results-ip-actor.dto';

@Controller('results-ip-actors')
export class ResultsIpActorsController {
  constructor(private readonly resultsIpActorsService: ResultsIpActorsService) {}

  @Post()
  create(@Body() createResultsIpActorDto: CreateResultsIpActorDto) {
    return this.resultsIpActorsService.create(createResultsIpActorDto);
  }

  @Get()
  findAll() {
    return this.resultsIpActorsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.resultsIpActorsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateResultsIpActorDto: UpdateResultsIpActorDto) {
    return this.resultsIpActorsService.update(+id, updateResultsIpActorDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.resultsIpActorsService.remove(+id);
  }
}
