import { Controller, Get, Post, Body, Patch, Param, Delete, HttpException } from '@nestjs/common';
import { ClarisaPolicyTypesService } from './clarisa-policy-types.service';
import { CreateClarisaPolicyTypeDto } from './dto/create-clarisa-policy-type.dto';
import { UpdateClarisaPolicyTypeDto } from './dto/update-clarisa-policy-type.dto';

@Controller()
export class ClarisaPolicyTypesController {
  constructor(private readonly clarisaPolicyTypesService: ClarisaPolicyTypesService) {}

  @Post()
  create(@Body() createClarisaPolicyTypeDto: CreateClarisaPolicyTypeDto) {
    return this.clarisaPolicyTypesService.create(createClarisaPolicyTypeDto);
  }

  @Get('get/all')
  async findAll() {
    const { message, response, status } = 
      await this.clarisaPolicyTypesService.findAll();
    throw new HttpException({ message, response }, status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clarisaPolicyTypesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateClarisaPolicyTypeDto: UpdateClarisaPolicyTypeDto) {
    return this.clarisaPolicyTypesService.update(+id, updateClarisaPolicyTypeDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.clarisaPolicyTypesService.remove(+id);
  }
}
