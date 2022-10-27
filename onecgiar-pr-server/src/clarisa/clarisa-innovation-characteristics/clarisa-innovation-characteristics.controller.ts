import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ClarisaInnovationCharacteristicsService } from './clarisa-innovation-characteristics.service';
import { CreateClarisaInnovationCharacteristicDto } from './dto/create-clarisa-innovation-characteristic.dto';
import { UpdateClarisaInnovationCharacteristicDto } from './dto/update-clarisa-innovation-characteristic.dto';

@Controller('clarisa-innovation-characteristics')
export class ClarisaInnovationCharacteristicsController {
  constructor(private readonly clarisaInnovationCharacteristicsService: ClarisaInnovationCharacteristicsService) {}

  @Post()
  create(@Body() createClarisaInnovationCharacteristicDto: CreateClarisaInnovationCharacteristicDto) {
    return this.clarisaInnovationCharacteristicsService.create(createClarisaInnovationCharacteristicDto);
  }

  @Get()
  findAll() {
    return this.clarisaInnovationCharacteristicsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clarisaInnovationCharacteristicsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateClarisaInnovationCharacteristicDto: UpdateClarisaInnovationCharacteristicDto) {
    return this.clarisaInnovationCharacteristicsService.update(+id, updateClarisaInnovationCharacteristicDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.clarisaInnovationCharacteristicsService.remove(+id);
  }
}
