import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ClarisaCountriesRegionsService } from './clarisa-countries-regions.service';
import { CreateClarisaCountriesRegionDto } from './dto/create-clarisa-countries-region.dto';
import { UpdateClarisaCountriesRegionDto } from './dto/update-clarisa-countries-region.dto';

@Controller('clarisa-countries-regions')
export class ClarisaCountriesRegionsController {
  constructor(private readonly clarisaCountriesRegionsService: ClarisaCountriesRegionsService) {}

  @Post()
  create(@Body() createClarisaCountriesRegionDto: CreateClarisaCountriesRegionDto) {
    return this.clarisaCountriesRegionsService.create(createClarisaCountriesRegionDto);
  }

  @Get()
  findAll() {
    return this.clarisaCountriesRegionsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clarisaCountriesRegionsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateClarisaCountriesRegionDto: UpdateClarisaCountriesRegionDto) {
    return this.clarisaCountriesRegionsService.update(+id, updateClarisaCountriesRegionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.clarisaCountriesRegionsService.remove(+id);
  }
}
