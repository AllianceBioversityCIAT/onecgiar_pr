import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ResultIpMeasuresService } from './result-ip-measures.service';
import { CreateResultIpMeasureDto } from './dto/create-result-ip-measure.dto';
import { UpdateResultIpMeasureDto } from './dto/update-result-ip-measure.dto';

@Controller('result-ip-measures')
export class ResultIpMeasuresController {
  constructor(
    private readonly resultIpMeasuresService: ResultIpMeasuresService,
  ) {}

  @Post()
  create(@Body() createResultIpMeasureDto: CreateResultIpMeasureDto) {
    return this.resultIpMeasuresService.create(createResultIpMeasureDto);
  }

  @Get()
  findAll() {
    return this.resultIpMeasuresService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.resultIpMeasuresService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateResultIpMeasureDto: UpdateResultIpMeasureDto,
  ) {
    return this.resultIpMeasuresService.update(+id, updateResultIpMeasureDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.resultIpMeasuresService.remove(+id);
  }
}
