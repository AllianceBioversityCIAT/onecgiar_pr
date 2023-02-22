import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PrimaryImpactAreaService } from './primary-impact-area.service';
import { CreatePrimaryImpactAreaDto } from './dto/create-primary-impact-area.dto';
import { UpdatePrimaryImpactAreaDto } from './dto/update-primary-impact-area.dto';

@Controller('primary-impact-area')
export class PrimaryImpactAreaController {
  constructor(private readonly primaryImpactAreaService: PrimaryImpactAreaService) {}

  @Post()
  create(@Body() createPrimaryImpactAreaDto: CreatePrimaryImpactAreaDto) {
    return this.primaryImpactAreaService.create(createPrimaryImpactAreaDto);
  }

  @Get()
  findAll() {
    return this.primaryImpactAreaService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.primaryImpactAreaService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePrimaryImpactAreaDto: UpdatePrimaryImpactAreaDto) {
    return this.primaryImpactAreaService.update(+id, updatePrimaryImpactAreaDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.primaryImpactAreaService.remove(+id);
  }
}
