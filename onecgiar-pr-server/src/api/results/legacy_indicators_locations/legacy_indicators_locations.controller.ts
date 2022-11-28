import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { LegacyIndicatorsLocationsService } from './legacy_indicators_locations.service';
import { CreateLegacyIndicatorsLocationDto } from './dto/create-legacy_indicators_location.dto';
import { UpdateLegacyIndicatorsLocationDto } from './dto/update-legacy_indicators_location.dto';

@Controller('legacy-indicators-locations')
export class LegacyIndicatorsLocationsController {
  constructor(private readonly legacyIndicatorsLocationsService: LegacyIndicatorsLocationsService) {}

  @Post()
  create(@Body() createLegacyIndicatorsLocationDto: CreateLegacyIndicatorsLocationDto) {
    return this.legacyIndicatorsLocationsService.create(createLegacyIndicatorsLocationDto);
  }

  @Get()
  findAll() {
    return this.legacyIndicatorsLocationsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.legacyIndicatorsLocationsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateLegacyIndicatorsLocationDto: UpdateLegacyIndicatorsLocationDto) {
    return this.legacyIndicatorsLocationsService.update(+id, updateLegacyIndicatorsLocationDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.legacyIndicatorsLocationsService.remove(+id);
  }
}
