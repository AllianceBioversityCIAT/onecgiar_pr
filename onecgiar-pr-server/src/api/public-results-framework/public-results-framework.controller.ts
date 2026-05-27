import { Controller, Get, Query, UseInterceptors } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ResultsFrameworkReportingService } from '../results-framework-reporting/results-framework-reporting.service';
import { ResponseInterceptor } from '../../shared/Interceptors/Return-data.interceptor';

/**
 * Public (unauthenticated) read-only surface for the Results Framework.
 *
 * This controller is mounted under `/api/public-results-framework/*` and is
 * excluded from the `JwtMiddleware` in `app.module.ts`, mirroring the posture
 * of `/api/bilateral/*` and `/api/platform-report/*`. It exposes ONLY the
 * read `toc-results` endpoint for external system-to-system integration and
 * delegates to the existing `ResultsFrameworkReportingService` so the response
 * contract stays identical to the private endpoint.
 */
@Controller()
@ApiTags('Public Results Framework')
@UseInterceptors(ResponseInterceptor)
export class PublicResultsFrameworkController {
  constructor(
    private readonly resultsFrameworkReportingService: ResultsFrameworkReportingService,
  ) {}

  @Get('toc-results')
  @ApiOperation({
    summary: 'List ToC results by program and area of work (public)',
    description:
      'Unauthenticated copy of the ToC results endpoint. Returns the ToC result identifiers (outcomes/outputs) for the provided program and area of work combination, intended for external integrations. Same response contract as the private endpoint.',
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
}
