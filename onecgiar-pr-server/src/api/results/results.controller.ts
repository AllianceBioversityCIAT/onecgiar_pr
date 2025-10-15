import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseInterceptors,
  Version,
} from '@nestjs/common';
import { ResultsService } from './results.service';
import { CreateResultDto } from './dto/create-result.dto';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';
import { MapLegacy } from './dto/map-legacy.dto';
import { CreateGeneralInformationResultDto } from './dto/create-general-information-result.dto';
import { CreateResultGeoDto } from './dto/create-result-geo-scope.dto';
import { ScienceProgramProgressResponseDto } from './dto/science-program-progress.dto';
import { UserToken } from 'src/shared/decorators/user-token.decorator';
import { ResponseInterceptor } from '../../shared/Interceptors/Return-data.interceptor';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

@Controller()
@ApiTags('Results Module')
@UseInterceptors(ResponseInterceptor)
export class ResultsController {
  constructor(private readonly resultsService: ResultsService) {}

  @Post('create/header')
  @ApiOperation({
    summary: 'Create result header',
    description:
      'Registers the base information for a result and links it to the authenticated user.',
  })
  @ApiBody({ type: CreateResultDto })
  @ApiCreatedResponse({ description: 'Result header created successfully.' })
  create(
    @Body() createResultDto: CreateResultDto,
    @UserToken() user: TokenDto,
  ) {
    return this.resultsService.createOwnerResult(createResultDto, user);
  }

  @Version('2')
  @Post('create/header')
  @ApiOperation({
    summary: 'Create result header',
    description:
      'Registers the base information for a result and links it to the authenticated user.',
  })
  @ApiBody({ type: CreateResultDto })
  @ApiCreatedResponse({ description: 'Result header created successfully.' })
  createV2(
    @Body() createResultDto: CreateResultDto,
    @UserToken() user: TokenDto,
  ) {
    return this.resultsService.createOwnerResultV2(createResultDto, user);
  }

  @Get('get/:id')
  @ApiOperation({
    summary: 'Get result by id',
    description: 'Returns full result data for the provided identifier.',
  })
  @ApiParam({ name: 'id', type: Number, required: true })
  @ApiOkResponse({ description: 'Result found.' })
  findResultById(@Param('id') id: number) {
    return this.resultsService.findResultById(id);
  }

  @Get('get/name/:name')
  @ApiOperation({
    summary: 'Find result by name',
    description: 'Searches for results partially matching the provided name.',
  })
  @ApiParam({ name: 'name', type: String, required: true })
  @ApiOkResponse({ description: 'Matching results retrieved.' })
  findAll(@Param('name') resultName: string) {
    return this.resultsService.findAll() + resultName;
  }

  @Get('get/all/data')
  @ApiOperation({
    summary: 'List all results',
    description: 'Returns the complete list of registered results.',
  })
  @ApiOkResponse({ description: 'Result list retrieved.' })
  findAllResults() {
    return this.resultsService.findAll();
  }

  @Get('get/all/simplified')
  @ApiOperation({
    summary: 'List simplified results',
    description:
      'Returns a simplified payload useful for dropdowns and lookups.',
  })
  @ApiOkResponse({ description: 'Simplified results retrieved.' })
  findAllResultsForElasticSearch() {
    return this.resultsService.findAllSimplified();
  }

  @Get('get/all/elastic')
  @ApiOperation({
    summary: 'List results for ElasticSearch ingestion',
    description:
      'Fetches a simplified result set filtered by collection for indexing.',
  })
  @ApiQuery({ name: 'collection', type: String, required: false })
  @ApiOkResponse({
    description: 'Results ready for search indexing retrieved.',
  })
  findAllResultsSimplified(@Query('collection') collection: string) {
    return this.resultsService.findForElasticSearch(collection);
  }

  @Get('get/initiatives/:userId')
  @ApiOperation({
    summary: 'Get initiatives by user',
    description:
      'Returns initiatives associated to the provided user identifier.',
  })
  @ApiParam({ name: 'userId', type: Number, required: true })
  @ApiOkResponse({ description: 'Initiatives retrieved.' })
  findInitiativesByUser(@Param('userId') userId: number) {
    return `aja ${userId}`;
  }

  @Get('get/all/roles/:userId')
  @ApiOperation({
    summary: 'List results by user role',
    description:
      'Fetches results associated to the given user, optionally scoped by initiative.',
  })
  @ApiParam({ name: 'userId', type: Number, required: true })
  @ApiQuery({ name: 'initiative', type: String, required: false })
  @ApiOkResponse({
    description: 'Results retrieved for the provided user and filters.',
  })
  findAllResultRoles(
    @Param('userId') userId: number,
    @Query('initiative') init?: string,
  ) {
    return this.resultsService.findAllByRole(userId, init);
  }

  @Get('get/all/roles/filter/:userId')
  @ApiOperation({
    summary: 'Filter results by role with advanced parameters',
    description:
      'Provides paginated, filterable access to results linked to the given user.',
  })
  @ApiParam({ name: 'userId', type: Number, required: true })
  @ApiQuery({ name: 'initiative', type: String, required: false })
  @ApiQuery({
    name: 'phase',
    type: String,
    required: false,
    description: 'Alias of version_id. Comma-separated allowed.',
  })
  @ApiQuery({
    name: 'version_id',
    type: String,
    required: false,
    description: 'Filter by phase/version id. Comma-separated allowed.',
  })
  @ApiQuery({
    name: 'submitter',
    type: String,
    required: false,
    description:
      'Filter by submitter_id (initiative id). Comma-separated allowed.',
  })
  @ApiQuery({
    name: 'submitter_id',
    type: String,
    required: false,
    description: 'Filter by submitter_id. Comma-separated allowed.',
  })
  @ApiQuery({
    name: 'result_type',
    type: String,
    required: false,
    description: 'Alias of result_type_id. Comma-separated allowed.',
  })
  @ApiQuery({
    name: 'result_type_id',
    type: String,
    required: false,
    description: 'Filter by result_type_id. Comma-separated allowed.',
  })
  @ApiQuery({
    name: 'portfolio',
    type: String,
    required: false,
    description: 'Alias of portfolio_id. Comma-separated allowed.',
  })
  @ApiQuery({
    name: 'portfolio_id',
    type: String,
    required: false,
    description: 'Filter by portfolio_id. Comma-separated allowed.',
  })
  @ApiQuery({
    name: 'status_id',
    type: String,
    required: false,
    description: 'Filter by status_id. Comma-separated allowed.',
  })
  @ApiQuery({
    name: 'page',
    type: Number,
    required: false,
    description: 'Page number (1-based). Returns meta when used.',
  })
  @ApiQuery({
    name: 'limit',
    type: Number,
    required: false,
    description: 'Items per page. Returns meta when used.',
  })
  findAllResultRolesFiltered(
    @Param('userId') userId: number,
    @Query() query: Record<string, any>,
  ) {
    return this.resultsService.findAllByRoleFiltered(userId, query);
  }

  @Get('get/science-programs/progress')
  @ApiOperation({
    summary: 'Get science program progress',
    description:
      'Aggregates reported results by science program (portfolio 3) and splits them by the user permissions.',
  })
  @ApiQuery({
    name: 'versionId',
    type: Number,
    required: false,
    description: 'Optional phase/version identifier to filter the results.',
  })
  @ApiOkResponse({
    description: 'Science program progress grouped by initiatives.',
    type: ScienceProgramProgressResponseDto,
  })
  getScienceProgramProgress(
    @UserToken() user: TokenDto,
    @Query('versionId') versionId?: string,
  ) {
    const parsedVersion =
      versionId !== undefined && versionId !== null
        ? Number(versionId)
        : undefined;

    const normalizedVersion =
      typeof parsedVersion === 'number' && Number.isFinite(parsedVersion)
        ? parsedVersion
        : undefined;

    return this.resultsService.getScienceProgramProgress(
      user,
      normalizedVersion,
    );
  }

  @Get('get/depth-search/:title')
  @ApiOperation({
    summary: 'Perform deep result search',
    description:
      'Runs the legacy deep search pipeline using the provided title.',
  })
  @ApiParam({ name: 'title', type: String, required: true })
  @ApiOkResponse({ description: 'Deep search results retrieved.' })
  depthSearch(@Param('title') title: string) {
    return this.resultsService.findAllResultsLegacyNew(title);
  }

  @Get('get/institutions/all')
  @ApiOperation({
    summary: 'List all institutions',
    description: 'Returns every institution linked to results.',
  })
  @ApiOkResponse({ description: 'Institutions retrieved.' })
  getInstitutions() {
    return this.resultsService.getAllInstitutions();
  }

  @Get('get/institutions-type/new')
  @ApiOperation({
    summary: 'List new institution types',
    description: 'Retrieves institution types available for new records.',
  })
  @ApiOkResponse({ description: 'Institution types retrieved.' })
  getNewInstitutionsType() {
    return this.resultsService.getAllInstitutionsType(false);
  }

  @Get('get/institutions-type/childless')
  @ApiOperation({
    summary: 'List childless institution types',
    description:
      'Returns institution types that do not have child relationships.',
  })
  @ApiOkResponse({ description: 'Childless institution types retrieved.' })
  getChildlessInstitutionsType() {
    return this.resultsService.getChildlessInstitutionTypes();
  }

  @Get('get/institutions-type/legacy')
  @ApiOperation({
    summary: 'List legacy institution types',
    description: 'Retrieves the institution types flagged as legacy.',
  })
  @ApiOkResponse({ description: 'Legacy institution types retrieved.' })
  getLegacyInstitutionsType() {
    return this.resultsService.getAllInstitutionsType(true);
  }

  @Get('get/institutions-type/all')
  @ApiOperation({
    summary: 'List all institution types',
    description: 'Returns every institution type regardless of category.',
  })
  @ApiOkResponse({ description: 'Institution types retrieved.' })
  getAllInstitutionsType() {
    return this.resultsService.getAllInstitutionsType();
  }

  @Post('map/legacy')
  @ApiOperation({
    summary: 'Map legacy result',
    description: 'Associates a legacy result with the current result model.',
  })
  @ApiBody({ type: MapLegacy })
  @ApiCreatedResponse({ description: 'Legacy result mapped successfully.' })
  mapResultLegacy(@Body() mapLegacy: MapLegacy, @UserToken() user: TokenDto) {
    return this.resultsService.mapResultLegacy(mapLegacy, user);
  }

  @Patch('create/general-information')
  @ApiOperation({
    summary: 'Update general information',
    description:
      'Creates or updates the general information section of a result.',
  })
  @ApiBody({ type: CreateGeneralInformationResultDto })
  @ApiOkResponse({ description: 'General information saved.' })
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
  @ApiOperation({
    summary: 'Get general information by result',
    description:
      'Returns the general information section for the specified result id.',
  })
  @ApiParam({ name: 'id', type: Number, required: true })
  @ApiOkResponse({ description: 'General information retrieved.' })
  getGeneralInformationByResult(@Param('id') id: number) {
    return this.resultsService.getGeneralInformation(id);
  }

  @Patch('delete/:id')
  @ApiOperation({
    summary: 'Soft delete result',
    description:
      'Marks a result as deleted while keeping the historical record.',
  })
  @ApiParam({ name: 'id', type: Number, required: true })
  @ApiOkResponse({ description: 'Result flagged as deleted.' })
  update(@Param('id') id: number, @UserToken() user: TokenDto) {
    return this.resultsService.deleteResult(id, user);
  }

  @Patch('update/geographic/:resiltId')
  @ApiOperation({
    summary: 'Save geographic scope',
    description:
      'Creates or updates the geographic scope configuration for the selected result.',
  })
  @ApiParam({ name: 'resiltId', type: Number, required: true })
  @ApiBody({ type: CreateResultGeoDto })
  @ApiOkResponse({ description: 'Geographic scope saved.' })
  saveGeographic(
    @Body() createResultGeoDto: CreateResultGeoDto,
    @Param('resiltId') resiltId: number,
    @UserToken() user: TokenDto,
  ) {
    createResultGeoDto.result_id = resiltId;
    return this.resultsService.saveGeoScope(createResultGeoDto, user);
  }

  @Get('get/geographic/:resiltId')
  @ApiOperation({
    summary: 'Get geographic scope',
    description:
      'Retrieves the geographic scope configuration for the provided result.',
  })
  @ApiParam({ name: 'resiltId', type: Number, required: true })
  @ApiOkResponse({ description: 'Geographic scope retrieved.' })
  getGeographic(@Param('resiltId') resiltId: number) {
    return this.resultsService.getGeoScope(resiltId);
  }

  @Get('get/transform/:resultCode')
  @UseInterceptors(ResponseInterceptor)
  @ApiOperation({
    summary: 'Transform result by code',
    description:
      'Transforms a legacy result code into the current representation using the provided phase.',
  })
  @ApiParam({ name: 'resultCode', type: Number, required: true })
  @ApiQuery({
    name: 'phase',
    type: String,
    required: true,
    description: 'Phase identifier used for the transformation.',
  })
  @ApiOkResponse({ description: 'Result transformed.' })
  transformResultCode(
    @Param('resultCode') resultCode: number,
    @Query('phase') phase: string,
  ) {
    return this.resultsService.transformResultCode(resultCode, +phase);
  }

  @Get('get/reporting/list/date/:initDate/:lastDate')
  @ApiOperation({
    summary: 'Get basic reporting data by date range',
    description:
      'Returns the dataset used by the basic report within the provided date range.',
  })
  @ApiParam({ name: 'initDate', type: String, required: true })
  @ApiParam({ name: 'lastDate', type: String, required: true })
  @ApiOkResponse({ description: 'Reporting data retrieved.' })
  getResultDataForBasicReport(
    @Param('initDate') initDate: Date,
    @Param('lastDate') lastDate: Date,
  ) {
    return this.resultsService.getResultDataForBasicReport(initDate, lastDate);
  }

  @Post('create/version/:resultId')
  @ApiOperation({
    summary: 'Create result version',
    description:
      'Triggers result versioning for the provided result identifier and user.',
  })
  @ApiParam({ name: 'resultId', type: Number, required: true })
  @ApiCreatedResponse({ description: 'Versioning process started.' })
  createVersion(
    @Param('resultId') resultId: number,
    @UserToken() user: TokenDto,
  ) {
    this.resultsService.versioningResultsById(resultId, user);
    return 'ok';
  }

  @Get('get/centers/:resultId')
  @ApiOperation({
    summary: 'Get centers by result',
    description:
      'Retrieves centers associated with the provided result identifier.',
  })
  @ApiParam({ name: 'resultId', type: Number, required: true })
  @ApiOkResponse({ description: 'Centers retrieved.' })
  getCentersByResultId(@Param('resultId') resultId: number) {
    return this.resultsService.getCenters(resultId);
  }

  @Version('2')
  @Patch('create/general-information')
  @ApiOperation({
    summary: 'Update general information',
    description:
      'Creates or updates the general information section of a result.',
  })
  @ApiBody({ type: CreateGeneralInformationResultDto })
  @ApiOkResponse({ description: 'General information saved.' })
  createGeneralInformationV2(
    @Body()
    createGeneralInformationResultDto: CreateGeneralInformationResultDto,
    @UserToken() user: TokenDto,
  ) {
    return this.resultsService.createResultGeneralInformation(
      createGeneralInformationResultDto,
      user,
    );
  }

  @Version('2')
  @Get('get/general-information/result/:id')
  @ApiOperation({
    summary: 'Get general information by result',
    description:
      'Returns the general information section for the specified result id.',
  })
  @ApiParam({ name: 'id', type: Number, required: true })
  @ApiOkResponse({ description: 'General information retrieved.' })
  getGeneralInformationByResultV2(@Param('id') id: number) {
    return this.resultsService.getGeneralInformation(id);
  }
}
