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
import { ResultsByInstitutionsService } from './results_by_institutions.service';
import { CreateResultsByInstitutionDto } from './dto/create-results_by_institution.dto';
import { UpdateResultsByInstitutionDto } from './dto/update-results_by_institution.dto';
import { SaveResultsByInstitutionDto } from './dto/save_results_by_institution.dto';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';
import { UserToken } from '../../../shared/decorators/user-token.decorator';

@Controller('/')
@UseInterceptors(ResponseInterceptor)
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
  findAll(@Param('id') id: number) {
    return this.resultsByInstitutionsService.getGetInstitutionsByResultId(id);
  }

  @Get('actors/result/:id')
  findAllByActors(@Param('id') id: number) {
    return this.resultsByInstitutionsService.getGetInstitutionsActorsByResultId(
      id,
    );
  }

  @Get('partners/result/:id')
  findAllByPartners(@Param('id') id: number) {
    return this.resultsByInstitutionsService.getGetInstitutionsPartnersByResultId(
      id,
    );
  }

  @Patch('create/partners/:id')
  findOne(
    @Body() updatePartners: SaveResultsByInstitutionDto,
    @UserToken() user: TokenDto,
    @Param('id') id: number,
  ) {
    updatePartners.result_id = id;
    return this.resultsByInstitutionsService.savePartnersInstitutionsByResult(
      updatePartners,
      user,
    );
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
