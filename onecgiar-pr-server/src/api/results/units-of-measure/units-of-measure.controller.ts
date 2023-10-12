import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { UnitsOfMeasureService } from './units-of-measure.service';
import { CreateUnitsOfMeasureDto } from './dto/create-units-of-measure.dto';
import { UpdateUnitsOfMeasureDto } from './dto/update-units-of-measure.dto';

@Controller('units-of-measure')
export class UnitsOfMeasureController {
  constructor(private readonly unitsOfMeasureService: UnitsOfMeasureService) {}

  @Post()
  create(@Body() createUnitsOfMeasureDto: CreateUnitsOfMeasureDto) {
    return this.unitsOfMeasureService.create(createUnitsOfMeasureDto);
  }

  @Get()
  findAll() {
    return this.unitsOfMeasureService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.unitsOfMeasureService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateUnitsOfMeasureDto: UpdateUnitsOfMeasureDto,
  ) {
    return this.unitsOfMeasureService.update(+id, updateUnitsOfMeasureDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.unitsOfMeasureService.remove(+id);
  }
}
