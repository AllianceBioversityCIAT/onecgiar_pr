import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseInterceptors,
} from '@nestjs/common';
import { IpsrService } from './ipsr.service';
import { ResponseInterceptor } from '../../shared/Interceptors/Return-data.interceptor';

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
  allInnovationPackages() {
    return this.ipsrService.allInnovationPackages();
  }

  @Get('innovation-package-detail/:resultId')
  findInnovationDetail(@Param('resultId') resultId: number) {
    return this.ipsrService.findInnovationDetail(resultId);
  }
}
