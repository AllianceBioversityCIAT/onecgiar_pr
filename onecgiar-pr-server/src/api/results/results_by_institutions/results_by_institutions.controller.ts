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
import { ResultsByInstitutionsService } from './results_by_institutions.service';
import { CreateResultsByInstitutionDto } from './dto/create-results_by_institution.dto';
import { UpdateResultsByInstitutionDto } from './dto/update-results_by_institution.dto';

@Controller('/')
export class ResultsByInstitutionsController {
  constructor(
    private readonly resultsByInstitutionsService: ResultsByInstitutionsService,
  ) {}

  @Post()
  create(@Body() createResultsByInstitutionDto: CreateResultsByInstitutionDto) {
    return this.resultsByInstitutionsService.create(
      createResultsByInstitutionDto,
    );
  }

  @Get('result/:id')
  async findAll(@Param('id') id: number) {
    const { message, response, status } =
       await this.resultsByInstitutionsService.getGetInstitutionsByResultId(id);
    throw new HttpException({ message, response }, status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.resultsByInstitutionsService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateResultsByInstitutionDto: UpdateResultsByInstitutionDto,
  ) {
    return this.resultsByInstitutionsService.update(
      +id,
      updateResultsByInstitutionDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.resultsByInstitutionsService.remove(+id);
  }
}
