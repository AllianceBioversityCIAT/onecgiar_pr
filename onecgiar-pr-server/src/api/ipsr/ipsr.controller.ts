import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseInterceptors,
  HttpException,
  Query,
} from '@nestjs/common';
import { IpsrService } from './ipsr.service';
import { ResponseInterceptor } from '../../shared/Interceptors/Return-data.interceptor';
import { ExcelReportDto } from './dto/excel-report-ipsr.dto';
import { UserToken } from '../../shared/decorators/user-token.decorator';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';
import { ApiQuery } from '@nestjs/swagger';

@Controller()
@UseInterceptors(ResponseInterceptor)
export class IpsrController {
  constructor(private readonly ipsrService: IpsrService) {}

  @Post('all-innovations')
  findAll(@Body('initiativeId') initiativeId: number[]) {
    return this.ipsrService.findAllInnovations(initiativeId);
  }

  @Get('innovation/:resultId')
  findOne(@Param('resultId') resultId: number) {
    return this.ipsrService.findOneInnovation(resultId);
  }

  @Get('all-innovation-packages')
  allInnovationPackages(@UserToken() user: TokenDto) {
    return this.ipsrService.allInnovationPackages(user);
  }

  @Get('all-innovation-packages/filter')
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
  allInnovationPackagesFiltered(
    @UserToken() user: TokenDto,
    @Query() query: Record<string, any>,
  ) {
    return this.ipsrService.allInnovationPackagesFiltered(user, query);
  }

  @Get('innovation-package-detail/:resultId')
  findInnovationDetail(@Param('resultId') resultId: number) {
    return this.ipsrService.findInnovationDetail(resultId);
  }

  @Post('get/excel-report')
  async getIpsrList(@Body() excelReportDto: ExcelReportDto) {
    const { message, response, status } =
      await this.ipsrService.getIpsrList(excelReportDto);

    throw new HttpException({ message, response }, status);
  }
}
