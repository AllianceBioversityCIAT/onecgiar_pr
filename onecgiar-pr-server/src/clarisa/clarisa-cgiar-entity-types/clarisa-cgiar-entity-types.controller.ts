import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ClarisaCgiarEntityTypesService } from './clarisa-cgiar-entity-types.service';
import { CreateClarisaCgiarEntityTypeDto } from './dto/create-clarisa-cgiar-entity-type.dto';
import { UpdateClarisaCgiarEntityTypeDto } from './dto/update-clarisa-cgiar-entity-type.dto';

@Controller('clarisa-cgiar-entity-types')
export class ClarisaCgiarEntityTypesController {
  constructor(private readonly clarisaCgiarEntityTypesService: ClarisaCgiarEntityTypesService) {}

  @Post()
  create(@Body() createClarisaCgiarEntityTypeDto: CreateClarisaCgiarEntityTypeDto) {
    return this.clarisaCgiarEntityTypesService.create(createClarisaCgiarEntityTypeDto);
  }

  @Get()
  findAll() {
    return this.clarisaCgiarEntityTypesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clarisaCgiarEntityTypesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateClarisaCgiarEntityTypeDto: UpdateClarisaCgiarEntityTypeDto) {
    return this.clarisaCgiarEntityTypesService.update(+id, updateClarisaCgiarEntityTypeDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.clarisaCgiarEntityTypesService.remove(+id);
  }
}
