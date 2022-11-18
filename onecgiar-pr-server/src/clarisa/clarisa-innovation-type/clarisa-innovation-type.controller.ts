import { Controller, Get, Post, Body, Patch, Param, Delete, HttpException } from '@nestjs/common';
import { ClarisaInnovationTypeService } from './clarisa-innovation-type.service';
import { CreateClarisaInnovationTypeDto } from './dto/create-clarisa-innovation-type.dto';
import { UpdateClarisaInnovationTypeDto } from './dto/update-clarisa-innovation-type.dto';

@Controller()
export class ClarisaInnovationTypeController {
  constructor(private readonly clarisaInnovationTypeService: ClarisaInnovationTypeService) {}

  @Post()
  create(@Body() createClarisaInnovationTypeDto: CreateClarisaInnovationTypeDto) {
    return this.clarisaInnovationTypeService.create(createClarisaInnovationTypeDto);
  }

  @Get('get/all')
  async findAll() {
    const { message, response, status } = 
      await this.clarisaInnovationTypeService.findAll();
    throw new HttpException({ message, response }, status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clarisaInnovationTypeService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateClarisaInnovationTypeDto: UpdateClarisaInnovationTypeDto) {
    return this.clarisaInnovationTypeService.update(+id, updateClarisaInnovationTypeDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.clarisaInnovationTypeService.remove(+id);
  }
}
