import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpException,
  UseInterceptors,
} from '@nestjs/common';
import { IpsrService } from './ipsr.service';
import { ResponseInterceptor } from '../../shared/Interceptors/Return-data.interceptor';

@Controller()
export class IpsrController {
  constructor(private readonly ipsrService: IpsrService) {}

  @Post('all-innovations')
  @UseInterceptors(ResponseInterceptor)
  findAll(@Body('initiativeId') initiativeId: number[]) {
    return this.ipsrService.findAllInnovations(initiativeId);
  }

  @Get('innovation/:resultId')
  async findOne(@Param('resultId') resultId: number) {
    const { message, response, status } =
      await this.ipsrService.findOneInnovation(resultId);

    throw new HttpException({ message, response }, status);
  }

  @Get('all-innovation-packages')
  async allInnovationPackages() {
    const { message, response, status } =
      await this.ipsrService.allInnovationPackages();

    throw new HttpException({ message, response }, status);
  }

  @Get('innovation-package-detail/:resultId')
  async findInnovationDetail(@Param('resultId') resultId: number) {
    const { message, response, status } =
      await this.ipsrService.findInnovationDetail(resultId);

    throw new HttpException({ message, response }, status);
  }

  @Get('get/list/date/:initDate/:lastDate')
  async getIpsrList(
    @Param('initDate') initDate: Date,
    @Param('lastDate') lastDate: Date,
  ) {
    const { message, response, status } = await this.ipsrService.getIpsrList(
      initDate,
      lastDate,
    );

    throw new HttpException({ message, response }, status);
  }
}
