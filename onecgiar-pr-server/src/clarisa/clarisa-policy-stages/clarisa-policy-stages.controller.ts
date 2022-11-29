import { Controller, Get, Post, Body, Patch, Param, Delete, HttpException } from '@nestjs/common';
import { ClarisaPolicyStagesService } from './clarisa-policy-stages.service';
import { CreateClarisaPolicyStageDto } from './dto/create-clarisa-policy-stage.dto';
import { UpdateClarisaPolicyStageDto } from './dto/update-clarisa-policy-stage.dto';

@Controller()
export class ClarisaPolicyStagesController {
  constructor(private readonly clarisaPolicyStagesService: ClarisaPolicyStagesService) {}

  @Post()
  create(@Body() createClarisaPolicyStageDto: CreateClarisaPolicyStageDto) {
    return this.clarisaPolicyStagesService.create(createClarisaPolicyStageDto);
  }

  @Get('get/all')
  async findAll() {
    const { message, response, status } = 
      await this.clarisaPolicyStagesService.findAll();
    throw new HttpException({ message, response }, status);

  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clarisaPolicyStagesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateClarisaPolicyStageDto: UpdateClarisaPolicyStageDto) {
    return this.clarisaPolicyStagesService.update(+id, updateClarisaPolicyStageDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.clarisaPolicyStagesService.remove(+id);
  }
}
