import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PrmsTablesTypesService } from './prms-tables-types.service';
import { CreatePrmsTablesTypeDto } from './dto/create-prms-tables-type.dto';
import { UpdatePrmsTablesTypeDto } from './dto/update-prms-tables-type.dto';

@Controller('prms-tables-types')
export class PrmsTablesTypesController {
  constructor(private readonly prmsTablesTypesService: PrmsTablesTypesService) {}

  @Post()
  create(@Body() createPrmsTablesTypeDto: CreatePrmsTablesTypeDto) {
    return this.prmsTablesTypesService.create(createPrmsTablesTypeDto);
  }

  @Get()
  findAll() {
    return this.prmsTablesTypesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.prmsTablesTypesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePrmsTablesTypeDto: UpdatePrmsTablesTypeDto) {
    return this.prmsTablesTypesService.update(+id, updatePrmsTablesTypeDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.prmsTablesTypesService.remove(+id);
  }
}
