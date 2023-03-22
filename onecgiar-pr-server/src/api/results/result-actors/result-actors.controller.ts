import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ResultActorsService } from './result-actors.service';
import { CreateResultActorDto } from './dto/create-result-actor.dto';
import { UpdateResultActorDto } from './dto/update-result-actor.dto';

@Controller('result-actors')
export class ResultActorsController {
  constructor(private readonly resultActorsService: ResultActorsService) {}

  @Post()
  create(@Body() createResultActorDto: CreateResultActorDto) {
    return this.resultActorsService.create(createResultActorDto);
  }

  @Get()
  findAll() {
    return this.resultActorsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.resultActorsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateResultActorDto: UpdateResultActorDto) {
    return this.resultActorsService.update(+id, updateResultActorDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.resultActorsService.remove(+id);
  }
}
