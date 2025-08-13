import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseInterceptors,
  HttpException,
} from '@nestjs/common';
import { IpsrService } from './ipsr.service';
import { ResponseInterceptor } from '../../shared/Interceptors/Return-data.interceptor';
import { ExcelReportDto } from './dto/excel-report-ipsr.dto';
import { UserToken } from '../../shared/decorators/user-token.decorator';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';

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
  allInnovationPackages(
    @UserToken() user: TokenDto
  ) {
    return this.ipsrService.allInnovationPackages(user);
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
