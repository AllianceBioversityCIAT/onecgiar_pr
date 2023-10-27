import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpException,
} from '@nestjs/common';
import { ResultsByInstitutionTypesService } from './results_by_institution_types.service';
import { CreateResultsByInstitutionTypeDto } from './dto/create-results_by_institution_type.dto';
import { UpdateResultsByInstitutionTypeDto } from './dto/update-results_by_institution_type.dto';

@Controller('/')
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
  async findAll(@Param('id') id: number) {
    const { message, response, status } =
      await this.resultsByInstitutionTypesService.getGetInstitutionsTypeByResultId(
        id,
      );
    throw new HttpException({ message, response }, status);
  }

  @Get('actors/result/:id')
  async findAllActors(@Param('id') id: number) {
    const { message, response, status } =
      await this.resultsByInstitutionTypesService.getGetInstitutionsTypeActorsByResultId(
        id,
      );
    throw new HttpException({ message, response }, status);
  }

  @Get('partners/result/:id')
  async findAllPartners(@Param('id') id: number) {
    const { message, response, status } =
      await this.resultsByInstitutionTypesService.getGetInstitutionsTypePartnersByResultId(
        id,
      );
    throw new HttpException({ message, response }, status);
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
