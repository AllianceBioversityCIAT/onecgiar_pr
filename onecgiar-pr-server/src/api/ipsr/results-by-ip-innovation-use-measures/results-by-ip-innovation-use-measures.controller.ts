import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ResultsByIpInnovationUseMeasuresService } from './results-by-ip-innovation-use-measures.service';
import { CreateResultsByIpInnovationUseMeasureDto } from './dto/create-results-by-ip-innovation-use-measure.dto';
import { UpdateResultsByIpInnovationUseMeasureDto } from './dto/update-results-by-ip-innovation-use-measure.dto';

@Controller('results-by-ip-innovation-use-measures')
export class ResultsByIpInnovationUseMeasuresController {
  constructor(
    private readonly resultsByIpInnovationUseMeasuresService: ResultsByIpInnovationUseMeasuresService,
  ) {}

  @Post()
  create(
    @Body()
    createResultsByIpInnovationUseMeasureDto: CreateResultsByIpInnovationUseMeasureDto,
  ) {
    return this.resultsByIpInnovationUseMeasuresService.create(
      createResultsByIpInnovationUseMeasureDto,
    );
  }

  @Get()
  findAll() {
    return this.resultsByIpInnovationUseMeasuresService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.resultsByIpInnovationUseMeasuresService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    updateResultsByIpInnovationUseMeasureDto: UpdateResultsByIpInnovationUseMeasureDto,
  ) {
    return this.resultsByIpInnovationUseMeasuresService.update(
      +id,
      updateResultsByIpInnovationUseMeasureDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.resultsByIpInnovationUseMeasuresService.remove(+id);
  }
}
