import { Controller, Get, Post, Body, Patch, Param, Delete, HttpException } from '@nestjs/common';
import { ClarisaInnovationCharacteristicsService } from './clarisa-innovation-characteristics.service';
import { CreateClarisaInnovationCharacteristicDto } from './dto/create-clarisa-innovation-characteristic.dto';
import { UpdateClarisaInnovationCharacteristicDto } from './dto/update-clarisa-innovation-characteristic.dto';

@Controller()
export class ClarisaInnovationCharacteristicsController {
  constructor(private readonly clarisaInnovationCharacteristicsService: ClarisaInnovationCharacteristicsService) {}

  @Post()
  create(@Body() createClarisaInnovationCharacteristicDto: CreateClarisaInnovationCharacteristicDto) {
    return this.clarisaInnovationCharacteristicsService.create(createClarisaInnovationCharacteristicDto);
  }

  @Get('get/all')
  async findAll() {
    const { message, response, status } = 
      await this.clarisaInnovationCharacteristicsService.findAll();
    throw new HttpException({ message, response }, status);
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
