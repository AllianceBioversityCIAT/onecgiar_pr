import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiQuery,
  ApiBody,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ResultsFrameworkReportingService } from './results-framework-reporting.service';
import { ResultsService } from '../results/results.service';
import { ReportingEntryHubService } from './services/reporting-entry-hub.service';
import { UserToken } from '../../shared/decorators/user-token.decorator';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';
import { ScienceProgramProgressResponseDto } from '../results/dto/science-program-progress.dto';
import { CreateResultsFrameworkResultDto } from './dto/create-results-framework.dto';
import { ReportingEntryHubProjectsDto } from './dto/reporting-entry-hub-projects.dto';
import { ResponseInterceptor } from '../../shared/Interceptors/Return-data.interceptor';

@Controller()
@UseInterceptors(ResponseInterceptor)
@ApiTags('Results Framework and Reporting')
@UseInterceptors(ResponseInterceptor)
export class ResultsFrameworkReportingController {
  constructor(
    private readonly resultsFrameworkReportingService: ResultsFrameworkReportingService,
    private readonly resultsService: ResultsService,
    private readonly reportingEntryHubService: ReportingEntryHubService,
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

  @Get('results-scope')
  @ApiOperation({
    summary: "Get each result's scope bucket for a program and phase",
    description:
      "Returns, for one program at one phase (versionId), every result's scope bucket — the same partition and tie-break rule the Overview's clarisa-global-units scopeBuckets uses, but without the W1/W2 source filter (the Results tab lists every source). A result with no ToC link at all is returned as UNTAGGED rather than omitted.",
  })
  @ApiQuery({
    name: 'programId',
    type: String,
    required: true,
    description: 'Initiative official code to resolve the program (e.g. SP01).',
  })
  @ApiQuery({
    name: 'versionId',
    type: Number,
    required: true,
    description:
      'Phase/version identifier to resolve the ToC context for. Non-numeric values return 400.',
  })
  @ApiOkResponse({
    description: 'Results scope retrieved successfully.',
  })
  // @akili-spec changes/results-aow-column-filter (RAC-T-1)
  getResultsScope(
    @Query('programId') programId: string,
    @Query('versionId') versionId?: string,
  ) {
    const parsedVersion =
      versionId !== undefined && versionId !== null
        ? Number(versionId)
        : undefined;

    return this.resultsFrameworkReportingService.getResultsScope(
      programId,
      parsedVersion,
    );
  }

  @Get('toc-results')
  @ApiOperation({
    summary: 'List ToC results by program and area of work',
    description:
      'Retrieves the ToC result identifiers for the provided program and area of work combination. Intermediate outcomes/outputs without a defined work package (wp_id null) are included in every area of work of the science program.',
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
  @ApiQuery({
    name: 'versionId',
    type: Number,
    required: false,
    description:
      'Optional phase/version identifier. Wins over `year` when both are present; defaults to the active reporting phase when absent.',
  })
  @ApiOkResponse({
    description: 'Work packages retrieved successfully.',
  })
  getTocWorkPackages(
    @Query('program') program: string,
    @Query('areaOfWork') areaOfWork: string,
    @Query('year') year?: string,
    @Query('versionId') versionId?: string,
  ) {
    const parsedVersion =
      versionId !== undefined && versionId !== null
        ? Number(versionId)
        : undefined;

    return this.resultsFrameworkReportingService.getWorkPackagesByProgramAndArea(
      program,
      areaOfWork,
      year,
      parsedVersion,
    );
  }

  @Get('toc-results/intermediate-outcomes')
  @ApiOperation({
    summary: 'List intermediate ToC outcomes by program',
    description:
      'Retrieves TOC results (OUTPUT/OUTCOME category) with wp_id IS NULL — i.e. not assigned to any Area of Work — for the requested program in the active reporting phase.',
  })
  @ApiQuery({
    name: 'programId',
    type: String,
    required: true,
    description: 'Program identifier (e.g. SP01).',
  })
  @ApiQuery({
    name: 'versionId',
    type: Number,
    required: false,
    description:
      'Optional phase/version identifier. Defaults to the active reporting phase when absent.',
  })
  @ApiOkResponse({
    description: 'Intermediate outcomes retrieved successfully.',
  })
  getIntermediateOutcomes(
    @Query('programId') programId: string,
    @Query('versionId') versionId?: string,
  ) {
    const parsedVersion =
      versionId !== undefined && versionId !== null
        ? Number(versionId)
        : undefined;

    return this.resultsFrameworkReportingService.getIntermediateOutcomes(
      programId,
      parsedVersion,
    );
  }

  @Get('toc-results/program-progress')
  @ApiOperation({
    summary: 'Science Program ToC achievement (P2-3296 AC4)',
    description:
      "Rolls the ToC achievement up to the Science Program: each Area of Work is averaged over its HLOs, and the program is averaged over its Areas of Work. Indicators with no usable target (target absent or zero) are excluded from every average — 'counted' and 'total' report how many made it in, and the percentage is null when nothing was measurable, which the client must render as a dash rather than 0%. Distinct from 'get/science-programs/progress', which counts reported results by status.",
  })
  @ApiQuery({
    name: 'programId',
    type: String,
    required: true,
    description: 'Program identifier (e.g. SP01).',
  })
  @ApiQuery({
    name: 'versionId',
    type: Number,
    required: false,
    description:
      'Optional phase/version identifier. Defaults to the active reporting phase when absent.',
  })
  @ApiOkResponse({
    description: 'Science program ToC progress retrieved successfully.',
  })
  getScienceProgramTocProgress(
    @Query('programId') programId: string,
    @Query('versionId') versionId?: string,
  ) {
    const parsedVersion =
      versionId !== undefined && versionId !== null
        ? Number(versionId)
        : undefined;

    return this.resultsFrameworkReportingService.getScienceProgramTocProgress(
      programId,
      parsedVersion,
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
  @ApiQuery({
    name: 'versionId',
    type: Number,
    required: false,
    description:
      'Optional phase/version identifier. Defaults to the active reporting phase when absent.',
  })
  @ApiOkResponse({
    description: 'ToC 2030 outcomes retrieved successfully.',
  })
  getToc2030Outcomes(
    @Query('programId') programId: string,
    @Query('versionId') versionId?: string,
  ) {
    const parsedVersion =
      versionId !== undefined && versionId !== null
        ? Number(versionId)
        : undefined;

    return this.resultsFrameworkReportingService.getToc2030Outcomes(
      programId,
      parsedVersion,
    );
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
  @ApiQuery({
    name: 'versionId',
    type: Number,
    required: false,
    description:
      'Optional phase/version identifier. Defaults to the active reporting phase when absent.',
  })
  @ApiOkResponse({
    description:
      'Indicator contribution summary retrieved for the requested program.',
  })
  getProgramIndicatorContributionSummary(
    @Query('program') program: string,
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

    return this.resultsFrameworkReportingService.getProgramIndicatorContributionSummary(
      program,
      normalizedVersion,
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

  @Get('bilateral-projects/by-program')
  @ApiOperation({
    summary: 'List bilateral projects for a science program',
    description:
      'Returns all bilateral projects registered in the Project Registry for the given science program (official code) in the active reporting phase, without filtering by ToC result or indicator.',
  })
  @ApiQuery({
    name: 'programId',
    type: String,
    required: true,
    description: 'Science program official code (e.g. SP01).',
  })
  @ApiOkResponse({
    description: 'Bilateral projects retrieved successfully.',
  })
  getBilateralProjectsByProgram(@Query('programId') programId: string) {
    return this.resultsFrameworkReportingService.getBilateralProjectsByScienceProgram(
      programId,
    );
  }

  @Get('reporting-entry-hub/projects')
  @ApiOperation({
    summary: "List the caller's center bilateral projects for a program",
    description:
      "Resolves the caller's Center-level role assignments and returns, per center, the bilateral projects funding the given science program in the active reporting year.",
  })
  @ApiQuery({
    name: 'programId',
    type: String,
    required: true,
    description: 'Science program official code (e.g. SP02).',
  })
  @ApiOkResponse({
    description: 'Reporting entry hub projects retrieved successfully.',
    type: ReportingEntryHubProjectsDto,
  })
  getReportingEntryHubProjects(
    @UserToken() user: TokenDto,
    @Query('programId') programId: string,
  ) {
    return this.reportingEntryHubService.getMyCenterProjects(
      user.id,
      programId,
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
  // @akili-spec changes/indicator-reported-results (IRR-R-3, IRR-R-3.1)
  @ApiQuery({
    name: 'scope',
    enum: ['reviewed', 'all'],
    required: false,
    description:
      'Population scope: "reviewed" (default; Quality Assessed/Approved) or "all" (adds Editing, Submitted, Pending Review). Any other value is treated as "reviewed".',
  })
  @ApiOkResponse({
    description: 'Contributors and partners fetched successfully.',
  })
  getExistingResultContributorsAndPartners(
    @UserToken() user: TokenDto,
    @Query('resultTocResultId') resultTocResultId: number,
    @Query('tocResultIndicatorId') tocResultIndicatorId: string,
    // @akili-spec changes/indicator-reported-results
    @Query('scope') scope?: string,
  ) {
    return this.resultsFrameworkReportingService.getExistingResultContributorsToIndicators(
      user,
      resultTocResultId,
      tocResultIndicatorId,
      scope,
    );
  }

  @Get('dashboard')
  @ApiOperation({
    summary: 'Get dashboard statistics for a program',
    description:
      'Retrieves key statistics and metrics for the dashboard view of the specified program.',
  })
  @ApiQuery({
    name: 'programId',
    type: String,
    required: true,
    description: 'Program identifier to fetch dashboard statistics for.',
  })
  @ApiOkResponse({
    description: 'Dashboard statistics retrieved successfully.',
  })
  getDashboardStats(@Query('programId') programId: string) {
    return this.resultsFrameworkReportingService.getDashboardStats(programId);
  }
}
