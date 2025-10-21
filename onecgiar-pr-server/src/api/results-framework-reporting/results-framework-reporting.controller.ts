import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ResultsFrameworkReportingService } from './results-framework-reporting.service';
import { ResultsService } from '../results/results.service';
import {
  ApiOperation,
  ApiQuery,
  ApiBody,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserToken } from '../../shared/decorators/user-token.decorator';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';
import { ScienceProgramProgressResponseDto } from '../results/dto/science-program-progress.dto';
import { CreateResultsFrameworkResultDto } from './dto/create-results-framework.dto';
import { ResponseInterceptor } from '../../shared/Interceptors/Return-data.interceptor';

@Controller()
@ApiTags('Results Framework and Reporting')
@UseInterceptors(ResponseInterceptor)
export class ResultsFrameworkReportingController {
  constructor(
    private readonly resultsFrameworkReportingService: ResultsFrameworkReportingService,
    private readonly resultsService: ResultsService,
  ) {}

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

  @Get('clarisa-global-units')
  @ApiOperation({
    summary: 'List Clarisa global units for a program',
    description:
      'Validates the user membership to the provided initiative and returns the Clarisa global units (level 2) mapped to that program for the active reporting year.',
  })
  @ApiQuery({
    name: 'programId',
    type: String,
    required: true,
    description: 'Initiative official code to query the Clarisa global units.',
  })
  @ApiOkResponse({
    description: 'Clarisa global units retrieved successfully.',
  })
  getClarisaGlobalUnits(
    @UserToken() user: TokenDto,
    @Query('programId') programId: string,
  ) {
    return this.resultsFrameworkReportingService.getGlobalUnitsByProgram(
      user,
      programId,
    );
  }

  @Get('toc-results')
  @ApiOperation({
    summary: 'List ToC results by program and area of work',
    description:
      'Retrieves the ToC result identifiers for the provided program and area of work combination.',
  })
  @ApiQuery({
    name: 'program',
    type: String,
    required: true,
    description: 'Program identifier (e.g. SP01).',
  })
  @ApiQuery({
    name: 'areaOfWork',
    type: String,
    required: true,
    description: 'Area of work identifier (e.g. AOW01).',
  })
  @ApiQuery({
    name: 'year',
    type: Number,
    required: false,
    description: 'Optional phase year to filter the work packages.',
  })
  @ApiOkResponse({
    description: 'Work packages retrieved successfully.',
  })
  getTocWorkPackages(
    @Query('program') program: string,
    @Query('areaOfWork') areaOfWork: string,
    @Query('year') year?: string,
  ) {
    return this.resultsFrameworkReportingService.getWorkPackagesByProgramAndArea(
      program,
      areaOfWork,
      year,
    );
  }

  @Get('toc-results/2030-outcomes')
  @ApiOperation({
    summary: 'List ToC 2030 outcomes by program',
    description:
      'Retrieves the set of End of Initiative (EOI) ToC outcomes for the requested program in the active reporting year.',
  })
  @ApiQuery({
    name: 'programId',
    type: String,
    required: true,
    description: 'Program identifier (e.g. SP01).',
  })
  @ApiOkResponse({
    description: 'ToC 2030 outcomes retrieved successfully.',
  })
  getToc2030Outcomes(@Query('programId') programId: string) {
    return this.resultsFrameworkReportingService.getToc2030Outcomes(programId);
  }

  @Get('programs/indicator-contribution-summary')
  @ApiOperation({
    summary: 'Get summary of results contributing to ToC indicators',
    description:
      'Aggregates result counts by type and status for the provided program, considering only results linked to ToC indicators in the current active phase.',
  })
  @ApiQuery({
    name: 'program',
    type: String,
    required: true,
    description: 'Program identifier (e.g. SP01).',
  })
  @ApiOkResponse({
    description:
      'Indicator contribution summary retrieved for the requested program.',
  })
  getProgramIndicatorContributionSummary(@Query('program') program: string) {
    return this.resultsFrameworkReportingService.getProgramIndicatorContributionSummary(
      program,
    );
  }

  @Post('create')
  @ApiOperation({
    summary: 'Create result header through reporting workflow',
    description:
      'Creates a new result (or knowledge product) and links it to ToC elements when provided.',
  })
  @ApiBody({ type: CreateResultsFrameworkResultDto })
  @ApiCreatedResponse({ description: 'Result created successfully.' })
  createResultFromFramework(
    @Body() payload: CreateResultsFrameworkResultDto,
    @UserToken() user: TokenDto,
  ) {
    return this.resultsFrameworkReportingService.createResultFromFramework(
      payload,
      user,
    );
  }

  @Get('bilateral-projects')
  @ApiOperation({
    summary: 'List bilateral projects for a program and toc result',
    description:
      'Validates the user membership to the provided initiative and returns the bilateral projects mapped to that program for the active reporting year.',
  })
  @ApiQuery({
    name: 'tocResultId',
    type: Number,
    required: true,
    description: 'ToC Result ID to filter the bilateral projects.',
  })
  @ApiOkResponse({
    description: 'Bilateral projects retrieved successfully.',
  })
  getBilateralProjects(@Query('tocResultId') tocResultId: number) {
    return this.resultsFrameworkReportingService.getBilateralProjectsByProgramAndTocResult(
      tocResultId,
    );
  }

  @Get('existing-result-contributors')
  @ApiOperation({
    summary: 'Get contributors and partners for an existing result',
    description:
      'Retrieves the contributors and partners information for a specified result ID, including details about initiatives, institutions, centers, and projects associated with the result.',
  })
  @ApiQuery({
    name: 'resultTocResultId',
    type: Number,
    required: true,
    description: 'The ID of the result to fetch contributors and partners for.',
  })
  @ApiQuery({
    name: 'tocResultIndicatorId',
    type: String,
    required: true,
    description:
      'The ID of the ToC result indicator to fetch contributors and partners for.',
  })
  @ApiOkResponse({
    description: 'Contributors and partners fetched successfully.',
  })
  getExistingResultContributorsAndPartners(
    @Query('resultTocResultId') resultTocResultId: number,
    @Query('tocResultIndicatorId') tocResultIndicatorId: string,
  ) {
    return this.resultsFrameworkReportingService.getExistingResultContributorsToIndicators(
      resultTocResultId,
      tocResultIndicatorId,
    );
  }
}
