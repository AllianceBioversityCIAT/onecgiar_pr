import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
} from '@nestjs/common';
import { ResultsByEvidencesService } from './results_by_evidences.service';
import { CreateResultsByEvidenceDto } from './dto/create-results_by_evidence.dto';
import { UpdateResultsByEvidenceDto } from './dto/update-results_by_evidence.dto';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';

@Controller('results-by-evidences')
@UseInterceptors(ResponseInterceptor)
export class ResultsByEvidencesController {
  constructor(
    private readonly resultsByEvidencesService: ResultsByEvidencesService,
  ) {}

  @Post()
  create(@Body() createResultsByEvidenceDto: CreateResultsByEvidenceDto) {
    return this.resultsByEvidencesService.create(createResultsByEvidenceDto);
  }

  @Get('all')
  findAll() {
    return this.resultsByEvidencesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.resultsByEvidencesService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateResultsByEvidenceDto: UpdateResultsByEvidenceDto,
  ) {
    return this.resultsByEvidencesService.update(
      +id,
      updateResultsByEvidenceDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.resultsByEvidencesService.remove(+id);
  }
}
