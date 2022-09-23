import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ClarisaOutcomeIndicatorsService } from './clarisa-outcome-indicators.service';
import { CreateClarisaOutcomeIndicatorDto } from './dto/create-clarisa-outcome-indicator.dto';
import { UpdateClarisaOutcomeIndicatorDto } from './dto/update-clarisa-outcome-indicator.dto';

@Controller('clarisa-outcome-indicators')
export class ClarisaOutcomeIndicatorsController {
  constructor(private readonly clarisaOutcomeIndicatorsService: ClarisaOutcomeIndicatorsService) {}

  @Post()
  create(@Body() createClarisaOutcomeIndicatorDto: CreateClarisaOutcomeIndicatorDto) {
    return this.clarisaOutcomeIndicatorsService.create(createClarisaOutcomeIndicatorDto);
  }

  @Get()
  findAll() {
    return this.clarisaOutcomeIndicatorsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clarisaOutcomeIndicatorsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateClarisaOutcomeIndicatorDto: UpdateClarisaOutcomeIndicatorDto) {
    return this.clarisaOutcomeIndicatorsService.update(+id, updateClarisaOutcomeIndicatorDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.clarisaOutcomeIndicatorsService.remove(+id);
  }
}
