import { Controller, Get, Query } from '@nestjs/common';
import { ResultsFrameworkReportingService } from './results-framework-reporting.service';
import { ResultsService } from '../results/results.service';
import { ApiOperation, ApiQuery, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { UserToken } from '../../shared/decorators/user-token.decorator';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';
import { ScienceProgramProgressResponseDto } from '../results/dto/science-program-progress.dto';

@Controller('results-framework-reporting')
@ApiTags('Results Framework and Reporting')
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
  @ApiOkResponse({ description: 'Clarisa global units retrieved successfully.' })
  getClarisaGlobalUnits(
    @UserToken() user: TokenDto,
    @Query('programId') programId: string,
  ) {
    return this.resultsFrameworkReportingService.getGlobalUnitsByProgram(
      user,
      programId,
    );
  }
}
