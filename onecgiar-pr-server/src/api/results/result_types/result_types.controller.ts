import { Controller, Get, Post, Body, Patch, Param, Delete, HttpException } from '@nestjs/common';
import { ResultTypesService } from './result_types.service';
import { CreateResultTypeDto } from './dto/create-result_type.dto';
import { UpdateResultTypeDto } from './dto/update-result_type.dto';

@Controller('')
export class ResultTypesController {
  constructor(private readonly resultTypesService: ResultTypesService) {}

  @Post()
  create(@Body() createResultTypeDto: CreateResultTypeDto) {
    return this.resultTypesService.create(createResultTypeDto);
  }

  @Get('get/all')
  async findAll() {
    const {message, response, status} = await this.resultTypesService.getAllResultType();
    throw new HttpException({message,response}, status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.resultTypesService.findOneResultType(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateResultTypeDto: UpdateResultTypeDto) {
    return this.resultTypesService.update(+id, updateResultTypeDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.resultTypesService.remove(+id);
  }
}
