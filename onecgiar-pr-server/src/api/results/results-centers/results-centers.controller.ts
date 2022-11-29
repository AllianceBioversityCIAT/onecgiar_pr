import { Controller, Get, Post, Body, Patch, Param, Delete, HttpException } from '@nestjs/common';
import { ResultsCentersService } from './results-centers.service';
import { CreateResultsCenterDto } from './dto/create-results-center.dto';
import { UpdateResultsCenterDto } from './dto/update-results-center.dto';

@Controller()
export class ResultsCentersController {
  constructor(private readonly resultsCentersService: ResultsCentersService) {}

  @Post()
  create(@Body() createResultsCenterDto: CreateResultsCenterDto) {
    return this.resultsCentersService.create(createResultsCenterDto);
  }

  @Get('get/result/:resultId')
  async findREsultCenterByResultId(
    @Param('resultId') resultId: number
  ) {
    const {message, response, status} =
      await this.resultsCentersService.findREsultCenterByResultId(resultId);
    throw new HttpException({ message, response }, status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.resultsCentersService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateResultsCenterDto: UpdateResultsCenterDto) {
    return this.resultsCentersService.update(+id, updateResultsCenterDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.resultsCentersService.remove(+id);
  }
}
