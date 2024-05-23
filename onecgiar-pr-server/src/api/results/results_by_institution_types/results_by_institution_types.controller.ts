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
import { ResultsByInstitutionTypesService } from './results_by_institution_types.service';
import { CreateResultsByInstitutionTypeDto } from './dto/create-results_by_institution_type.dto';
import { UpdateResultsByInstitutionTypeDto } from './dto/update-results_by_institution_type.dto';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';

@Controller('/')
@UseInterceptors(ResponseInterceptor)
export class ResultsByInstitutionTypesController {
  constructor(
    private readonly resultsByInstitutionTypesService: ResultsByInstitutionTypesService,
  ) {}

  @Post()
  create(
    @Body()
    createResultsByInstitutionTypeDto: CreateResultsByInstitutionTypeDto,
  ) {
    return this.resultsByInstitutionTypesService.create(
      createResultsByInstitutionTypeDto,
    );
  }

  @Get('result/:id')
  findAll(@Param('id') id: number) {
    return this.resultsByInstitutionTypesService.getGetInstitutionsTypeByResultId(
      id,
    );
  }

  @Get('actors/result/:id')
  findAllActors(@Param('id') id: number) {
    return this.resultsByInstitutionTypesService.getGetInstitutionsTypeActorsByResultId(
      id,
    );
  }

  @Get('partners/result/:id')
  findAllPartners(@Param('id') id: number) {
    return this.resultsByInstitutionTypesService.getGetInstitutionsTypePartnersByResultId(
      id,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.resultsByInstitutionTypesService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    updateResultsByInstitutionTypeDto: UpdateResultsByInstitutionTypeDto,
  ) {
    return this.resultsByInstitutionTypesService.update(
      +id,
      updateResultsByInstitutionTypeDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.resultsByInstitutionTypesService.remove(+id);
  }
}
