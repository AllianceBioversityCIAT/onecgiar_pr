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
import { ResultsByInititiativesService } from './results_by_inititiatives.service';
import { CreateResultsByInititiativeDto } from './dto/create-results_by_inititiative.dto';
import { UpdateResultsByInititiativeDto } from './dto/update-results_by_inititiative.dto';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';

@Controller('/')
@UseInterceptors(ResponseInterceptor)
export class ResultsByInititiativesController {
  constructor(
    private readonly resultsByInititiativesService: ResultsByInititiativesService,
  ) {}

  @Post()
  create(
    @Body() createResultsByInititiativeDto: CreateResultsByInititiativeDto,
  ) {
    return this.resultsByInititiativesService.create(
      createResultsByInititiativeDto,
    );
  }

  @Get('all')
  findAll() {
    return this.resultsByInititiativesService.findAll();
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateResultsByInititiativeDto: UpdateResultsByInititiativeDto,
  ) {
    return this.resultsByInititiativesService.update(
      +id,
      updateResultsByInititiativeDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.resultsByInititiativesService.remove(+id);
  }
}
