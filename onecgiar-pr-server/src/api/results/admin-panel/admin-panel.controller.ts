import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseInterceptors,
  Patch,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiProduces,
  ApiAcceptedResponse,
} from '@nestjs/swagger';
import { AdminPanelService } from './admin-panel.service';
import { FilterInitiativesDto } from './dto/filter-initiatives.dto';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { FilterResultsDto } from './dto/filter-results.dto';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';
import { UserToken } from '../../../shared/decorators/user-token.decorator';
import { BulkKpDto } from './dto/bulk-kp.dto';
import { SkipThrottle } from '@nestjs/throttler';

@Controller()
@UseInterceptors(ResponseInterceptor)
@ApiTags('Admin Panel Reports')
export class AdminPanelController {
  constructor(private readonly adminPanelService: AdminPanelService) {}

  @Post('report/results/completeness')
  @ApiOperation({
    summary: 'Generate completeness report for results per initiative',
    description:
      'Returns aggregated completeness metrics (e.g., filled sections, missing data) based on provided initiative filters.',
  })
  @ApiBody({
    type: FilterInitiativesDto,
    description:
      'Filter object containing one or more initiative identifiers and optional phase/year constraints.',
  })
  @ApiOkResponse({ description: 'Completeness report generated successfully.' })
  reportResultCompleteness(@Body() filterIntiatives: FilterInitiativesDto) {
    return this.adminPanelService.reportResultCompleteness(filterIntiatives);
  }

  @SkipThrottle()
  @Post('report/results/excel-full-report')
  @ApiOperation({
    summary: 'Generate full Excel report by result codes',
    description:
      'Generates a full multi-sheet Excel file including metadata and linked entities for the specified result codes.',
  })
  @ApiBody({
    type: FilterResultsDto,
    description:
      'Filter containing result codes / initiative / phase to scope the Excel export.',
  })
  @ApiProduces(
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @ApiOkResponse({ description: 'Excel report (binary stream) generated.' })
  excelFullReportByResultCodes(@Body() filterResults: FilterResultsDto) {
    return this.adminPanelService.excelFullReportByResultCodes(filterResults);
  }

  @Get('report/results/excel-full-report/:initiativeId')
  @ApiOperation({
    summary: 'Generate full Excel report for an initiative',
    description:
      'Produces an Excel file consolidating all results for a given initiative and (optionally) a specific phase.',
  })
  @ApiParam({
    name: 'initiativeId',
    type: Number,
    description: 'Internal initiative identifier.',
  })
  @ApiQuery({
    name: 'phase',
    required: false,
    type: String,
    description:
      'Optional numeric phase identifier; if omitted, defaults to active phase.',
  })
  @ApiProduces(
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @ApiOkResponse({ description: 'Excel report (binary stream) generated.' })
  excelFullReportByResultByInitiative(
    @Param('initiativeId') initiativeId: number,
    @Query('phase') phase: string,
  ) {
    return this.adminPanelService.excelFullReportByResultByInitiative(
      initiativeId,
      +phase,
    );
  }

  @Get('report/results/:resultId/submissions')
  @ApiOperation({
    summary: 'Get submission log for a result',
    description:
      'Returns historical submission / QA trail for the specified result including timestamps and user references.',
  })
  @ApiParam({
    name: 'resultId',
    type: Number,
    description: 'Internal result identifier.',
  })
  @ApiOkResponse({ description: 'Submission log retrieved.' })
  submissionsByResults(@Param('resultId') resultId: number) {
    return this.adminPanelService.submissionsByResults(resultId);
  }

  @Get('report/users')
  @ApiOperation({
    summary: 'Get user activity / registry report',
    description:
      'Returns aggregated user dataset for administrative auditing and platform monitoring.',
  })
  @ApiOkResponse({ description: 'User report retrieved.' })
  userReport() {
    return this.adminPanelService.userReport();
  }

  @Patch('bulk/kps')
  @ApiOperation({
    summary: 'Bulk synchronize Knowledge Products',
    description:
      'Triggers synchronization (create/update) of multiple knowledge products, optionally filtered by status and phase.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    description: 'Optional status filter (e.g., editing | submitted | qa).',
  })
  @ApiQuery({
    name: 'phase',
    required: false,
    type: Number,
    description: 'Optional phase identifier to scope the sync operation.',
  })
  @ApiBody({
    type: BulkKpDto,
    description:
      'Payload containing the list / criteria of knowledge products to sync.',
  })
  @ApiAcceptedResponse({ description: 'Bulk KP sync accepted / completed.' })
  async kpBulkSync(
    @UserToken() token: TokenDto,
    @Query('status') status: string,
    @Query('phase') phases: number,
    @Body() bulkKpDto: BulkKpDto,
  ) {
    return await this.adminPanelService.kpBulkSync(
      token,
      status,
      phases,
      bulkKpDto,
    );
  }
}
