import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { InititiativesService } from './inititiatives.service';
import { CreateInititiativeDto } from './dto/create-inititiative.dto';
import { UpdateInititiativeDto } from './dto/update-inititiative.dto';

@Controller('inititiatives')
export class InititiativesController {
  constructor(private readonly inititiativesService: InititiativesService) {}

  @Post()
  create(@Body() createInititiativeDto: CreateInititiativeDto) {
    return this.inititiativesService.create(createInititiativeDto);
  }

  @Get()
  findAll() {
    return this.inititiativesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.inititiativesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateInititiativeDto: UpdateInititiativeDto) {
    return this.inititiativesService.update(+id, updateInititiativeDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.inititiativesService.remove(+id);
  }
}
