import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpException,
  Headers,
} from '@nestjs/common';
import { ResultsByInstitutionsService } from './results_by_institutions.service';
import { CreateResultsByInstitutionDto } from './dto/create-results_by_institution.dto';
import { UpdateResultsByInstitutionDto } from './dto/update-results_by_institution.dto';
import { SaveResultsByInstitutionDto } from './dto/save_results_by_institution.dto';
import { HeadersDto } from '../../../shared/globalInterfaces/headers.dto';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { HttpStatus } from '@nestjs/common';

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

  @Get('actors/result/:id')
  async findAllByActors(@Param('id') id: number) {
    const { message, response, status } =
       await this.resultsByInstitutionsService.getGetInstitutionsActorsByResultId(id);
    throw new HttpException({ message, response }, status);
  }

  @Get('partners/result/:id')
  async findAllByPartners(@Param('id') id: number) {
    const { message, response, status } =
       await this.resultsByInstitutionsService.getGetInstitutionsPartnersByResultId(id);
    throw new HttpException({ message, response }, status);
  }

  @Patch('create/partners')
  async findOne(
    @Body() updatePartners: SaveResultsByInstitutionDto,
    @Headers() auth: HeadersDto,
    ) {
      if(!auth?.auth){
        throw new HttpException({ message: `Token not found`, response: {} }, HttpStatus.BAD_REQUEST);
      }
      const token: TokenDto = <TokenDto>(
        JSON.parse(Buffer.from(auth.auth.split('.')[1], 'base64').toString())
      );
      const { message, response, status } = await this.resultsByInstitutionsService.savePartnersInstitutionsByResult(updatePartners, token);
      throw new HttpException({ message, response }, status);
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
