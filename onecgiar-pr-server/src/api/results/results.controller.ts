import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ResultsService } from './results.service';
import { CreateResultDto } from './dto/create-result.dto';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';
import { MapLegacy } from './dto/map-legacy.dto';
import { CreateGeneralInformationResultDto } from './dto/create-general-information-result.dto';
import { CreateResultGeoDto } from './dto/create-result-geo-scope.dto';
import { UserToken } from 'src/shared/decorators/user-token.decorator';
import { ResponseInterceptor } from '../../shared/Interceptors/Return-data.interceptor';
import { ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';

@Controller()
@ApiTags('results')
@UseInterceptors(ResponseInterceptor)
export class ResultsController {
  constructor(private readonly resultsService: ResultsService) {}

  @Post('create/header')
  create(
    @Body() createResultDto: CreateResultDto,
    @UserToken() user: TokenDto,
  ) {
    return this.resultsService.createOwnerResult(createResultDto, user);
  }

  @Get('get/:id')
  findResultById(@Param('id') id: number) {
    return this.resultsService.findResultById(id);
  }

  @Get('get/name/:name')
  findAll(@Param('name') resultName: string) {
    return this.resultsService.findAll() + resultName;
  }

  @Get('get/all/data')
  findAllResults() {
    return this.resultsService.findAll();
  }

  @Get('get/all/simplified')
  findAllResultsForElasticSearch() {
    return this.resultsService.findAllSimplified();
  }

  @Get('get/all/elastic')
  findAllResultsSimplified(@Query('collection') collection: string) {
    return this.resultsService.findForElasticSearch(collection);
  }

  @Get('get/initiatives/:userId')
  findInitiativesByUser(@Param('userId') userId: number) {
    return `aja ${userId}`;
  }

  @Get('get/all/roles/:userId')
  @ApiParam({ name: 'userId', type: Number, required: true })
  @ApiQuery({ name: 'initiative', type: String, required: false })
  findAllResultRoles(
    @Param('userId') userId: number,
    @Query('initiative') init?: string,
  ) {
    return this.resultsService.findAllByRole(userId, init);
  }

  @Get('get/depth-search/:title')
  depthSearch(@Param('title') title: string) {
    return this.resultsService.findAllResultsLegacyNew(title);
  }

  @Get('get/institutions/all')
  getInstitutions() {
    return this.resultsService.getAllInstitutions();
  }

  @Get('get/institutions-type/new')
  getNewInstitutionsType() {
    return this.resultsService.getAllInstitutionsType(false);
  }

  @Get('get/institutions-type/childless')
  getChildlessInstitutionsType() {
    return this.resultsService.getChildlessInstitutionTypes();
  }

  @Get('get/institutions-type/legacy')
  getLegacyInstitutionsType() {
    return this.resultsService.getAllInstitutionsType(true);
  }

  @Get('get/institutions-type/all')
  getAllInstitutionsType() {
    return this.resultsService.getAllInstitutionsType();
  }

  @Post('map/legacy')
  mapResultLegacy(@Body() mapLegacy: MapLegacy, @UserToken() user: TokenDto) {
    return this.resultsService.mapResultLegacy(mapLegacy, user);
  }

  @Patch('create/general-information')
  createGeneralInformation(
    @Body()
    createGeneralInformationResultDto: CreateGeneralInformationResultDto,
    @UserToken() user: TokenDto,
  ) {
    return this.resultsService.createResultGeneralInformation(
      createGeneralInformationResultDto,
      user,
    );
  }

  @Get('get/general-information/result/:id')
  getGeneralInformationByResult(@Param('id') id: number) {
    return this.resultsService.getGeneralInformation(id);
  }

  @Patch('delete/:id')
  update(@Param('id') id: number, @UserToken() user: TokenDto) {
    return this.resultsService.deleteResult(id, user);
  }

  @Patch('update/geographic/:resiltId')
  saveGeographic(
    @Body() createResultGeoDto: CreateResultGeoDto,
    @Param('resiltId') resiltId: number,
    @UserToken() user: TokenDto,
  ) {
    createResultGeoDto.result_id = resiltId;
    return this.resultsService.saveGeoScope(createResultGeoDto, user);
  }

  @Get('get/geographic/:resiltId')
  getGeographic(@Param('resiltId') resiltId: number) {
    return this.resultsService.getGeoScope(resiltId);
  }

  @Get('get/transform/:resultCode')
  @UseInterceptors(ResponseInterceptor)
  transformResultCode(
    @Param('resultCode') resultCode: number,
    @Query('phase') phase: string,
  ) {
    return this.resultsService.transformResultCode(resultCode, +phase);
  }

  @Get('get/reporting/list/date/:initDate/:lastDate')
  getResultDataForBasicReport(
    @Param('initDate') initDate: Date,
    @Param('lastDate') lastDate: Date,
  ) {
    return this.resultsService.getResultDataForBasicReport(initDate, lastDate);
  }

  @Post('create/version/:resultId')
  createVersion(
    @Param('resultId') resultId: number,
    @UserToken() user: TokenDto,
  ) {
    this.resultsService.versioningResultsById(resultId, user);
    return 'ok';
  }

  @Get('get/centers/:resultId')
  getCentersByResultId(@Param('resultId') resultId: number) {
    return this.resultsService.getCenters(resultId);
  }
}
