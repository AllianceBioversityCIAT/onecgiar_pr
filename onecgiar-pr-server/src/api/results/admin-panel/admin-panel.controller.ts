import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpException,
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
export class AdminPanelController {
  constructor(private readonly adminPanelService: AdminPanelService) {}

  @Post('report/results/completeness')
  async reportResultCompleteness(
    @Body() filterIntiatives: FilterInitiativesDto,
  ) {
    const { message, response, status } =
      await this.adminPanelService.reportResultCompleteness(filterIntiatives);
    throw new HttpException({ message, response }, status);
  }

  @Post('report/results/excel-full-report')
  async excelFullReportByResultCodes(@Body() filterResults: FilterResultsDto) {
    const { message, response, status } =
      await this.adminPanelService.excelFullReportByResultCodes(filterResults);
    throw new HttpException({ message, response }, status);
  }

  @Get('report/results/excel-full-report/:initiativeId')
  async excelFullReportByResultByInitiative(
    @Param('initiativeId') initiativeId: number,
  ) {
    const { message, response, status } =
      await this.adminPanelService.excelFullReportByResultByInitiative(
        initiativeId,
      );
    throw new HttpException({ message, response }, status);
  }

  @Get('report/results/:resultId/submissions')
  async submissionsByResults(@Param('resultId') resultId: number) {
    const { message, response, status } =
      await this.adminPanelService.submissionsByResults(resultId);
    throw new HttpException({ message, response }, status);
  }

  @Get('report/users')
  async userReport() {
    const { message, response, status } =
      await this.adminPanelService.userReport();
    throw new HttpException({ message, response }, status);
  }

  @Patch('bulk/kps')
  @UseInterceptors(ResponseInterceptor)
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
