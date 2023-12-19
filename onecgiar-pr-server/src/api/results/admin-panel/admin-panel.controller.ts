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
import { AdminPanelService } from './admin-panel.service';
import { FilterInitiativesDto } from './dto/filter-initiatives.dto';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { FilterResultsDto } from './dto/filter-results.dto';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';
import { UserToken } from '../../../shared/decorators/user-token.decorator';
import { BulkKpDto } from './dto/bulk-kp.dto';

@Controller()
@UseInterceptors(ResponseInterceptor)
export class AdminPanelController {
  constructor(private readonly adminPanelService: AdminPanelService) {}

  @Post('report/results/completeness')
  reportResultCompleteness(@Body() filterIntiatives: FilterInitiativesDto) {
    return this.adminPanelService.reportResultCompleteness(filterIntiatives);
  }

  @Post('report/results/excel-full-report')
  excelFullReportByResultCodes(@Body() filterResults: FilterResultsDto) {
    return this.adminPanelService.excelFullReportByResultCodes(filterResults);
  }

  @Get('report/results/excel-full-report/:initiativeId')
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
  submissionsByResults(@Param('resultId') resultId: number) {
    return this.adminPanelService.submissionsByResults(resultId);
  }

  @Get('report/users')
  userReport() {
    return this.adminPanelService.userReport();
  }

  @Patch('bulk/kps')
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
