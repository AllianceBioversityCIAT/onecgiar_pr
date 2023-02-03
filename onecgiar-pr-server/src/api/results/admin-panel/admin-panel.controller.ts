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
import { AdminPanelService } from './admin-panel.service';
import { CreateAdminPanelDto } from './dto/create-admin-panel.dto';
import { UpdateAdminPanelDto } from './dto/update-admin-panel.dto';
import { FilterInitiativesDto } from './dto/filter-initiatives.dto';
import { HeadersDto } from '../../../shared/globalInterfaces/headers.dto';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { FilterResultsDto } from './dto/filter-results.dto';

@Controller()
export class AdminPanelController {
  constructor(private readonly adminPanelService: AdminPanelService) {}

  @Post()
  create(@Body() createAdminPanelDto: CreateAdminPanelDto) {
    return this.adminPanelService.create(createAdminPanelDto);
  }

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

  @Get('bulk/kps')
  async kpBulkSync(@Headers() auth: HeadersDto) {
    const token: TokenDto = <TokenDto>(
      JSON.parse(Buffer.from(auth.auth.split('.')[1], 'base64').toString())
    );

    const { message, response, status } =
      await this.adminPanelService.kpBulkSync(token);

    throw new HttpException({ message, response }, status);
  }
}
