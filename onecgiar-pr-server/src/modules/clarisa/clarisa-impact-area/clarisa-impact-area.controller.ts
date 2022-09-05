import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ClarisaImpactAreaService } from './clarisa-impact-area.service';
import { CreateClarisaImpactAreaDto } from './dto/create-clarisa-impact-area.dto';
import { UpdateClarisaImpactAreaDto } from './dto/update-clarisa-impact-area.dto';

@Controller('clarisa-impact-area')
export class ClarisaImpactAreaController {
  constructor(private readonly clarisaImpactAreaService: ClarisaImpactAreaService) {}

  @Post()
  create(@Body() createClarisaImpactAreaDto: CreateClarisaImpactAreaDto) {
    return this.clarisaImpactAreaService.create(createClarisaImpactAreaDto);
  }

  @Get()
  findAll() {
    return this.clarisaImpactAreaService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clarisaImpactAreaService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateClarisaImpactAreaDto: UpdateClarisaImpactAreaDto) {
    return this.clarisaImpactAreaService.update(+id, updateClarisaImpactAreaDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.clarisaImpactAreaService.remove(+id);
  }
}
